import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp, registerAndLogin } from '../support/test-app';

describe('snippets API', () => {
  it('requires authentication', async () => {
    const { app } = createTestApp();

    await request(app).get('/api/snippets').expect(401);
    await request(app).post('/api/snippets').send({ title: 't', source: 's' }).expect(401);
  });

  it('supports the full snippet lifecycle', async () => {
    const { app } = createTestApp();
    const user = await registerAndLogin(app);
    const auth = { Authorization: `Bearer ${user.token}` };

    const created = await request(app)
      .post('/api/snippets')
      .set(auth)
      .send({ title: 'Hello', source: 'int main() {}' })
      .expect(201);
    const snippet = created.body.data.snippet;
    expect(snippet).toMatchObject({ title: 'Hello', standard: 'c++17', ownerId: user.id });

    const listed = await request(app).get('/api/snippets').set(auth).expect(200);
    expect(listed.body.data.snippets).toHaveLength(1);
    expect(listed.body.data.snippets[0]).not.toHaveProperty('source');

    const updated = await request(app)
      .patch(`/api/snippets/${snippet.id}`)
      .set(auth)
      .send({ standard: 'c++20', title: 'Renamed' })
      .expect(200);
    expect(updated.body.data.snippet).toMatchObject({
      title: 'Renamed',
      standard: 'c++20',
      source: 'int main() {}',
    });

    const fetched = await request(app).get(`/api/snippets/${snippet.id}`).set(auth).expect(200);
    expect(fetched.body.data.snippet.title).toBe('Renamed');

    await request(app).delete(`/api/snippets/${snippet.id}`).set(auth).expect(204);
    await request(app).get(`/api/snippets/${snippet.id}`).set(auth).expect(404);
  });

  it('isolates snippets between users', async () => {
    const { app } = createTestApp();
    const owner = await registerAndLogin(app);
    const intruder = await registerAndLogin(app);

    const created = await request(app)
      .post('/api/snippets')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Private', source: 'int main() {}' })
      .expect(201);
    const path = `/api/snippets/${created.body.data.snippet.id}`;
    const asIntruder = { Authorization: `Bearer ${intruder.token}` };

    await request(app).get(path).set(asIntruder).expect(404);
    await request(app).patch(path).set(asIntruder).send({ title: 'Mine now' }).expect(404);
    await request(app).delete(path).set(asIntruder).expect(404);

    const intruderList = await request(app).get('/api/snippets').set(asIntruder).expect(200);
    expect(intruderList.body.data.snippets).toEqual([]);
  });

  it('validates snippet payloads', async () => {
    const { app } = createTestApp();
    const user = await registerAndLogin(app);
    const auth = { Authorization: `Bearer ${user.token}` };

    await request(app)
      .post('/api/snippets')
      .set(auth)
      .send({ title: '', source: 'x', standard: 'c++99' })
      .expect(400);
    await request(app)
      .post('/api/snippets')
      .set(auth)
      .send({ title: 'Big', source: 'x'.repeat(64 * 1024 + 1) })
      .expect(400);
    await request(app)
      .post('/api/snippets')
      .set(auth)
      .send({ title: 'Owner', source: 'x', ownerId: 'someone-else' })
      .expect(400);

    const created = await request(app)
      .post('/api/snippets')
      .set(auth)
      .send({ title: 'Valid', source: 'x' })
      .expect(201);
    await request(app)
      .patch(`/api/snippets/${created.body.data.snippet.id}`)
      .set(auth)
      .send({})
      .expect(400);
  });
});
