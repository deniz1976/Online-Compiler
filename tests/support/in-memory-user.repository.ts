import { randomUUID } from 'node:crypto';
import type { NewUser, User } from '../../src/domain/user';
import { ConflictError } from '../../src/errors/app-error';
import type { UserRepository } from '../../src/repositories/user.repository';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(user: NewUser): Promise<User> {
    const email = user.email.toLowerCase();
    const taken = [...this.users.values()].some(
      (existing) => existing.email === email || existing.username === user.username,
    );

    if (taken) {
      throw new ConflictError('Username or email is already registered');
    }

    const now = new Date();
    const created: User = { ...user, email, id: randomUUID(), createdAt: now, updatedAt: now };
    this.users.set(created.id, created);
    return created;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    return [...this.users.values()].find((user) => user.email === normalized) ?? null;
  }
}
