import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import sanitize from 'sanitize-html';
import { buildAttributeSchema, productSchema, attributeDefinitionSchema, can } from '@aurel/shared';
import { db, redis, cached, AppError, audit, invalidateCatalog } from './lib.js';
import { authenticate, requirePermission, limit, adminOnly } from './middleware.js';
export const catalog = Router();
export const productInclude = {
  category: { include: { definitions: { orderBy: { sortOrder: 'asc' as const } } } },
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { active: true } },
};
const pagination = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
    q: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    sort: z.enum(['newest', 'price-asc', 'price-desc', 'name']).default('newest'),
    min: z.coerce.number().int().min(0).optional(),
    max: z.coerce.number().int().min(0).optional(),
    attributes: z.string().max(3000).optional(),
    collection: z.string().optional(),
  })
  .strict();
catalog.get('/products', limit('search', 80), async (req, res) => {
  const input = pagination.parse(req.query);
  const version = (await redis.get('catalog:version')) ?? '0';
  const data = await cached(`catalog:${version}:${JSON.stringify(input)}`, 45, async () => {
    let attrs: Record<string, unknown> = {};
    if (input.attributes) {
      try {
        attrs = z
          .record(z.string(), z.union([z.string().max(100), z.number(), z.boolean()]))
          .parse(JSON.parse(input.attributes));
      } catch {
        throw new AppError(400, 'INVALID_FILTER', 'Invalid attribute filters');
      }
    }
    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      name: input.q ? { contains: input.q, mode: 'insensitive' } : undefined,
      category: input.category ? { slug: input.category } : undefined,
      price: { gte: input.min, lte: input.max },
      collections: input.collection
        ? { some: { collection: { slug: input.collection } } }
        : undefined,
      AND: Object.entries(attrs).map(([key, value]) => ({
        attributes: { path: [key], equals: value as Prisma.InputJsonValue },
      })),
    };
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: productInclude,
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        orderBy:
          input.sort === 'price-asc'
            ? { price: 'asc' }
            : input.sort === 'price-desc'
              ? { price: 'desc' }
              : input.sort === 'name'
                ? { name: 'asc' }
                : { createdAt: 'desc' },
      }),
      db.product.count({ where }),
    ]);
    return { data: products, meta: { total, page: input.page, limit: input.limit } };
  });
  res.json(data);
});
catalog.get('/products/:slug', async (req, res) => {
  const slug = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(220)
    .parse(req.params.slug);
  const product = await db.product.findFirst({
    where: { slug, status: 'PUBLISHED', deletedAt: null },
    include: productInclude,
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  res.json({ data: product });
});
catalog.get('/categories', async (_req, res) =>
  res.json({
    data: await cached('categories', 60, () =>
      db.category.findMany({
        include: {
          definitions: { orderBy: { sortOrder: 'asc' } },
          children: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ),
  }),
);
catalog.get('/home', async (_req, res) =>
  res.json({
    data: await cached(`home:${(await redis.get('catalog:version')) ?? 0}`, 60, async () => ({
      testimonials: await db.testimonial.findMany({
        where: { active: true },
        take: 12,
        orderBy: { createdAt: 'desc' },
      }),
      banners: await db.banner.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      collections: await db.collection.findMany({
        include: {
          products: {
            where: { product: { status: 'PUBLISHED', deletedAt: null } },
            take: 8,
            include: { product: { include: productInclude } },
          },
        },
      }),
      offers: await db.offer.findMany({
        where: { active: true, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
      }),
      settings: await db.settings.findUnique({ where: { id: 'store' } }),
    })),
  }),
);
catalog.get('/settings', async (_req, res) => {
  const settings = await db.settings.findUniqueOrThrow({ where: { id: 'store' } });
  res.json({ data: settings });
});
catalog.get(
  '/manage/products',
  authenticate,
  requirePermission('product:read'),
  async (req, res) => {
    const { page, limit } = pagination.parse(req.query);
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(req.auth!.role !== 'ADMIN' &&
      !can(req.auth!.role, req.auth!.overrides, 'product:update:any')
        ? { createdById: req.auth!.id }
        : {}),
    };
    const [data, total] = await Promise.all([
      db.product.findMany({
        where,
        include: productInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.product.count({ where }),
    ]);
    res.json({ data, meta: { page, limit, total } });
  },
);
catalog.post(
  '/manage/products',
  authenticate,
  requirePermission('product:create'),
  async (req, res) => {
    const input = productSchema.parse(req.body);
    const category = await db.category.findUnique({
      where: { id: input.categoryId },
      include: { definitions: true },
    });
    if (!category) throw new AppError(400, 'CATEGORY', 'Select an available category');
    const attributes = buildAttributeSchema(
      category.definitions.map((d) => attributeDefinitionSchema.parse(d)),
    ).parse(input.attributes);
    const { variants, images, ...fields } = input;
    const product = await db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...fields,
          description: sanitize(fields.description, {
            allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
            allowedAttributes: {},
          }),
          attributes: attributes as Prisma.InputJsonValue,
          createdById: req.auth!.id,
          variants: { create: variants.map((v) => ({ ...v, images: [] })) },
          images: { create: images.map((image, i) => ({ ...image, sortOrder: i })) },
        },
        include: productInclude,
      });
      await audit(tx, req, 'product', 'create', product.id, undefined, product);
      return product;
    });
    await invalidateCatalog();
    res.status(201).json({ data: product });
  },
);
catalog.put(
  '/manage/products/:id',
  authenticate,
  requirePermission('product:update'),
  async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = productSchema.parse(req.body);
    const product = await db.product.findUnique({ where: { id } });
    if (!product || product.deletedAt) throw new AppError(404, 'NOT_FOUND', 'Product not found');
    if (
      product.createdById !== req.auth!.id &&
      !can(req.auth!.role, req.auth!.overrides, 'product:update:any')
    )
      throw new AppError(403, 'FORBIDDEN', 'You can edit only your own uploads');
    const defs = await db.attributeDefinition.findMany({ where: { categoryId: input.categoryId } });
    const attributes = buildAttributeSchema(
      defs.map((d) => attributeDefinitionSchema.parse(d)),
    ).parse(input.attributes);
    const { variants, images, ...fields } = input;
    const result = await db.$transaction(async (tx) => {
      await tx.productVariant.updateMany({ where: { productId: id }, data: { active: false } });
      for (const v of variants) {
        const existing = await tx.productVariant.findUnique({ where: { sku: v.sku } });
        if (existing && existing.productId !== id)
          throw new AppError(409, 'SKU', 'SKU belongs to another product');
        await tx.productVariant.upsert({
          where: { sku: v.sku },
          create: { ...v, productId: id, images: [] },
          update: { ...v, active: true },
        });
      }
      await tx.productImage.deleteMany({ where: { productId: id } });
      const result = await tx.product.update({
        where: { id },
        data: {
          ...fields,
          description: sanitize(fields.description),
          attributes: attributes as Prisma.InputJsonValue,
          images: { create: images.map((i, sortOrder) => ({ ...i, sortOrder })) },
        },
        include: productInclude,
      });
      await audit(tx, req, 'product', 'update', id, product, result);
      return result;
    });
    await invalidateCatalog();
    res.json({ data: result });
  },
);
catalog.delete(
  '/manage/products/:id',
  authenticate,
  requirePermission('product:delete'),
  async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
      if (
        product.createdById !== req.auth!.id &&
        !can(req.auth!.role, req.auth!.overrides, 'product:delete:any')
      )
        throw new AppError(403, 'FORBIDDEN', 'You can delete only your own uploads');
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'ARCHIVED' },
      });
      await audit(tx, req, 'product', 'delete', id, product);
    });
    await invalidateCatalog();
    res.json({ data: { ok: true } });
  },
);
catalog.post('/manage/categories', authenticate, adminOnly, async (req, res) => {
  const input = z
    .object({
      name: z.string().min(2).max(100),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      parentId: z.string().uuid().nullable().optional(),
      image: z.string().url().optional(),
    })
    .strict()
    .parse(req.body);
  const result = await db.$transaction(async (tx) => {
    const result = await tx.category.create({ data: input });
    await audit(tx, req, 'category', 'create', result.id, undefined, result);
    return result;
  });
  await redis.del('categories');
  res.status(201).json({ data: result });
});
catalog.put('/manage/categories/:id/attributes', authenticate, adminOnly, async (req, res) => {
  const categoryId = z.string().uuid().parse(req.params.id);
  const definitions = z
    .array(attributeDefinitionSchema)
    .max(50)
    .refine((v) => new Set(v.map((d) => d.key)).size === v.length, 'Keys must be unique')
    .parse(req.body);
  buildAttributeSchema(definitions);
  await db.$transaction(async (tx) => {
    const existing = await tx.attributeDefinition.findMany({ where: { categoryId } });
    const products = await tx.product.findMany({
      where: { categoryId, deletedAt: null },
      select: { attributes: true },
    });
    const schema = buildAttributeSchema(definitions);
    if (products.some((p) => !schema.safeParse(p.attributes).success))
      throw new AppError(
        409,
        'ATTRIBUTE_MIGRATION',
        'Existing products do not match these definitions. Update products before removing fields or adding required fields.',
      );
    await tx.attributeDefinition.deleteMany({ where: { categoryId } });
    await tx.attributeDefinition.createMany({
      data: definitions.map((d) => ({ ...d, categoryId })),
    });
    await audit(tx, req, 'attribute', 'update', categoryId, existing, definitions);
  });
  await redis.del('categories');
  await invalidateCatalog();
  res.json({ data: { ok: true } });
});
