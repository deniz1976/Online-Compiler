import { Router } from 'express';
import type { AppDependencies } from '../dependencies';
import { authenticate, currentUserId } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rate-limit';
import { executionSchema } from '../schemas/execution.schemas';
import { parseBody } from '../validation';

const ONE_MINUTE_MS = 60 * 1000;

export function createExecutionRouter({
  config,
  executionService,
  tokenService,
}: AppDependencies): Router {
  const router = Router();

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
