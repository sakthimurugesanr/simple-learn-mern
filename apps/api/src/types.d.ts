import type { AuthUser } from '@aurel/shared';
declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      sessionId?: string;
      tokenId?: string;
    }
  }
}
export {};
