import { Router } from 'express';
import { z } from 'zod';
import { permissions, roles } from '@aurel/shared';
import { db, cached, audit, AppError, publicUser, invalidateCatalog } from './lib.js';
import { authenticate, adminOnly, limit } from './middleware.js';
export const admin = Router();
admin.use(authenticate, adminOnly, limit('admin', 120));
admin.get('/analytics', async (req, res) => {
  const query = z
    .object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() })
    .strict()
    .parse(req.query);
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 86400000);
  if (to <= from || to.getTime() - from.getTime() > 366 * 86400000)
    throw new AppError(400, 'RANGE', 'Choose a range of 1 to 366 days');
  const data = await cached(
    `analytics:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`,
    30,
    async () => {
      const where = {
        createdAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'RETURNED'] as ('CANCELLED' | 'RETURNED')[] },
      };
      const [
        aggregate,
        previous,
        newUsers,
        returns,
        series,
        topProducts,
        categorySales,
        paymentSplit,
        statusFunnel,
        topCities,
        lowStock,
        supervisorSales,
      ] = await Promise.all([
        db.order.aggregate({ where, _sum: { total: true }, _count: true }),
        db.order.aggregate({
          where: {
            ...where,
            createdAt: {
              gte: new Date(from.getTime() - (to.getTime() - from.getTime())),
              lt: from,
            },
          },
          _sum: { total: true },
          _count: true,
        }),
        db.user.count({ where: { createdAt: { gte: from, lte: to }, role: 'USER' } }),
        db.order.count({ where: { status: 'RETURNED', createdAt: { gte: from, lte: to } } }),
        db.$queryRaw<
          { date: string; revenue: number; orders: number }[]
        >`SELECT to_char(date_trunc('day', "createdAt" AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS date, SUM(total)::float8 AS revenue, COUNT(*)::int AS orders FROM "Order" WHERE "createdAt" >= ${from} AND "createdAt" <= ${to} AND status NOT IN ('CANCELLED','RETURNED') GROUP BY 1 ORDER BY 1`,
        db.$queryRaw`SELECT i.name, SUM(i.quantity)::int AS quantity, SUM(i.price*i.quantity)::float8 AS revenue FROM "OrderItem" i JOIN "Order" o ON o.id=i."orderId" WHERE o."createdAt">=${from} AND o."createdAt"<=${to} AND o.status NOT IN ('CANCELLED','RETURNED') GROUP BY i.name ORDER BY quantity DESC LIMIT 10`,
        db.$queryRaw`SELECT i."categoryName" AS name, SUM(i.price*i.quantity)::float8 AS value FROM "OrderItem" i JOIN "Order" o ON o.id=i."orderId" WHERE o."createdAt">=${from} AND o."createdAt"<=${to} AND o.status NOT IN ('CANCELLED','RETURNED') GROUP BY 1 ORDER BY value DESC`,
        db.order.groupBy({ by: ['paymentMethod'], where, _count: true, _sum: { total: true } }),
        db.order.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from, lte: to } },
          _count: true,
        }),
        db.$queryRaw`SELECT address->>'city' AS name, COUNT(*)::int AS orders FROM "Order" WHERE "createdAt">=${from} AND "createdAt"<=${to} GROUP BY 1 ORDER BY orders DESC LIMIT 10`,
        db.productVariant.findMany({
          where: {
            stock: { lte: 5 },
            active: true,
            product: { status: 'PUBLISHED', deletedAt: null },
          },
          take: 20,
          include: { product: { select: { name: true, slug: true } } },
          orderBy: { stock: 'asc' },
        }),
        db.$queryRaw`SELECT u.name, SUM(i.price*i.quantity)::float8 AS revenue FROM "OrderItem" i JOIN "Order" o ON o.id=i."orderId" JOIN "User" u ON u.id=i."supervisorId" WHERE o."createdAt">=${from} AND o."createdAt"<=${to} AND o.status NOT IN ('CANCELLED','RETURNED') GROUP BY u.id,u.name ORDER BY revenue DESC`,
      ]);
      return {
        revenue: aggregate._sum.total ?? 0,
        orders: aggregate._count,
        aov: aggregate._count ? Math.round((aggregate._sum.total ?? 0) / aggregate._count) : 0,
        newUsers,
        returns,
        previous: { revenue: previous._sum.total ?? 0, orders: previous._count },
        series,
        topProducts,
        categorySales,
        paymentSplit,
        statusFunnel,
        topCities,
        lowStock,
        supervisorSales,
      };
    },
  );
  res.json({ data });
});
admin.get('/users', async (req, res) => {
  const input = z
    .object({
      q: z.string().max(100).default(''),
      role: z.enum(roles).optional(),
      page: z.coerce.number().int().min(1).default(1),
    })
    .strict()
    .parse(req.query);
  const where = {
    deletedAt: null,
    role: input.role,
    OR: [
      { name: { contains: input.q, mode: 'insensitive' as const } },
      { email: { contains: input.q, mode: 'insensitive' as const } },
    ],
  };
  const [data, total] = await Promise.all([
    db.user.findMany({
      where,
      select: publicUser,
      take: 25,
      skip: (input.page - 1) * 25,
      orderBy: { createdAt: 'desc' },
    }),
    db.user.count({ where }),
  ]);
  res.json({ data, meta: { total, page: input.page, limit: 25 } });
});
admin.get('/users/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const user = await db.user.findUnique({
    where: { id },
    select: {
      ...publicUser,
      profile: true,
      addresses: true,
      products: { take: 50, orderBy: { createdAt: 'desc' } },
      orders: { take: 25, orderBy: { createdAt: 'desc' } },
      auditLogs: { take: 100, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  res.json({ data: user });
});
admin.patch('/users/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z
    .object({ active: z.boolean().optional(), role: z.enum(roles).optional() })
    .strict()
    .parse(req.body);
  if (id === req.auth!.id)
    throw new AppError(409, 'SELF_CHANGE', 'You cannot change your own role or account status');
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id }, select: publicUser });
    await tx.user.update({ where: { id }, data: input });
    await tx.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    await audit(tx, req, 'user', 'update', id, before, input);
  });
  res.json({ data: { ok: true } });
});
admin.put('/users/:id/permissions', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const input = z
    .array(
      z
        .object({
          permission: z.string().refine((v) => permissions.includes(v)),
          granted: z.boolean(),
        })
        .strict(),
    )
    .max(100)
    .refine((v) => new Set(v.map((x) => x.permission)).size === v.length)
    .parse(req.body);
  if (id === req.auth!.id)
    throw new AppError(409, 'SELF_CHANGE', 'Cannot change your own permissions');
  await db.$transaction(async (tx) => {
    const before = await tx.userPermission.findMany({ where: { userId: id } });
    await tx.userPermission.deleteMany({ where: { userId: id } });
    await tx.userPermission.createMany({ data: input.map((p) => ({ ...p, userId: id })) });
    await audit(tx, req, 'user', 'permissions', id, before, input);
  });
  res.json({ data: { ok: true } });
});
admin.get('/audit', async (req, res) => {
  const page = z.coerce.number().int().min(1).default(1).parse(req.query.page);
  const actorId = z.string().uuid().optional().parse(req.query.actorId);
  res.json({
    data: await db.auditLog.findMany({
      where: { actorId },
      include: { actor: { select: { name: true, email: true } } },
      take: 50,
      skip: (page - 1) * 50,
      orderBy: { createdAt: 'desc' },
    }),
  });
});
admin.get('/layout', async (req, res) =>
  res.json({ data: await db.dashboardLayout.findUnique({ where: { userId: req.auth!.id } }) }),
);
admin.put('/layout', async (req, res) => {
  const layout = z
    .array(
      z
        .object({
          i: z.string().max(50),
          x: z.number().int().min(0).max(11),
          y: z.number().int().min(0).max(1000),
          w: z.number().int().min(1).max(12),
          h: z.number().int().min(1).max(30),
        })
        .strict(),
    )
    .max(30)
    .parse(req.body);
  res.json({
    data: await db.dashboardLayout.upsert({
      where: { userId: req.auth!.id },
      create: { userId: req.auth!.id, layout },
      update: { layout },
    }),
  });
});
admin.put('/settings', async (req, res) => {
  const input = z
    .object({
      brandName: z.string().min(1).max(60),
      whatsappNumber: z
        .string()
        .regex(/^\d{10,15}$/)
        .or(z.literal('')),
      shipping: z.number().int().min(0),
      expressShipping: z.number().int().min(0),
      freeShippingThreshold: z.number().int().min(0),
      taxBps: z.number().int().min(0).max(10000),
      seoDescription: z.string().max(160),
      maintenance: z.boolean(),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = await tx.settings.findUnique({ where: { id: 'store' } });
    const result = await tx.settings.upsert({
      where: { id: 'store' },
      create: { id: 'store', ...input },
      update: input,
    });
    await audit(tx, req, 'settings', 'update', 'store', before, result);
    return result;
  });
  await invalidateCatalog();
  res.json({ data: result });
});
const bannerSchema = z
  .object({
    title: z.string().min(1).max(150),
    subtitle: z.string().max(300),
    image: z.string().url(),
    href: z
      .string()
      .regex(/^\/(?!\/)/)
      .max(300),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(100),
  })
  .strict();
