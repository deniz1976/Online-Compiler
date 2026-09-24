import type { CppStandard } from '../domain/cpp';
import type { Snippet, SnippetChanges, SnippetSummary } from '../domain/snippet';
import { NotFoundError } from '../errors/app-error';
import type { SnippetRepository } from '../repositories/snippet.repository';

export interface CreateSnippetInput {
  title: string;
  source: string;
  standard: CppStandard;
}

export class SnippetService {
  constructor(private readonly snippets: SnippetRepository) {}

  create(ownerId: string, input: CreateSnippetInput): Promise<Snippet> {
    return this.snippets.create({ ownerId, ...input });
  }

  list(ownerId: string): Promise<SnippetSummary[]> {
    return this.snippets.listByOwner(ownerId);
  }

  async get(ownerId: string, id: string): Promise<Snippet> {
    return this.orNotFound(await this.snippets.findByIdForOwner(id, ownerId));
  }

  async update(ownerId: string, id: string, changes: SnippetChanges): Promise<Snippet> {
    return this.orNotFound(await this.snippets.updateForOwner(id, ownerId, changes));
  }

  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await this.snippets.deleteForOwner(id, ownerId))) {
      throw new NotFoundError('Snippet not found');
    }
  }

  private orNotFound(snippet: Snippet | null): Snippet {
    if (!snippet) {
      throw new NotFoundError('Snippet not found');
    }

    return snippet;
  }
}
