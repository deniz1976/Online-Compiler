import { loadConfig, type AppConfig } from '../../src/config/config';

export const TEST_ENV = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  MONGODB_URI: 'mongodb://localhost:27017/online-compiler-test',
  JWT_SECRET: 'test-secret-that-is-definitely-long-enough',
} satisfies NodeJS.ProcessEnv;

export function createTestConfig(overrides: NodeJS.ProcessEnv = {}): AppConfig {
  return loadConfig({ ...TEST_ENV, ...overrides });
}