const testimonialSchema = z
  .object({
    name: z.string().min(2).max(100),
    quote: z.string().min(10).max(1000),
    location: z.string().max(100),
    rating: z.number().int().min(1).max(5),
    active: z.boolean(),
  })
  .strict();
admin.get('/testimonials', async (_req, res) =>
  res.json({ data: await db.testimonial.findMany({ orderBy: { createdAt: 'desc' } }) }),
);
admin.post('/testimonials', async (req, res) => {
  const data = testimonialSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const result = await tx.testimonial.create({ data });
    await audit(tx, req, 'testimonial', 'create', result.id, undefined, result);
    return result;
  });
  await invalidateCatalog();
  res.status(201).json({ data: result });
});
admin.put('/testimonials/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = testimonialSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = await tx.testimonial.findUniqueOrThrow({ where: { id } });
    const result = await tx.testimonial.update({ where: { id }, data });
    await audit(tx, req, 'testimonial', 'update', id, before, result);
    return result;
  });
  await invalidateCatalog();
  res.json({ data: result });
});
const offerSchema = z
  .object({
    code: z
      .string()
      .regex(/^[A-Z0-9_-]+$/)
      .max(40),
    title: z.string().max(150),
    percent: z.number().int().min(1).max(90),
    minimum: z.number().int().min(0),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    active: z.boolean(),
  })
  .strict()
  .refine((v) => v.endsAt > v.startsAt, 'End must follow start');
