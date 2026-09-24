import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './docs/openapi';
import type { AppDependencies } from './http/dependencies';
import { errorHandler } from './http/middleware/error-handler';
import { createApiRouter } from './http/routes/api.router';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const JSON_BODY_LIMIT = '256kb';
const HEALTH_PATH = '/api/health';

export function createApp(dependencies: AppDependencies): Express {
  const { config, logger } = dependencies;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === HEALTH_PATH } }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'cdnjs.cloudflare.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
          fontSrc: ["'self'", 'cdnjs.cloudflare.com', 'fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : false, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());

  app.use('/api', createApiRouter(dependencies));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(express.static(PUBLIC_DIR));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  app.use(errorHandler);

  return app;
}
