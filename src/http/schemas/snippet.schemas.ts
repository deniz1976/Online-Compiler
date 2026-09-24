import { z } from 'zod';
import { sourceSchema, standardSchema, standardWithDefaultSchema } from './common.schemas';

const titleSchema = z.string().trim().min(1).max(100);

export const createSnippetSchema = z.strictObject({
  title: titleSchema,
  source: sourceSchema,
  standard: standardWithDefaultSchema,
});

export const updateSnippetSchema = z
  .strictObject({
    title: titleSchema,
    source: sourceSchema,
    standard: standardSchema,
  })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: 'At least one field must be provided',
  });
