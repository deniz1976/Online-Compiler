import { Router } from 'express';
import type { AppDependencies } from '../dependencies';
import { authenticate, currentUserId } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rate-limit';
import { CPP_STANDARDS, DEFAULT_CPP_STANDARD } from '../../domain/cpp';
import { MAX_SOURCE_BYTES, MAX_STDIN_BYTES } from '../schemas/common.schemas';
import { executionSchema } from '../schemas/execution.schemas';
import { parseBody } from '../validation';

const ONE_MINUTE_MS = 60 * 1000;

export function createExecutionRouter({
  config,
  executionService,
  tokenService,
}: AppDependencies): Router {
  const router = Router();
  const limits = {
    standards: CPP_STANDARDS,
    defaultStandard: DEFAULT_CPP_STANDARD,
    compileTimeoutMs: config.sandbox.compileTimeoutMs,
    runTimeoutMs: config.sandbox.runTimeoutMs,
    memoryMb: config.sandbox.memoryMb,
    maxOutputBytes: config.sandbox.maxOutputBytes,
    maxSourceBytes: MAX_SOURCE_BYTES,
    maxStdinBytes: MAX_STDIN_BYTES,
  };

  router.get('/limits', (_req, res) => {
    res.status(200).json({ data: { limits } });
  });

  router.post(
    '/',
    authenticate(tokenService),
    createRateLimiter({
      windowMs: ONE_MINUTE_MS,
      limit: config.rateLimits.executionsPerMinute,
      keyGenerator: currentUserId,
    }),
    async (req, res) => {
      const result = await executionService.execute(parseBody(executionSchema, req.body));
      res.status(200).json({ data: { result } });
    },
  );

  return router;
}
