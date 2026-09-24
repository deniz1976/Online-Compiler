import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const commaSeparatedList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const positiveInt = (defaultValue: number) => z.coerce.number().int().positive().default(defaultValue);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  CORS_ORIGINS: commaSeparatedList,

  MONGODB_URI: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN_SECONDS: positiveInt(86400),

  SANDBOX_IMAGE: z.string().min(1).default('online-compiler-sandbox:gcc14'),
  SANDBOX_RUNTIME: optionalString,
  SANDBOX_MAX_CONCURRENCY: positiveInt(4),
  SANDBOX_MAX_QUEUE: z.coerce.number().int().min(0).default(32),
  SANDBOX_COMPILE_TIMEOUT_MS: positiveInt(10000),
  SANDBOX_RUN_TIMEOUT_MS: positiveInt(3000),
  SANDBOX_MEMORY_MB: positiveInt(512),
  SANDBOX_CPUS: z.coerce.number().positive().default(1),
  SANDBOX_PIDS_LIMIT: positiveInt(64),
  SANDBOX_MAX_OUTPUT_BYTES: positiveInt(65536),

  RATE_LIMIT_AUTH_PER_15_MIN: positiveInt(20),
  RATE_LIMIT_EXECUTIONS_PER_MIN: positiveInt(20),
});

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface SandboxConfig {
  image: string;
  runtime: string | undefined;
  maxConcurrency: number;
  maxQueue: number;
  compileTimeoutMs: number;
  runTimeoutMs: number;
  memoryMb: number;
  cpus: number;
  pidsLimit: number;
  maxOutputBytes: number;
}

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  logLevel: LogLevel;
  trustProxy: number;
  corsOrigins: string[];
  mongoUri: string;
  auth: {
    jwtSecret: string;
    tokenTtlSeconds: number;
    secureCookies: boolean;
  };
  sandbox: SandboxConfig;
  rateLimits: {
    authPer15Minutes: number;
    executionsPerMinute: number;
  };
}

export class ConfigError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }

  const env = result.data;

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY,
    corsOrigins: env.CORS_ORIGINS,
    mongoUri: env.MONGODB_URI,
    auth: {
      jwtSecret: env.JWT_SECRET,
      tokenTtlSeconds: env.JWT_EXPIRES_IN_SECONDS,
      secureCookies: env.NODE_ENV === 'production',
    },
    sandbox: {
      image: env.SANDBOX_IMAGE,
      runtime: env.SANDBOX_RUNTIME,
      maxConcurrency: env.SANDBOX_MAX_CONCURRENCY,
      maxQueue: env.SANDBOX_MAX_QUEUE,
      compileTimeoutMs: env.SANDBOX_COMPILE_TIMEOUT_MS,
      runTimeoutMs: env.SANDBOX_RUN_TIMEOUT_MS,
      memoryMb: env.SANDBOX_MEMORY_MB,
      cpus: env.SANDBOX_CPUS,
      pidsLimit: env.SANDBOX_PIDS_LIMIT,
      maxOutputBytes: env.SANDBOX_MAX_OUTPUT_BYTES,
    },
    rateLimits: {
      authPer15Minutes: env.RATE_LIMIT_AUTH_PER_15_MIN,
      executionsPerMinute: env.RATE_LIMIT_EXECUTIONS_PER_MIN,
    },
  };
}
