import type { NewSnippet, Snippet, SnippetChanges, SnippetSummary } from '../domain/snippet';

export interface SnippetRepository {
  create(snippet: NewSnippet): Promise<Snippet>;
  findByIdForOwner(id: string, ownerId: string): Promise<Snippet | null>;
  listByOwner(ownerId: string): Promise<SnippetSummary[]>;
  updateForOwner(id: string, ownerId: string, changes: SnippetChanges): Promise<Snippet | null>;
  deleteForOwner(id: string, ownerId: string): Promise<boolean>;
}
