import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
// Run against a migrated, disposable test database with RUN_INTEGRATION=1.
const enabled = process.env.RUN_INTEGRATION === '1';
describe.skipIf(!enabled)('API boundaries and concurrent inventory', () => {
  let app: any, db: any, redis: any, jobs: any, placeOrder: any;
  let user: any, category: any, product: any;
  async function signedSession(userId: string) {
    const raw = randomBytes(48).toString('base64url');
    const session = await db.session.create({
      data: {
        userId,
        familyId: randomUUID(),
        tokenHash: createHash('sha256').update(raw).digest('hex'),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    const token = jwt.sign({ sid: session.id }, process.env.JWT_SECRET!, {
      subject: userId,
      expiresIn: '15m',
      jwtid: randomUUID(),
      issuer: 'aurel-api',
      audience: 'aurel-web',
    });
    return { session, token, raw };
  }
  beforeAll(async () => {
    ({ app } = await import('../src/app'));
    ({ db, redis, jobs } = await import('../src/lib'));
    ({ placeOrder } = await import('../src/orders'));
    user = await db.user.create({
      data: {
        email: `test-${crypto.randomUUID()}@example.test`,
        name: 'Test buyer',
        passwordHash: 'not-a-login-hash',
        emailVerifiedAt: new Date(),
      },
    });
    category = await db.category.create({
      data: { name: 'Race test', slug: `race-${crypto.randomUUID()}` },
    });
    product = await db.product.create({
      data: {
        name: 'Last piece',
        slug: `last-${crypto.randomUUID()}`,
        description: 'Race test',
        categoryId: category.id,
        createdById: user.id,
        price: 10000,
        status: 'PUBLISHED',
        attributes: {},
        variants: {
          create: { sku: `race-${crypto.randomUUID()}`, stock: 1, images: [], attributes: {} },
        },
      },
      include: { variants: true },
    });
    await db.settings.upsert({
      where: { id: 'store' },
      create: { id: 'store' },
      update: { maintenance: false },
    });
  });
  afterAll(async () => {
    if (!db) return;
    await db.orderItem.deleteMany({ where: { order: { userId: user.id } } });
    await db.order.deleteMany({ where: { userId: user.id } });
    await db.productVariant.deleteMany({ where: { productId: product.id } });
    await db.product.delete({ where: { id: product.id } });
    await db.category.delete({ where: { id: category.id } });
    await db.user.delete({ where: { id: user.id } });
    await jobs.close();
    await redis.quit();
    await db.$disconnect();
  });
  it('rejects unauthenticated private routes', async () => {
    for (const path of ['/api/v1/admin/users', '/api/v1/account/addresses', '/api/v1/orders']) {
      const r = await request(app).get(path);
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
  it('rejects untrusted origins', async () => {
    const r = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'https://evil.test')
      .send({});
    expect(r.status).toBe(403);
  });
  it('does not turn customer accounts into administrators', async () => {
    const { token } = await signedSession(user.id);
    const r = await request(app).get('/api/v1/admin/users').auth(token, { type: 'bearer' });
    expect(r.status).toBe(403);
  });
  it('does not expose another account’s addresses or orders by ID', async () => {
    const other = await db.user.create({
      data: {
        email: `other-${randomUUID()}@example.test`,
        name: 'Other account',
        passwordHash: 'unused',
      },
    });
    try {
      const address = await db.address.create({
        data: {
          userId: other.id,
          name: 'Other Customer',
          phone: '9876543210',
          line1: '456 Other Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
        },
      });
      const { token } = await signedSession(user.id);
      const r = await request(app)
        .delete(`/api/v1/account/addresses/${address.id}`)
        .set('Origin', process.env.WEB_URL!)
        .auth(token, { type: 'bearer' });
      expect(r.status).toBe(404);
      expect(await db.address.findUnique({ where: { id: address.id } })).not.toBeNull();
      const order = await request(app)
        .get(`/api/v1/orders/${randomUUID()}`)
        .auth(token, { type: 'bearer' });
      expect(order.status).toBe(404);
    } finally {
      await db.user.delete({ where: { id: other.id } });
    }
  });
  it('revokes the whole session family when a rotated token is reused', async () => {
    const { session, raw } = await signedSession(user.id);
    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', process.env.WEB_URL!)
      .set('Cookie', `refresh=${raw}`)
      .send({});
    expect(first.status).toBe(200);
    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', process.env.WEB_URL!)
      .set('Cookie', `refresh=${raw}`)
      .send({});
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('REUSE_DETECTED');
    const active = await db.session.count({
      where: { familyId: session.familyId, revokedAt: null },
    });
    expect(active).toBe(0);
    const denied = await request(app)
      .get('/api/v1/auth/me')
      .auth(first.body.data.accessToken, { type: 'bearer' });
    expect(denied.status).toBe(401);
  });
  it('returns Retry-After when a strict limiter is exhausted', async () => {
    let last: any;
    for (let i = 0; i < 5; i++)
      last = await request(app)
        .post('/api/v1/auth/forgot-password')
        .set('Origin', process.env.WEB_URL!)
        .send({ email: 'missing@example.test' });
    expect(last.status).toBe(429);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('sells the final piece only once under concurrent orders', async () => {
    const input = {
      address: {
        name: 'Test Buyer',
        phone: '9876543210',
        line1: '123 Test Street',
        line2: '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
      },
      delivery: 'standard',
      paymentMethod: 'COD',
      items: [{ variantId: product.variants[0].id, quantity: 1 }],
    };
    const results = await Promise.allSettled([
      placeOrder(user.id, { ...input, idempotencyKey: crypto.randomUUID() }),
      placeOrder(user.id, { ...input, idempotencyKey: crypto.randomUUID() }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      (await db.productVariant.findUnique({ where: { id: product.variants[0].id } })).stock,
    ).toBe(0);
    const winning = results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>;
    const retry = await placeOrder(user.id, {
      ...input,
      idempotencyKey: winning.value.idempotencyKey,
    });
    expect(retry.id).toBe(winning.value.id);
  });
  it('returns the same order for simultaneous identical checkout keys', async () => {
    const variant = await db.productVariant.create({
      data: {
        productId: product.id,
        sku: `idempotent-${randomUUID()}`,
        stock: 1,
        attributes: {},
        images: [],
      },
    });
    const input = {
      address: {
        name: 'Test Buyer',
        phone: '9876543210',
        line1: '123 Test Street',
        line2: '',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
      },
      delivery: 'standard',
      paymentMethod: 'COD',
      items: [{ variantId: variant.id, quantity: 1 }],
      idempotencyKey: randomUUID(),
    };
    const [first, second] = await Promise.all([
      placeOrder(user.id, input),
      placeOrder(user.id, input),
    ]);
    expect(first.id).toBe(second.id);
    expect((await db.productVariant.findUnique({ where: { id: variant.id } })).stock).toBe(0);
  });
});
