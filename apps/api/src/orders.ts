import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  checkoutSchema,
  calculateTotals,
  validStatusTransition,
  orderStatuses,
} from '@aurel/shared';
import { db, AppError, audit, jobs, invalidateCatalog } from './lib.js';
import { authenticate, requirePermission, limit, verifyBot } from './middleware.js';
import { paymentProviders } from './payments.js';
export const orders = Router();
orders.use(authenticate);
export async function placeOrder(userId: string, input: z.infer<typeof checkoutSchema>) {
  const previous = await db.order.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    include: { items: true, history: true },
  });
  if (previous) {
    if (previous.userId !== userId)
      throw new AppError(409, 'CONFLICT', 'Order request already used');
    return previous;
  }
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 'store' } });
  if (settings.maintenance)
    throw new AppError(503, 'MAINTENANCE', 'The store is temporarily closed');
  if (input.paymentMethod === 'WHATSAPP' && !/^\d{10,15}$/.test(settings.whatsappNumber))
    throw new AppError(
      503,
      'WHATSAPP_UNCONFIGURED',
      'WhatsApp ordering is not configured. Please choose COD.',
    );
  const quantities = new Map<string, number>();
  for (const item of input.items)
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  if ([...quantities.values()].some((q) => q > 20))
    throw new AppError(400, 'QUANTITY', 'Maximum 20 of each variant per order');
  try {
    return await db.$transaction(
      async (tx) => {
        // Serialize concurrent submissions of the same checkout key before touching stock.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey}, 0))`;
        const replay = await tx.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { items: true, history: true },
        });
        if (replay) {
          if (replay.userId !== userId)
            throw new AppError(409, 'CONFLICT', 'Order request already used');
          return replay;
        }
        const items = [];
        for (const [id, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
          const locked = await tx.$queryRaw<
            { id: string }[]
          >`SELECT id FROM "ProductVariant" WHERE id = ${id}::uuid FOR UPDATE`;
          if (!locked.length)
            throw new AppError(409, 'UNAVAILABLE', 'An item is no longer available');
          const v = await tx.productVariant.findUniqueOrThrow({
            where: { id },
            include: {
              product: {
                include: { images: { take: 1, orderBy: { sortOrder: 'asc' } }, category: true },
              },
            },
          });
          if (!v.active || v.product.status !== 'PUBLISHED' || v.product.deletedAt)
            throw new AppError(409, 'UNAVAILABLE', 'An item is no longer available');
          const decremented = await tx.productVariant.updateMany({
            where: { id, active: true, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          if (decremented.count !== 1)
            throw new AppError(409, 'OUT_OF_STOCK', `${v.product.name} has insufficient stock`);
          items.push({
            variantId: id,
            name: v.product.name,
            sku: v.sku,
            attributes: v.attributes as Prisma.InputJsonValue,
            quantity,
            price: v.price ?? v.product.price,
            image: v.product.images[0]?.url,
            supervisorId: v.product.createdById,
            categoryName: v.product.category.name,
          });
        }
        const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
        let discount = 0;
        let couponCode: string | undefined;
        if (input.coupon) {
          const offer = await tx.offer.findUnique({ where: { code: input.coupon.toUpperCase() } });
          if (
            !offer ||
            !offer.active ||
            offer.startsAt > new Date() ||
            offer.endsAt < new Date() ||
            subtotal < offer.minimum
          )
            throw new AppError(400, 'COUPON', 'This offer cannot be applied');
          discount = Math.round((subtotal * offer.percent) / 100);
          couponCode = offer.code;
        }
        const shipping =
          input.delivery === 'express'
            ? settings.expressShipping
            : subtotal >= settings.freeShippingThreshold
              ? 0
              : settings.shipping;
        const totals = calculateTotals(items, shipping, settings.taxBps, discount);
        if (Object.values(totals).some((value) => value > 2147483647))
          throw new AppError(
            400,
            'ORDER_LIMIT',
            'This order exceeds the supported total. Please contact the store.',
          );
        const order = await tx.order.create({
          data: {
            userId,
            idempotencyKey: input.idempotencyKey,
            address: input.address,
            delivery: input.delivery,
            paymentMethod: input.paymentMethod,
            ...totals,
            couponCode,
            items: { create: items },
            history: { create: { status: 'PLACED', actorId: userId, note: 'Order placed' } },
          },
          include: { items: true, history: true },
        });
        await tx.cartItem.deleteMany({ where: { cart: { userId } } });
        return order;
      },
      { isolationLevel: 'ReadCommitted', timeout: 15000 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const order = await db.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true, history: true },
      });
      if (order?.userId === userId) return order;
    }
    throw error;
  }
}
orders.post('/', limit('checkout', 8, 300), async (req, res) => {
  const input = checkoutSchema.parse(req.body);
  await verifyBot(input.turnstileToken, req.ip);
  const order = await placeOrder(req.auth!.id, input);
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 'store' } });
  const payment = await paymentProviders[order.paymentMethod].createPayment(
    order,
    settings.whatsappNumber,
  );
  await invalidateCatalog();
  await jobs.add(
    'email',
    {
      to: req.auth!.email,
      subject: `Order ${order.id.slice(0, 8)} placed`,
      text: `Your order total is INR ${(order.total / 100).toFixed(2)}. Track it at /account/orders/${order.id}.`,
    },
    { jobId: `order-${order.id}`, removeOnComplete: 100, removeOnFail: 100 },
  );
  res.status(201).json({ data: { ...order, payment } });
});
orders.get('/', async (req, res) => {
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  res.json({
    data: await db.order.findMany({
      where: { userId: req.auth!.id },
      include: { items: true, history: true },
      take: 20,
      skip: (page - 1) * 20,
      orderBy: { createdAt: 'desc' },
    }),
  });
});
orders.get('/manage', requirePermission('order:read'), async (req, res) => {
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  const status = z.enum(orderStatuses).optional().parse(req.query.status);
  const where = { status };
  const [data, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: true, history: true, user: { select: { id: true, name: true } } },
      skip: (page - 1) * 25,
      take: 25,
      orderBy: { createdAt: 'desc' },
    }),
    db.order.count({ where }),
  ]);
  res.json({ data, meta: { page, limit: 25, total } });
});
orders.get('/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const order = await db.order.findFirst({
    where: { id, userId: req.auth!.id },
    include: { items: true, history: { orderBy: { createdAt: 'asc' } } },
  });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  res.json({ data: order });
});
orders.post('/:id/whatsapp', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const order = await db.order.findFirst({
    where: { id, userId: req.auth!.id, paymentMethod: 'WHATSAPP' },
    include: { items: true },
  });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 'store' } });
  const payment = await paymentProviders.WHATSAPP.createPayment(order, settings.whatsappNumber);
  res.json({ data: payment });
});
orders.patch('/:id/status', requirePermission('order:update'), async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z
    .object({ status: z.enum(orderStatuses), note: z.string().max(1000).optional() })
    .strict()
    .parse(req.body);
  const order = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id}::uuid FOR UPDATE`;
    const before = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!before) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (!validStatusTransition(before.status, input.status))
      throw new AppError(409, 'STATUS_TRANSITION', 'This status change is not allowed');
    if (['CANCELLED', 'RETURNED'].includes(input.status)) {
      for (const i of before.items)
        await tx.productVariant.update({
          where: { id: i.variantId },
          data: { stock: { increment: i.quantity } },
        });
    }
    const order = await tx.order.update({
      where: { id },
      data: { status: input.status, history: { create: { ...input, actorId: req.auth!.id } } },
      include: { items: true, history: true },
    });
    await audit(
      tx,
      req,
      'order',
      'status',
      id,
      { status: before.status },
      { status: input.status },
    );
    return order;
  });
  await invalidateCatalog();
  res.json({ data: order });
});
