import { Schema, model, type InferSchemaType } from 'mongoose';
import { CPP_STANDARDS } from '../../../domain/cpp';

const snippetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, required: true },
    standard: { type: String, enum: CPP_STANDARDS, required: true },
  },
  { timestamps: true },
);

snippetSchema.index({ ownerId: 1, updatedAt: -1 });

export type SnippetDocument = InferSchemaType<typeof snippetSchema>;

export const SnippetModel = model('Snippet', snippetSchema);
