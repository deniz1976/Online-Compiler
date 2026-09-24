import { Router } from 'express';
import type { AppDependencies } from '../dependencies';
import { notFoundHandler } from '../middleware/error-handler';
import { createAuthRouter } from './auth.routes';
import { createExecutionRouter } from './execution.routes';
import { createHealthRouter } from './health.routes';
import { createSnippetRouter } from './snippet.routes';

export function createApiRouter(dependencies: AppDependencies): Router {
  const router = Router();

  router.use('/health', createHealthRouter(dependencies));
  router.use('/auth', createAuthRouter(dependencies));
  router.use('/snippets', createSnippetRouter(dependencies));
  router.use('/executions', createExecutionRouter(dependencies));
  router.use(notFoundHandler);

  return router;
}
