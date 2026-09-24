import { z } from 'zod';
import { emailSchema } from './common.schemas';

export const registerSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_.-]+$/, 'Username may only contain letters, digits, dots, dashes and underscores'),
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
