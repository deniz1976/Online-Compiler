import { Router } from 'express';
import type { AppDependencies } from '../dependencies';

export function createHealthRouter({ isDatabaseHealthy }: AppDependencies): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const databaseUp = isDatabaseHealthy();

    res.status(databaseUp ? 200 : 503).json({
      data: {
        status: databaseUp ? 'ok' : 'degraded',
        database: databaseUp ? 'up' : 'down',
      },
    });
  });

  return router;
}
