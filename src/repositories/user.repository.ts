import type { NewUser, User } from '../domain/user';

export interface UserRepository {
  create(user: NewUser): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
