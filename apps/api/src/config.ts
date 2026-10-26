import { z } from 'zod';
export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().url(),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    JWT_SECRET: z.string().min(48),
    SMTP_URL: z.string().min(1),
    MAIL_FROM: z.string().default('Aurel <hello@localhost>'),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_PUBLIC_URL: z.string().url(),
    WHATSAPP_NUMBER: z.string().default(''),
    TURNSTILE_SECRET: z.string().default(''),
  })
  .parse(process.env);
if (
  env.NODE_ENV === 'production' &&
  (!env.WEB_URL.startsWith('https://') ||
    !env.TURNSTILE_SECRET ||
    env.JWT_SECRET.startsWith('replace-'))
)
  throw new Error('Production requires HTTPS, Turnstile and a unique signing secret');
