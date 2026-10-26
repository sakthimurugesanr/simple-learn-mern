import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from './config.js';
import { logger, db, redis, AppError } from './lib.js';
import { originCheck, limit } from './middleware.js';
import { auth } from './auth.js';
import { catalog } from './catalog.js';
import { account } from './account.js';
import { orders } from './orders.js';
import { admin } from './admin.js';
import { uploads } from './uploads.js';
import { community } from './community.js';
export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);
app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    serializers: {
      req: (r) => ({ id: r.id, method: r.method, url: r.url?.split('?')[0] }),
      res: (r) => ({ statusCode: r.statusCode }),
    },
  }),
);
app.use(
  helmet(),
  cors({
    origin: env.WEB_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
  compression(),
  express.json({ limit: '128kb' }),
  cookieParser(),
  hpp(),
  originCheck,
);
app.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));
app.get('/ready', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  await redis.ping();
  res.json({ data: { status: 'ready' } });
});
app.use('/api/v1', limit('global', 240));
app.use('/api/v1/community', community);
app.use('/api/v1/auth', auth);
app.use('/api/v1/catalog', catalog);
app.use('/api/v1/account', account);
app.use('/api/v1/orders', orders);
app.use('/api/v1/admin', admin);
app.use('/api/v1/uploads', uploads);
app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Endpoint not found')));
app.use(
  (error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION',
          message: 'Please check your input',
          issues: error.flatten(),
          requestId: req.id,
        },
      });
      return;
    }
    if (error instanceof AppError) {
      res
        .status(error.status)
        .json({ error: { code: error.code, message: error.message, requestId: req.id } });
      return;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2003', 'P2025'].includes(error.code)
    ) {
      res.status(error.code === 'P2025' ? 404 : 409).json({
        error: {
          code: 'CONFLICT',
          message: 'Record is missing or conflicts with existing data',
          requestId: req.id,
        },
      });
      return;
    }
    logger.error({ err: error, requestId: req.id }, 'Request failed');
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong. Please try again.',
        requestId: req.id,
      },
    });
  },
);
