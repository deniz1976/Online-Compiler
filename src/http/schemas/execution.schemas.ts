import { z } from 'zod';
import { sourceSchema, standardWithDefaultSchema, stdinSchema } from './common.schemas';

export const executionSchema = z.strictObject({
  source: sourceSchema,
  stdin: stdinSchema.default(''),
  standard: standardWithDefaultSchema,
});
