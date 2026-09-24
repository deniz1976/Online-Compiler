import { isObjectIdOrHexString, type Types } from 'mongoose';
import type { CppStandard } from '../../domain/cpp';
import type { NewSnippet, Snippet, SnippetChanges, SnippetSummary } from '../../domain/snippet';
import type { SnippetRepository } from '../../repositories/snippet.repository';
import { SnippetModel, type SnippetDocument } from '../database/models/snippet.model';

type StoredSnippet = SnippetDocument & { _id: Types.ObjectId };

export class MongoSnippetRepository implements SnippetRepository {
  async create(snippet: NewSnippet): Promise<Snippet> {
    const created = await SnippetModel.create(snippet);
    return toDomain(created.toObject());
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Snippet | null> {
    if (!areValidIds(id, ownerId)) {
      return null;
    }

    const snippet = await SnippetModel.findOne({ _id: id, ownerId }).lean<StoredSnippet>().exec();
    return snippet ? toDomain(snippet) : null;
  }

  async listByOwner(ownerId: string): Promise<SnippetSummary[]> {
    if (!isObjectIdOrHexString(ownerId)) {
      return [];
    }

    const snippets = await SnippetModel.find({ ownerId })
      .select('-source')
      .sort({ updatedAt: -1 })
      .lean<Omit<StoredSnippet, 'source'>[]>()
      .exec();

    return snippets.map(toSummary);
  }

  async updateForOwner(id: string, ownerId: string, changes: SnippetChanges): Promise<Snippet | null> {
    if (!areValidIds(id, ownerId)) {
      return null;
    }

    const snippet = await SnippetModel.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: changes },
      { returnDocument: 'after', runValidators: true },
    )
      .lean<StoredSnippet>()
      .exec();

    return snippet ? toDomain(snippet) : null;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    if (!areValidIds(id, ownerId)) {
      return false;
    }

    const result = await SnippetModel.deleteOne({ _id: id, ownerId }).exec();
    return result.deletedCount === 1;
  }
}

function areValidIds(...ids: string[]): boolean {
  return ids.every((id) => isObjectIdOrHexString(id));
}

function toSummary(snippet: Omit<StoredSnippet, 'source'>): SnippetSummary {
  return {
    id: snippet._id.toString(),
    ownerId: snippet.ownerId.toString(),
    title: snippet.title,
    standard: snippet.standard as CppStandard,
    createdAt: snippet.createdAt,
    updatedAt: snippet.updatedAt,
  };
}

function toDomain(snippet: StoredSnippet): Snippet {
  return { ...toSummary(snippet), source: snippet.source };
}
