import { Worker, Queue } from 'bullmq';
import nodemailer from 'nodemailer';
import { env } from './config.js';
import { db, logger } from './lib.js';
const mail = nodemailer.createTransport(env.SMTP_URL);
const queue = new Queue('commerce', { connection: { url: env.REDIS_URL } });
await queue.upsertJobScheduler(
  'nightly-sales',
  { pattern: '0 1 * * *', tz: 'Asia/Kolkata' },
  { name: 'rollup', data: {} },
);
const worker = new Worker(
  'commerce',
  async (job) => {
    if (job.name === 'email') {
      await mail.sendMail({
        from: env.MAIL_FROM,
        to: job.data.to,
        subject: job.data.subject,
        text: job.data.text,
      });
    } else if (job.name === 'rollup') {
      await db.$executeRaw`INSERT INTO "DailySales" (day,revenue,orders,"updatedAt") SELECT ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date,SUM(total),COUNT(*)::int,NOW() FROM "Order" WHERE status NOT IN ('CANCELLED','RETURNED') GROUP BY 1 ON CONFLICT (day) DO UPDATE SET revenue=EXCLUDED.revenue,orders=EXCLUDED.orders,"updatedAt"=NOW()`;
    }
  },
  { connection: { url: env.REDIS_URL }, concurrency: 4 },
);
worker.on('failed', (_job, error) => logger.error({ err: error }, 'Background job failed'));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, async () => {
    await worker.close();
    await queue.close();
    await db.$disconnect();
    process.exit(0);
  });
