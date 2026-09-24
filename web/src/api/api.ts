import { HttpClient } from './http';
import type {
  ExecutionInput,
  ExecutionLimits,
  ExecutionResult,
  Snippet,
  SnippetInput,
  SnippetSummary,
  User,
} from './types';

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  username: string;
}

export class Api {
  constructor(private readonly http = new HttpClient()) {}

  async currentUser(): Promise<User | null> {
    return (await this.http.get<{ user: User | null }>('/auth/session')).user;
  }

  async login(credentials: Credentials): Promise<User> {
    return (await this.http.post<{ user: User }>('/auth/login', credentials)).user;
  }

  async register(registration: Registration): Promise<User> {
    return (await this.http.post<{ user: User }>('/auth/register', registration)).user;
  }

  logout(): Promise<void> {
    return this.http.post<void>('/auth/logout');
  }

  async limits(): Promise<ExecutionLimits> {
    return (await this.http.get<{ limits: ExecutionLimits }>('/executions/limits')).limits;
  }

  async execute(input: ExecutionInput): Promise<ExecutionResult> {
    return (await this.http.post<{ result: ExecutionResult }>('/executions', input)).result;
  }

  async listSnippets(): Promise<SnippetSummary[]> {
    return (await this.http.get<{ snippets: SnippetSummary[] }>('/snippets')).snippets;
  }

  async getSnippet(id: string): Promise<Snippet> {
    return (await this.http.get<{ snippet: Snippet }>(`/snippets/${encodeURIComponent(id)}`)).snippet;
  }

  async createSnippet(input: SnippetInput): Promise<Snippet> {
    return (await this.http.post<{ snippet: Snippet }>('/snippets', input)).snippet;
  }

  async updateSnippet(id: string, input: SnippetInput): Promise<Snippet> {
    return (await this.http.patch<{ snippet: Snippet }>(`/snippets/${encodeURIComponent(id)}`, input))
      .snippet;
  }

  deleteSnippet(id: string): Promise<void> {
    return this.http.delete(`/snippets/${encodeURIComponent(id)}`);
  }
}
