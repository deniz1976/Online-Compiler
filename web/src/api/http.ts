export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type Fetcher = typeof fetch;

export class HttpClient {
  constructor(
    private readonly baseUrl = '/api',
    private readonly fetcher: Fetcher = (...args) => fetch(...args),
  ) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete(path: string): Promise<void> {
    return this.request<void>('DELETE', path);
  }

  private async request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    let response: Response;

    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? { Accept: 'application/json' } : {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const payload: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      throw toApiError(response.status, payload as ErrorBody | undefined);
    }

    return (payload as { data: T }).data;
  }
}

function toApiError(status: number, body: ErrorBody | undefined): ApiError {
  const error = body?.error;
  const details = Array.isArray(error?.details) ? (error.details as ApiErrorDetail[]) : [];

  return new ApiError(
    status,
    error?.code ?? 'HTTP_ERROR',
    error?.message ?? `Request failed with status ${status}`,
    details,
  );
}
