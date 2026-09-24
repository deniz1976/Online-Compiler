import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, registerAndLogin } from '../support/test-app';

describe('auth API', () => {
  it('registers a user without exposing the password hash', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'deniz', email: 'Deniz@Example.com ', password: 'correct-horse-battery' })
      .expect(201);

    expect(response.body.data.user).toMatchObject({ username: 'deniz', email: 'deniz@example.com' });
    expect(JSON.stringify(response.body)).not.toMatch(/password/i);
  });

  it('rejects invalid registrations', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a', email: 'not-an-email', password: 'short', admin: true })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects duplicate usernames or emails', async () => {
    const { app } = createTestApp();
    const user = { username: 'deniz', email: 'deniz@example.com', password: 'correct-horse-battery' };

    await request(app).post('/api/auth/register').send(user).expect(201);
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...user, username: 'someone' })
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects wrong credentials with the same message for unknown users', async () => {
    const { app } = createTestApp();
    await registerAndLogin(app, 'known');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'wrong-password' })
      .expect(401);
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'wrong-password' })
      .expect(401);

    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it('sets a hardened session cookie on login', async () => {
    const { app } = createTestApp();
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'deniz', email: 'deniz@example.com', password: 'correct-horse-battery' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'deniz@example.com', password: 'correct-horse-battery' })
      .expect(200);

    const cookie = response.get('set-cookie')?.[0] ?? '';
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it('authenticates with either the cookie or a bearer token', async () => {
    const { app } = createTestApp();
    const user = await registerAndLogin(app, 'deniz');

    const viaCookie = await request(app).get('/api/auth/me').set('Cookie', user.cookie).expect(200);
    const viaBearer = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(viaCookie.body.data.user.id).toBe(user.id);
    expect(viaBearer.body.data.user.id).toBe(user.id);
  });

  it('rejects missing, malformed and forged tokens', async () => {
    const { app } = createTestApp();
    const forged = createTestApp({ JWT_SECRET: 'another-secret-that-is-long-enough-too' });
    const foreignUser = await registerAndLogin(forged.app, 'foreign');

    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Basic abc').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${foreignUser.token}`).expect(401);
  });

  it('reports the current session without failing for anonymous visitors', async () => {
    const { app } = createTestApp();
    const user = await registerAndLogin(app, 'deniz');

    await request(app).get('/api/auth/session').expect(200, { data: { user: null } });
    await request(app)
      .get('/api/auth/session')
      .set('Authorization', 'Bearer not-a-token')
      .expect(200, { data: { user: null } });

    const session = await request(app).get('/api/auth/session').set('Cookie', user.cookie).expect(200);
    expect(session.body.data.user).toMatchObject({ id: user.id, username: 'deniz' });
  });

  it('clears the session cookie on logout', async () => {
    const { app } = createTestApp();

    const response = await request(app).post('/api/auth/logout').expect(204);

    expect(response.get('set-cookie')?.[0]).toMatch(/^token=;.*Expires=Thu, 01 Jan 1970/);
  });

  it('rate limits authentication attempts', async () => {
    const { app } = createTestApp({ RATE_LIMIT_AUTH_PER_15_MIN: '2' });
    const credentials = { email: 'nobody@example.com', password: 'whatever-password' };

    await request(app).post('/api/auth/login').send(credentials).expect(401);
    await request(app).post('/api/auth/login').send(credentials).expect(401);
    const response = await request(app).post('/api/auth/login').send(credentials).expect(429);

    expect(response.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
