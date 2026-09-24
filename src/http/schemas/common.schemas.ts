import { z } from 'zod';
import { CPP_STANDARDS, DEFAULT_CPP_STANDARD } from '../../domain/cpp';

export const MAX_SOURCE_BYTES = 64 * 1024;
export const MAX_STDIN_BYTES = 64 * 1024;

const maxBytes = (limit: number, label: string) =>
  z.string().refine((value) => Buffer.byteLength(value, 'utf8') <= limit, {
    message: `${label} must not exceed ${limit} bytes`,
  });

export const sourceSchema = maxBytes(MAX_SOURCE_BYTES, 'Source').pipe(
  z.string().min(1, 'Source must not be empty'),
);

export const stdinSchema = maxBytes(MAX_STDIN_BYTES, 'Input');

export const standardSchema = z.enum(CPP_STANDARDS);

export const standardWithDefaultSchema = standardSchema.default(DEFAULT_CPP_STANDARD);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
