import { Router } from 'express';
import { z } from 'zod';
import { addressSchema } from '@aurel/shared';
import { db, AppError } from './lib.js';
import { authenticate } from './middleware.js';
import { productInclude } from './catalog.js';
export const account = Router();
account.use(authenticate);
account.get('/profile', async (req, res) =>
  res.json({
    data: await db.user.findUnique({
      where: { id: req.auth!.id },
      select: { id: true, name: true, email: true, profile: true, addresses: true },
    }),
  }),
);
account.patch('/profile', async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2).max(100),
      phone: z
        .string()
        .regex(/^[6-9]\d{9}$/)
        .optional(),
    })
    .strict()
    .parse(req.body);
  res.json({
    data: await db.user.update({
      where: { id: req.auth!.id },
      data: {
        name: input.name,
        profile: { upsert: { create: { phone: input.phone }, update: { phone: input.phone } } },
      },
      select: { id: true, name: true, email: true },
    }),
  });
});
account.get('/addresses', async (req, res) =>
  res.json({ data: await db.address.findMany({ where: { userId: req.auth!.id } }) }),
);
account.post('/addresses', async (req, res) =>
  res.status(201).json({
    data: await db.address.create({
      data: { ...addressSchema.parse(req.body), userId: req.auth!.id },
    }),
  }),
);
account.delete('/addresses/:id', async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const result = await db.address.deleteMany({ where: { id, userId: req.auth!.id } });
  if (!result.count) throw new AppError(404, 'NOT_FOUND', 'Address not found');
  res.json({ data: { ok: true } });
});
account.get('/wishlist', async (req, res) =>
  res.json({
    data: await db.wishlistItem.findMany({
      where: {
        wishlist: { userId: req.auth!.id },
        product: { status: 'PUBLISHED', deletedAt: null },
      },
      include: { product: { include: productInclude } },
    }),
  }),
);
account.put('/wishlist/:productId', async (req, res) => {
  const productId = z.string().uuid().parse(req.params.productId);
  const product = await db.product.findFirst({
    where: { id: productId, status: 'PUBLISHED', deletedAt: null },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  const wishlist = await db.wishlist.upsert({
    where: { userId: req.auth!.id },
    create: { userId: req.auth!.id },
    update: {},
  });
  await db.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
  res.json({ data: { ok: true } });
});
account.delete('/wishlist/:productId', async (req, res) => {
  const productId = z.string().uuid().parse(req.params.productId);
  await db.wishlistItem.deleteMany({ where: { productId, wishlist: { userId: req.auth!.id } } });
  res.json({ data: { ok: true } });
});
account.get('/cart', async (req, res) =>
  res.json({
    data: await db.cartItem.findMany({
      where: { cart: { userId: req.auth!.id } },
      include: { variant: { include: { product: { include: productInclude } } } },
    }),
  }),
);
account.put('/cart', async (req, res) => {
  const items = z
    .array(
      z
        .object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })
        .strict(),
    )
    .max(50)
    .parse(req.body);
  if (new Set(items.map((i) => i.variantId)).size !== items.length)
    throw new AppError(400, 'DUPLICATES', 'Duplicate variants');
  const cart = await db.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId: req.auth!.id },
      create: { userId: req.auth!.id },
      update: {},
    });
    const variants = await tx.productVariant.findMany({
      where: {
        id: { in: items.map((i) => i.variantId) },
        active: true,
        product: { status: 'PUBLISHED', deletedAt: null },
      },
    });
    if (items.some((i) => !variants.some((v) => v.id === i.variantId && v.stock >= i.quantity)))
      throw new AppError(409, 'STOCK', 'Some items are no longer available');
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cartItem.createMany({ data: items.map((i) => ({ ...i, cartId: cart.id })) });
    return cart;
  });
  res.json({ data: cart });
});
