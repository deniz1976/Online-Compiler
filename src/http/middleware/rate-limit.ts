import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../../errors/app-error';

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter({ windowMs, limit, keyGenerator }: RateLimitOptions): RequestHandler {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
    ...(keyGenerator && { keyGenerator }),
  });
}
