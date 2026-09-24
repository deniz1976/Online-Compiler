import pino from 'pino';
import type { Logger } from 'pino';
import type { AppConfig } from './config';

export type { Logger };

export function createLogger(config: Pick<AppConfig, 'env' | 'logLevel'>): Logger {
  return pino({
    level: config.logLevel,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      remove: true,
    },
    ...(config.env === 'development' && {
      transport: { target: 'pino-pretty', options: { singleLine: true } },
    }),
  });
}
