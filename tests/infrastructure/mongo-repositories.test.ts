import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ConflictError } from '../../src/errors/app-error';
import { connectToDatabase, disconnectFromDatabase } from '../../src/infrastructure/database/mongo';
import { SnippetModel } from '../../src/infrastructure/database/models/snippet.model';
import { UserModel } from '../../src/infrastructure/database/models/user.model';
import { MongoSnippetRepository } from '../../src/infrastructure/repositories/mongo-snippet.repository';
import { MongoUserRepository } from '../../src/infrastructure/repositories/mongo-user.repository';

const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)('Mongo repositories', () => {
  const users = new MongoUserRepository();
  const snippets = new MongoSnippetRepository();

  beforeAll(async () => {
    await connectToDatabase(uri as string);
    await mongoose.connection.dropDatabase();
    await Promise.all([UserModel.syncIndexes(), SnippetModel.syncIndexes()]);
  });

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), SnippetModel.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await disconnectFromDatabase();
  });

  const newUser = (name: string) => ({
    username: name,
    email: `${name}@Example.com`,
    passwordHash: 'hash',
  });

  it('creates and finds users with normalized emails', async () => {
    const created = await users.create(newUser('deniz'));

    expect(created.email).toBe('deniz@example.com');
    expect(await users.findByEmail('DENIZ@example.com')).toMatchObject({ id: created.id });
    expect(await users.findById(created.id)).toMatchObject({ username: 'deniz' });
    expect(await users.findById('not-an-object-id')).toBeNull();
  });

  it('maps duplicate keys to conflicts', async () => {
    await users.create(newUser('deniz'));

    await expect(users.create(newUser('deniz'))).rejects.toBeInstanceOf(ConflictError);
  });

  it('scopes snippet operations to their owner', async () => {
    const owner = await users.create(newUser('owner'));
    const other = await users.create(newUser('other'));
    const snippet = await snippets.create({
      ownerId: owner.id,
      title: 'Hello',
      source: 'int main() {}',
      standard: 'c++17',
    });

    expect(await snippets.findByIdForOwner(snippet.id, other.id)).toBeNull();
    expect(await snippets.updateForOwner(snippet.id, other.id, { title: 'x' })).toBeNull();
    expect(await snippets.deleteForOwner(snippet.id, other.id)).toBe(false);
    expect(await snippets.listByOwner(other.id)).toEqual([]);

    const [summary] = await snippets.listByOwner(owner.id);
    expect(summary).toMatchObject({ id: snippet.id, title: 'Hello' });
    expect(summary).not.toHaveProperty('source');

    const updated = await snippets.updateForOwner(snippet.id, owner.id, { standard: 'c++20' });
    expect(updated).toMatchObject({ standard: 'c++20', source: 'int main() {}' });

    expect(await snippets.deleteForOwner(snippet.id, owner.id)).toBe(true);
    expect(await snippets.findByIdForOwner(snippet.id, owner.id)).toBeNull();
  });
});
