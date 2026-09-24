import type { AppConfig } from './config/config';
import type { Logger } from './config/logger';
import type { AppDependencies } from './http/dependencies';
import { isDatabaseConnected } from './infrastructure/database/mongo';
import { SpawnCommandRunner } from './infrastructure/process/command-runner';
import { MongoSnippetRepository } from './infrastructure/repositories/mongo-snippet.repository';
import { MongoUserRepository } from './infrastructure/repositories/mongo-user.repository';
import { DockerSandbox } from './infrastructure/sandbox/docker-sandbox';
import { ConcurrencyLimiter } from './lib/concurrency-limiter';
import { AuthService } from './services/auth.service';
import { ExecutionService } from './services/execution.service';
import { Argon2PasswordHasher } from './services/password-hasher';
import { SnippetService } from './services/snippet.service';
import { JwtTokenService } from './services/token.service';

export interface Container {
  sandbox: DockerSandbox;
  dependencies: AppDependencies;
}

export function createContainer(config: AppConfig, logger: Logger): Container {
  const tokenService = new JwtTokenService(config.auth.jwtSecret, config.auth.tokenTtlSeconds);
  const sandbox = new DockerSandbox(
    new SpawnCommandRunner(),
    config.sandbox,
    logger.child({ component: 'sandbox' }),
  );
  const limiter = new ConcurrencyLimiter(config.sandbox.maxConcurrency, config.sandbox.maxQueue);

  return {
    sandbox,
    dependencies: {
      config,
      logger,
      tokenService,
      authService: new AuthService(new MongoUserRepository(), new Argon2PasswordHasher(), tokenService),
      snippetService: new SnippetService(new MongoSnippetRepository()),
      executionService: new ExecutionService(sandbox, limiter),
      isDatabaseHealthy: isDatabaseConnected,
    },
  };
}
