import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { can } from '@aurel/shared';
import { db, redis, AppError, publicUser } from './lib.js';
import { env } from './config.js';
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in');
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'aurel-api',
      audience: 'aurel-web',
    }) as jwt.JwtPayload;
    if (!payload.sub || !payload.sid || !payload.jti || (await redis.exists(`deny:${payload.jti}`)))
      throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in again');
    const [user, session] = await Promise.all([
      db.user.findUnique({ where: { id: payload.sub }, select: publicUser }),
      db.session.findUnique({ where: { id: payload.sid } }),
    ]);
    if (
      !user?.active ||
      !session ||
      session.userId !== user.id ||
      session.revokedAt ||
      session.expiresAt < new Date()
    )
      throw new AppError(401, 'SESSION_EXPIRED', 'Please sign in again');
    req.auth = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      overrides: user.permissions,
    };
    req.sessionId = session.id;
    req.tokenId = payload.jti;
    next();
  } catch (e) {
    next(e instanceof AppError ? e : new AppError(401, 'INVALID_TOKEN', 'Please sign in again'));
  }
};
export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth || !can(req.auth.role, req.auth.overrides, permission))
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission'));
    next();
  };
}
export const adminOnly: RequestHandler = (req, _res, next) => {
  if (req.auth?.role !== 'ADMIN')
    return next(new AppError(403, 'FORBIDDEN', 'Administrator access required'));
  next();
};
export function limit(name: string, points: number, duration = 60): RequestHandler {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `limit:${name}`,
    points,
    duration,
    blockDuration: duration,
  });
  return async (req, res, next) => {
    try {
      await limiter.consume(`${req.ip}:${req.auth?.id ?? 'guest'}`);
      next();
    } catch (e) {
      if (e instanceof Error)
        return next(new AppError(503, 'UNAVAILABLE', 'Please try again shortly'));
      const seconds = Math.ceil((e as { msBeforeNext: number }).msBeforeNext / 1000);
      res.setHeader('Retry-After', seconds);
      next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again shortly.'));
    }
  };
}
export const originCheck: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.headers.origin !== env.WEB_URL)
    return next(new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed'));
  next();
};
export async function verifyBot(token: string | undefined, ip?: string) {
  if (!env.TURNSTILE_SECRET && env.NODE_ENV !== 'production') return;
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({
      secret: env.TURNSTILE_SECRET,
      response: token ?? '',
      remoteip: ip ?? '',
    }),
    signal: AbortSignal.timeout(5000),
  });
  const result = (await r.json()) as { success: boolean };
  if (!result.success) throw new AppError(400, 'BOT_CHECK', 'Please complete the security check');
}
