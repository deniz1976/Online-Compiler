import { toPublicUser, type PublicUser } from '../domain/user';
import { NotFoundError, UnauthorizedError } from '../errors/app-error';
import type { UserRepository } from '../repositories/user.repository';
import type { PasswordHasher } from './password-hasher';
import type { IssuedToken, TokenService } from './token.service';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession extends IssuedToken {
  user: PublicUser;
}

export class AuthService {
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterInput): Promise<PublicUser> {
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({
      username: input.username,
      email: input.email,
      passwordHash,
    });

    return toPublicUser(user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      await this.hasher.verify(await this.getDummyHash(), input.password);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!(await this.hasher.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return { user: toPublicUser(user), ...this.tokens.issue(user.id) };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toPublicUser(user);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('timing-equalization-password');
    return this.dummyHash;
  }
}
