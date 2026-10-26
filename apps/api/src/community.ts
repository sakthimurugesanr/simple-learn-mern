import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { emailSchema } from '@aurel/shared';
import { db, jobs, AppError } from './lib.js';
import { limit, verifyBot } from './middleware.js';
import { env } from './config.js';
export const community = Router();
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
community.post('/newsletter', limit('newsletter', 3, 900), async (req, res) => {
  const input = z
    .object({
      email: emailSchema,
      consent: z.literal(true),
      website: z.string().max(0).optional(),
      turnstileToken: z.string().max(4000).optional(),
    })
    .strict()
    .parse(req.body);
  await verifyBot(input.turnstileToken, req.ip);
  const existing = await db.newsletterSubscription.findUnique({ where: { email: input.email } });
  if (!existing?.confirmedAt) {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hash(token);
    await db.newsletterSubscription.upsert({
      where: { email: input.email },
      create: { email: input.email, tokenHash, expiresAt: new Date(Date.now() + 86400000) },
      update: { tokenHash, expiresAt: new Date(Date.now() + 86400000) },
    });
    await jobs.add(
      'email',
      {
        to: input.email,
        subject: 'A little hello from Aurel',
        text: `Confirm your newsletter subscription at ${env.WEB_URL}/newsletter?token=${token}. This link expires in 24 hours. No subscription is activated until you confirm.`,
      },
      { attempts: 3, removeOnComplete: 100, removeOnFail: 100 },
    );
  }
  res
    .status(202)
    .json({ data: { message: 'If eligible, a confirmation link is on its way to your inbox.' } });
});
community.post('/newsletter/confirm', limit('newsletter-confirm', 10, 900), async (req, res) => {
  const { token } = z
    .object({ token: z.string().min(32).max(100) })
    .strict()
    .parse(req.body);
  const result = await db.newsletterSubscription.updateMany({
    where: { tokenHash: hash(token), confirmedAt: null, expiresAt: { gt: new Date() } },
    data: { confirmedAt: new Date() },
  });
  if (result.count !== 1)
    throw new AppError(400, 'INVALID_LINK', 'This link has expired or has already been used');
  res.json({ data: { message: 'You’re on the list. Thank you for making yourself at home.' } });
});
community.post(
  '/newsletter/unsubscribe',
  limit('newsletter-unsubscribe', 10, 900),
  async (req, res) => {
    const { token } = z
      .object({ token: z.string().min(32).max(100) })
      .strict()
      .parse(req.body);
    await db.newsletterSubscription.deleteMany({ where: { tokenHash: hash(token) } });
    res.json({ data: { message: 'Your newsletter subscription has been removed.' } });
  },
);
