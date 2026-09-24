import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import type { AppConfig } from '../../src/config/config';
import { createLogger } from '../../src/config/logger';
import { ConcurrencyLimiter } from '../../src/lib/concurrency-limiter';
import { AuthService } from '../../src/services/auth.service';
import { ExecutionService } from '../../src/services/execution.service';
import { Argon2PasswordHasher } from '../../src/services/password-hasher';
import { SnippetService } from '../../src/services/snippet.service';
import { JwtTokenService } from '../../src/services/token.service';
import { FakeCodeRunner } from './fake-code-runner';
import { InMemorySnippetRepository } from './in-memory-snippet.repository';
import { InMemoryUserRepository } from './in-memory-user.repository';
import { createTestConfig } from './test-config';

export interface TestApp {
  app: Express;
  config: AppConfig;
  runner: FakeCodeRunner;
  database: { healthy: boolean };
}

export function createTestApp(overrides: NodeJS.ProcessEnv = {}): TestApp {
  const config = createTestConfig(overrides);
  const logger = createLogger(config);
  const tokenService = new JwtTokenService(config.auth.jwtSecret, config.auth.tokenTtlSeconds);
  const runner = new FakeCodeRunner();
  const database = { healthy: true };

  const app = createApp({
    config,
    logger,
    tokenService,
    authService: new AuthService(new InMemoryUserRepository(), new Argon2PasswordHasher(), tokenService),
    snippetService: new SnippetService(new InMemorySnippetRepository()),
    executionService: new ExecutionService(
      runner,
      new ConcurrencyLimiter(config.sandbox.maxConcurrency, config.sandbox.maxQueue),
    ),
    isDatabaseHealthy: () => database.healthy,
  });

  return { app, config, runner, database };
}

export interface RegisteredUser {
  id: string;
  token: string;
  cookie: string;
}

let userCounter = 0;

export async function registerAndLogin(app: Express, username?: string): Promise<RegisteredUser> {
  userCounter += 1;
  const name = username ?? `user${userCounter}`;
  const credentials = { email: `${name}@example.com`, password: 'correct-horse-battery' };

  await request(app)
    .post('/api/auth/register')
    .send({ username: name, ...credentials })
    .expect(201);

  const response = await request(app).post('/api/auth/login').send(credentials).expect(200);
  const setCookie = response.get('set-cookie') ?? [];

  return {
    id: response.body.data.user.id,
    token: response.body.data.token,
    cookie: setCookie[0]?.split(';')[0] ?? '',
  };
}
