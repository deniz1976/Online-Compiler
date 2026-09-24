import { randomUUID } from 'node:crypto';
import type { NewSnippet, Snippet, SnippetChanges, SnippetSummary } from '../../src/domain/snippet';
import type { SnippetRepository } from '../../src/repositories/snippet.repository';

export class InMemorySnippetRepository implements SnippetRepository {
  private readonly snippets = new Map<string, Snippet>();

  async create(snippet: NewSnippet): Promise<Snippet> {
    const now = new Date();
    const created: Snippet = { ...snippet, id: randomUUID(), createdAt: now, updatedAt: now };
    this.snippets.set(created.id, created);
    return created;
  }

  async findByIdForOwner(id: string, ownerId: string): Promise<Snippet | null> {
    const snippet = this.snippets.get(id);
    return snippet && snippet.ownerId === ownerId ? snippet : null;
  }

  async listByOwner(ownerId: string): Promise<SnippetSummary[]> {
    return [...this.snippets.values()]
      .filter((snippet) => snippet.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(({ source: _source, ...summary }) => summary);
  }

  async updateForOwner(id: string, ownerId: string, changes: SnippetChanges): Promise<Snippet | null> {
    const snippet = await this.findByIdForOwner(id, ownerId);

    if (!snippet) {
      return null;
    }

    const updated: Snippet = { ...snippet, ...changes, updatedAt: new Date() };
    this.snippets.set(id, updated);
    return updated;
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    const snippet = await this.findByIdForOwner(id, ownerId);
    return snippet ? this.snippets.delete(id) : false;
  }
}