admin.get('/banners', async (_req, res) =>
  res.json({ data: await db.banner.findMany({ orderBy: { sortOrder: 'asc' } }) }),
);
admin.post('/banners', async (req, res) => {
  const data = bannerSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const result = await tx.banner.create({ data });
    await audit(tx, req, 'banner', 'create', result.id, undefined, result);
    return result;
  });
  await invalidateCatalog();
  res.status(201).json({ data: result });
});
admin.put('/banners/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = bannerSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = await tx.banner.findUniqueOrThrow({ where: { id } });
    const result = await tx.banner.update({ where: { id }, data });
    await audit(tx, req, 'banner', 'update', id, before, result);
    return result;
  });
  await invalidateCatalog();
  res.json({ data: result });
});
admin.get('/offers', async (_req, res) =>
  res.json({ data: await db.offer.findMany({ orderBy: { createdAt: 'desc' } }) }),
);
admin.post('/offers', async (req, res) => {
  const data = offerSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const result = await tx.offer.create({ data });
    await audit(tx, req, 'offer', 'create', result.id, undefined, result);
    return result;
  });
  await invalidateCatalog();
  res.status(201).json({ data: result });
});
admin.put('/offers/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const data = offerSchema.parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const before = await tx.offer.findUniqueOrThrow({ where: { id } });
    const result = await tx.offer.update({ where: { id }, data });
    await audit(tx, req, 'offer', 'update', id, before, result);
    return result;
  });
  await invalidateCatalog();
  res.json({ data: result });
});
admin.get('/collections', async (_req, res) =>
  res.json({ data: await db.collection.findMany({ include: { products: true } }) }),
);
admin.put('/collections/:slug', async (req, res) => {
  const slug = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .parse(req.params.slug);
  const input = z
    .object({ name: z.string().min(2).max(100), productIds: z.array(z.string().uuid()).max(100) })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const collection = await tx.collection.upsert({
      where: { slug },
      create: { slug, name: input.name },
      update: { name: input.name },
    });
    await tx.collectionProduct.deleteMany({ where: { collectionId: collection.id } });
    await tx.collectionProduct.createMany({
      data: input.productIds.map((productId) => ({ productId, collectionId: collection.id })),
      skipDuplicates: true,
    });
    await audit(tx, req, 'collection', 'update', collection.id, undefined, input);
    return collection;
  });
  await invalidateCatalog();
  res.json({ data: result });
});
// Serialize export values as data, and neutralize spreadsheet formula injection.
export function csvCell(value: unknown) {
  const str = String(value ?? '');
  return `"${(/^[=+@\-\t\r]/.test(str) ? "'" : '') + str.replaceAll('"', '""')}"`;
}
admin.get('/export/orders', async (_req, res) => {
  const data = await db.order.findMany({
    take: 10000,
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, total: true, paymentMethod: true, createdAt: true },
  });
  res
    .type('text/csv')
    .attachment('orders.csv')
    .send(
      [
        'id,status,total_paise,payment_method,created_at',
        ...data.map((x) =>
          [x.id, x.status, x.total, x.paymentMethod, x.createdAt.toISOString()]
            .map(csvCell)
            .join(','),
        ),
      ].join('\r\n'),
    );
});
