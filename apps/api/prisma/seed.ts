import { PrismaClient, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { permissions, roleDefaults } from '@aurel/shared';
import {
  demoProducts,
  dressCategoryId,
  electronicsCategoryId,
  dressDefinitions,
  electronicsDefinitions,
  imageUrl,
} from '../../../packages/shared/src/demo';
const db = new PrismaClient();
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12)
  throw new Error('Set SEED_PASSWORD to a strong, unique password (12+ characters)');
try {
  for (const key of permissions)
    await db.permission.upsert({ where: { key }, create: { key }, update: {} });
  for (const [role, defaults] of Object.entries(roleDefaults))
    for (const permission of defaults)
      await db.rolePermission.upsert({
        where: { role_permission: { role: role as 'ADMIN' | 'SUPERVISOR' | 'USER', permission } },
        create: { role: role as 'ADMIN' | 'SUPERVISOR' | 'USER', permission },
        update: {},
      });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const users = [];
  for (const role of ['ADMIN', 'SUPERVISOR', 'USER'] as const)
    users.push(
      await db.user.upsert({
        where: { email: `${role.toLowerCase()}@aurel.local` },
        create: {
          email: `${role.toLowerCase()}@aurel.local`,
          name:
            role === 'ADMIN' ? 'Sakthi' : role === 'SUPERVISOR' ? 'Studio Team' : 'Aurel Customer',
          role,
          passwordHash,
          emailVerifiedAt: new Date(),
          profile: { create: {} },
        },
        update: {},
      }),
    );
  // The supervisor intentionally starts with only product:read.
  for (const category of [
    { id: dressCategoryId, name: 'Dresses', slug: 'dresses', definitions: dressDefinitions },
    {
      id: electronicsCategoryId,
      name: 'Electronics',
      slug: 'electronics',
      definitions: electronicsDefinitions,
    },
  ]) {
    const { definitions, ...data } = category;
    await db.category.upsert({
      where: { id: data.id },
      create: { ...data, image: imageUrl('photo-1515372039744-b8f02a3ae446') },
      update: {},
    });
    for (const definition of definitions)
      await db.attributeDefinition.upsert({
        where: { categoryId_key: { categoryId: data.id, key: definition.key } },
        create: { ...definition, categoryId: data.id },
        update: {},
      });
  }
  for (const product of demoProducts) {
    const {
      id,
      name,
      slug,
      description,
      categoryId,
      price,
      compareAtPrice,
      attributes,
      variants,
      images,
    } = product;
    await db.product.upsert({
      where: { id },
      create: {
        id,
        name,
        slug,
        description,
        categoryId,
        createdById: users[1].id,
        price,
        compareAtPrice,
        attributes: attributes as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        variants: { create: variants.map((v) => ({ ...v, attributes: v.attributes, images: [] })) },
        images: { create: images },
      },
      update: {},
    });
  }
  for (const [i, name] of ['New arrivals', 'New launches', 'Best sellers'].entries()) {
    const slug = name.replaceAll(' ', '-').toLowerCase();
    const collection = await db.collection.upsert({
      where: { slug },
      create: { name, slug },
      update: {},
    });
    for (const p of demoProducts.slice(i * 4, i * 4 + 8))
      await db.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId: collection.id, productId: p.id } },
        create: { collectionId: collection.id, productId: p.id },
        update: {},
      });
  }
  if (!(await db.banner.count()))
    await db.banner.create({
      data: {
        title: 'Less ordinary.\nMore you.',
        subtitle:
          'Thoughtful pieces for whatever your day becomes. Discover a new kind of everyday.',
        image: imageUrl('photo-1496747611176-843222e1e57c', 1800),
        href: '/shop',
        active: true,
      },
    });
  await db.offer.upsert({
    where: { code: 'HELLO10' },
    create: {
      code: 'HELLO10',
      title: 'A little welcome, on us.',
      percent: 10,
      minimum: 149900,
      endsAt: new Date('2027-12-31'),
    },
    update: {},
  });
  await db.settings.upsert({
    where: { id: 'store' },
    create: { id: 'store', whatsappNumber: process.env.WHATSAPP_NUMBER ?? '' },
    update: {},
  });
  console.log(
    'Seed complete: 3 accounts, 2 domains, 32 products. Password is the supplied SEED_PASSWORD.',
  );
} finally {
  await db.$disconnect();
}
