import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../support/test-app';

describe('application', () => {
  it('reports health based on the database connection', async () => {
    const { app, database } = createTestApp();

    await request(app).get('/api/health').expect(200, { data: { status: 'ok', database: 'up' } });

    database.healthy = false;
    await request(app).get('/api/health').expect(503);
  });

  it('returns JSON errors for unknown API routes and malformed bodies', async () => {
    const { app } = createTestApp();

    const notFound = await request(app).get('/api/unknown').expect(404);
    expect(notFound.body.error.code).toBe('NOT_FOUND');

    const malformed = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
  });

  it('serves the frontend for non-API routes', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/some/client/route').expect(200);

    expect(response.type).toBe('text/html');
  });

  it('sets security headers', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('only allows configured CORS origins', async () => {
    const { app } = createTestApp({ CORS_ORIGINS: 'https://allowed.example' });

    const allowed = await request(app).get('/api/health').set('Origin', 'https://allowed.example');
    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');

    expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves the OpenAPI documentation', async () => {
    const { app } = createTestApp();

    await request(app).get('/api-docs/').expect(200);
  });
});
