import { Router, type Response, type Request } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { loginSchema, registerSchema, emailSchema, passwordSchema } from '@aurel/shared';
import { db, redis, jobs, AppError, publicUser, audit } from './lib.js';
import { env } from './config.js';
import { authenticate, limit, verifyBot } from './middleware.js';
export const auth = Router();
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 86400000,
};
async function issue(res: Response, req: Request, userId: string, familyId: string = randomUUID()) {
  const refresh = randomBytes(48).toString('base64url');
  const session = await db.session.create({
    data: {
      userId,
      familyId,
      tokenHash: hash(refresh),
      expiresAt: new Date(Date.now() + 30 * 86400000),
      userAgent: req.headers['user-agent']?.slice(0, 300),
      ip: req.ip,
    },
  });
  res.cookie('refresh', refresh, cookieOptions);
  return jwt.sign({ sid: session.id }, env.JWT_SECRET, {
    subject: userId,
    expiresIn: '15m',
    jwtid: randomUUID(),
    issuer: 'aurel-api',
    audience: 'aurel-web',
  });
}
async function sendToken(userId: string, email: string, purpose: 'verify' | 'reset') {
  const token = randomBytes(32).toString('base64url');
  await db.verificationToken.create({
    data: {
      userId,
      tokenHash: hash(token),
      purpose,
      expiresAt: new Date(Date.now() + (purpose === 'reset' ? 3600000 : 86400000)),
    },
  });
  await jobs.add(
    'email',
    {
      to: email,
      subject: purpose === 'reset' ? 'Reset your Aurel password' : 'Verify your Aurel email',
      text: `Open ${env.WEB_URL}/auth/${purpose === 'reset' ? 'reset-password' : 'verify-email'}?token=${token}`,
    },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );
}
auth.post('/register', limit('register', 5, 900), async (req, res) => {
  const input = registerSchema.parse(req.body);
  await verifyBot(input.turnstileToken, req.ip);
  if (await db.user.findUnique({ where: { email: input.email } })) {
    res
      .status(202)
      .json({ data: { message: 'If eligible, you will receive an email with next steps.' } });
    return;
  }
  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
      profile: { create: {} },
    },
  });
  await sendToken(user.id, user.email, 'verify');
  res
    .status(202)
    .json({ data: { message: 'If eligible, you will receive an email with next steps.' } });
});
auth.post('/login', limit('login', 10, 900), async (req, res) => {
  const input = loginSchema.parse(req.body);
  const key = `login-fail:${hash(input.email)}`;
  const failures = Number((await redis.get(key)) ?? 0);
  if (failures >= 5) await verifyBot(input.turnstileToken, req.ip);
  if (failures >= 10)
    throw new AppError(429, 'LOCKED', 'Unable to sign in. Please try again later.');
  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = user
    ? await argon2.verify(user.passwordHash, input.password)
    : await argon2.hash(input.password, { type: argon2.argon2id }).then(() => false);
  if (!valid || !user?.active) {
    await redis.multi().incr(key).expire(key, 900).exec();
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Unable to sign in with these credentials');
  }
  if (!user.emailVerifiedAt)
    throw new AppError(403, 'VERIFY_EMAIL', 'Please verify your email before signing in');
  await redis.del(key);
  res.json({
    data: {
      accessToken: await issue(res, req, user.id),
      user: await db.user.findUnique({ where: { id: user.id }, select: publicUser }),
    },
  });
});
auth.post('/refresh', limit('refresh', 30, 60), async (req, res) => {
  const token = req.cookies.refresh;
  if (typeof token !== 'string') throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in');
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active)
    throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in');
  if (session.revokedAt) {
    await db.session.updateMany({
      where: { familyId: session.familyId },
      data: { revokedAt: new Date() },
    });
    res.clearCookie('refresh', cookieOptions);
    throw new AppError(401, 'REUSE_DETECTED', 'Session ended. Please sign in again');
  }
  const claimed = await db.session.updateMany({
    where: { id: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (claimed.count !== 1) throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in again');
  res.json({
    data: {
      accessToken: await issue(res, req, session.userId, session.familyId),
      user: await db.user.findUnique({ where: { id: session.userId }, select: publicUser }),
    },
  });
});
auth.post('/logout', authenticate, async (req, res) => {
  await db.session.updateMany({
    where: { id: req.sessionId, userId: req.auth!.id },
    data: { revokedAt: new Date() },
  });
  await redis.set(`deny:${req.tokenId}`, '1', 'EX', 900);
  res.clearCookie('refresh', cookieOptions);
  res.json({ data: { ok: true } });
});
auth.post('/logout-all', authenticate, async (req, res) => {
  await db.session.updateMany({
    where: { userId: req.auth!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.clearCookie('refresh', cookieOptions);
  res.json({ data: { ok: true } });
});
auth.get('/me', authenticate, (req, res) => res.json({ data: req.auth }));
auth.get('/sessions', authenticate, async (req, res) =>
  res.json({
    data: await db.session.findMany({
      where: { userId: req.auth!.id, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, userAgent: true, ip: true },
      orderBy: { createdAt: 'desc' },
    }),
  }),
);
auth.post('/forgot-password', limit('forgot', 4, 900), async (req, res) => {
  const input = z
    .object({
      email: emailSchema,
      turnstileToken: z.string().optional(),
      website: z.string().max(0).optional(),
    })
    .strict()
    .parse(req.body);
  await verifyBot(input.turnstileToken, req.ip);
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (user?.active) await sendToken(user.id, user.email, 'reset');
  res.json({ data: { message: 'If eligible, you will receive an email with next steps.' } });
});
for (const purpose of ['verify', 'reset'] as const) {
  auth.post(
    purpose === 'reset' ? '/reset-password' : '/verify-email',
    limit(`token-${purpose}`, 10, 900),
    async (req, res) => {
      const input = z
        .object({
          token: z.string().min(32).max(100),
          password: purpose === 'reset' ? passwordSchema : z.string().optional(),
        })
        .strict()
        .parse(req.body);
      const token = await db.verificationToken.findUnique({
        where: { tokenHash: hash(input.token) },
      });
      if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt < new Date())
        throw new AppError(400, 'INVALID_LINK', 'This link is invalid or has expired');
      const passwordHash =
        purpose === 'reset'
          ? await argon2.hash(input.password!, { type: argon2.argon2id })
          : undefined;
      await db.$transaction(async (tx) => {
        const claimed = await tx.verificationToken.updateMany({
          where: { id: token.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        if (claimed.count !== 1)
          throw new AppError(400, 'INVALID_LINK', 'This link has already been used');
        await tx.user.update({
          where: { id: token.userId },
          data: purpose === 'verify' ? { emailVerifiedAt: new Date() } : { passwordHash },
        });
        if (purpose === 'reset') {
          await tx.session.updateMany({
            where: { userId: token.userId },
            data: { revokedAt: new Date() },
          });
        }
      });
      res.json({ data: { ok: true } });
    },
  );
}
auth.post('/change-password', authenticate, async (req, res) => {
  const input = z
    .object({ current: z.string(), password: passwordSchema })
    .strict()
    .parse(req.body);
  const user = await db.user.findUniqueOrThrow({ where: { id: req.auth!.id } });
  if (!(await argon2.verify(user.passwordHash, input.current)))
    throw new AppError(400, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }) },
    });
    await tx.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await audit(tx, req, 'user', 'change-password', user.id);
  });
  res.json({ data: { ok: true } });
});
