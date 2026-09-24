import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, registerAndLogin } from '../support/test-app';

describe('executions API', () => {
  it('requires authentication', async () => {
    const { app, runner } = createTestApp();

    await request(app).post('/api/executions').send({ source: 'int main() {}' }).expect(401);
    expect(runner.requests).toHaveLength(0);
  });

  it('runs code with defaults applied', async () => {
    const { app, runner } = createTestApp();
    const user = await registerAndLogin(app);

    const response = await request(app)
      .post('/api/executions')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ source: 'int main() {}' })
      .expect(200);

    expect(response.body.data.result).toEqual(runner.result);
    expect(runner.requests).toEqual([{ source: 'int main() {}', stdin: '', standard: 'c++17' }]);
  });

  it('rejects invalid payloads before reaching the sandbox', async () => {
    const { app, runner } = createTestApp();
    const user = await registerAndLogin(app);
    const auth = { Authorization: `Bearer ${user.token}` };

    await request(app).post('/api/executions').set(auth).send({ source: '' }).expect(400);
    await request(app)
      .post('/api/executions')
      .set(auth)
      .send({ source: 'int main() {}', standard: 'c++03' })
      .expect(400);
    await request(app)
      .post('/api/executions')
      .set(auth)
      .send({ source: 'int main() {}', stdin: 'x'.repeat(64 * 1024 + 1) })
      .expect(400);

    expect(runner.requests).toHaveLength(0);
  });

  it('rate limits executions per user', async () => {
    const { app } = createTestApp({ RATE_LIMIT_EXECUTIONS_PER_MIN: '1' });
    const first = await registerAndLogin(app);
    const second = await registerAndLogin(app);
    const body = { source: 'int main() {}' };

    await request(app).post('/api/executions').set('Authorization', `Bearer ${first.token}`).send(body).expect(200);
    await request(app).post('/api/executions').set('Authorization', `Bearer ${first.token}`).send(body).expect(429);
    await request(app).post('/api/executions').set('Authorization', `Bearer ${second.token}`).send(body).expect(200);
  });

  it('returns 503 when execution capacity is exhausted', async () => {
    const { app, runner } = createTestApp({ SANDBOX_MAX_CONCURRENCY: '1', SANDBOX_MAX_QUEUE: '0' });
    const user = await registerAndLogin(app);
    runner.delayMs = 200;
    const send = () =>
      request(app)
        .post('/api/executions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ source: 'int main() {}' });

    const responses = await Promise.all([send(), send()]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 503]);
  });
});
