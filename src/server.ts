import { existsSync } from 'node:fs';
import type { Server } from 'node:http';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config/config';
import { createLogger, type Logger } from './config/logger';
import { createContainer } from './container';
import { connectToDatabase, disconnectFromDatabase } from './infrastructure/database/mongo';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }

  const config = loadConfig();
  const logger = createLogger(config);

  await connectToDatabase(config.mongoUri);
  logger.info('Connected to MongoDB');

  const { sandbox, dependencies } = createContainer(config, logger);
  await sandbox.prepare();
  logger.info({ image: config.sandbox.image, runtime: config.sandbox.runtime ?? 'default' }, 'Sandbox ready');

  const server = createApp(dependencies).listen(config.port, () => {
    logger.info({ port: config.port }, 'Server listening');
  });

  registerShutdown(server, logger);
}

function registerShutdown(server: Server, logger: Logger): void {
  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, 'Shutting down');
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    server.close(() => {
      disconnectFromDatabase()
        .then(() => process.exit(0))
        .catch((error: unknown) => {
          logger.error({ err: error }, 'Failed to close database connection');
          process.exit(1);
        });
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

main().catch((error: unknown) => {
  const message =
    error instanceof ConfigError
      ? error.message
      : error instanceof Error
        ? (error.stack ?? error.message)
        : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
