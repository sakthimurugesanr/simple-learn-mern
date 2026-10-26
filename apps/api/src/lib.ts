import { PrismaClient, Prisma } from '@prisma/client';
import Redis from 'ioredis';
import pino from 'pino';
import { Queue } from 'bullmq';
import { env } from './config.js';
import type { Request } from 'express';
export const db = new PrismaClient();
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'password',
    'passwordHash',
    'address',
    'email',
    'phone',
    'token',
    'tokenHash',
    '*.password',
    '*.token',
  ],
});
export const jobs = new Queue('commerce', { connection: { url: env.REDIS_URL } });
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const publicUser = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  emailVerifiedAt: true,
  createdAt: true,
  permissions: { select: { permission: true, granted: true } },
} satisfies Prisma.UserSelect;
export async function audit(
  tx: Prisma.TransactionClient,
  req: Request,
  resource: string,
  action: string,
  resourceId: string,
  before?: unknown,
  after?: unknown,
) {
  await tx.auditLog.create({
    data: {
      actorId: req.auth!.id,
      resource,
      action,
      resourceId,
      ip: req.ip,
      before: before === undefined ? undefined : JSON.parse(JSON.stringify(before)),
      after: after === undefined ? undefined : JSON.parse(JSON.stringify(after)),
    },
  });
}
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const data = await fn();
  await redis.set(key, JSON.stringify(data), 'EX', ttl);
  return data;
}
export async function invalidateCatalog() {
  await redis.incr('catalog:version');
}
