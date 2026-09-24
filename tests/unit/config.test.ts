import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config/config';
import { TEST_ENV } from '../support/test-config';

describe('loadConfig', () => {
  it('applies defaults for optional settings', () => {
    const config = loadConfig(TEST_ENV);

    expect(config.port).toBe(3000);
    expect(config.corsOrigins).toEqual([]);
    expect(config.sandbox).toMatchObject({
      image: 'online-compiler-sandbox:gcc14',
      runtime: undefined,
      maxConcurrency: 4,
      runTimeoutMs: 3000,
    });
    expect(config.auth.secureCookies).toBe(false);
  });

  it('parses lists and numeric values', () => {
    const config = loadConfig({
      ...TEST_ENV,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://a.example, https://b.example ,',
      SANDBOX_RUNTIME: 'runsc',
      SANDBOX_CPUS: '0.5',
    });

    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.sandbox.runtime).toBe('runsc');
    expect(config.sandbox.cpus).toBe(0.5);
    expect(config.auth.secureCookies).toBe(true);
  });

  it('rejects missing or weak secrets', () => {
    expect(() => loadConfig({ ...TEST_ENV, JWT_SECRET: 'short' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...TEST_ENV, MONGODB_URI: undefined })).toThrow(/MONGODB_URI/);
  });
});
