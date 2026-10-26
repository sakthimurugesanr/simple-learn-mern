import { app } from './app.js';
import { db, redis, jobs, logger } from './lib.js';
import { env } from './config.js';
await db.$connect();
await redis.ping();
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    server.close(async () => {
      await jobs.close();
      await redis.quit();
      await db.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
