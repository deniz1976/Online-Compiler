import { describe, expect, it, vi } from 'vitest';
import { ApiError, HttpClient, type Fetcher } from '../src/api/http';

const respond = (status: number, body?: unknown): Fetcher =>
  vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('HttpClient', () => {
  it('unwraps the data envelope and sends JSON with same-origin credentials', async () => {
    const fetcher = respond(200, { data: { value: 42 } });
    const client = new HttpClient('/api', fetcher);

    await expect(client.post('/things', { name: 'x' })).resolves.toEqual({ value: 42 });

    expect(fetcher).toHaveBeenCalledWith('/api/things', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{"name":"x"}',
    });
  });

  it('returns nothing for 204 responses', async () => {
    await expect(new HttpClient('/api', respond(204)).delete('/things/1')).resolves.toBeUndefined();
  });

  it('maps error envelopes to ApiError', async () => {
    const client = new HttpClient(
      '/api',
      respond(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [{ path: 'email', message: 'Invalid email' }],
        },
      }),
    );

    const error = await client.get('/x').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'email', message: 'Invalid email' }],
    });
  });

  it('reports unauthorized and network failures', async () => {
    const capture = (fetcher: Fetcher) =>
      new HttpClient('/api', fetcher).get('/me').then(
        () => {
          throw new Error('Expected the request to fail');
        },
        (caught: unknown) => caught as ApiError,
      );

    const unauthorized = await capture(respond(401, { error: { code: 'UNAUTHORIZED', message: 'No' } }));
    const offline = await capture(vi.fn(async () => Promise.reject(new TypeError('offline'))));

    expect(unauthorized.isUnauthorized).toBe(true);
    expect(offline.code).toBe('NETWORK_ERROR');
  });
});
