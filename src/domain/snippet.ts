import type { CppStandard } from './cpp';

export interface Snippet {
  id: string;
  ownerId: string;
  title: string;
  source: string;
  standard: CppStandard;
  createdAt: Date;
  updatedAt: Date;
}

export type SnippetSummary = Omit<Snippet, 'source'>;

export interface NewSnippet {
  ownerId: string;
  title: string;
  source: string;
  standard: CppStandard;
}

export type SnippetChanges = Partial<Pick<Snippet, 'title' | 'source' | 'standard'>>;
