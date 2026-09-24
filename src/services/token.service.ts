import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/app-error';

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

export interface TokenService {
  issue(userId: string): IssuedToken;
  verify(token: string): { userId: string };
}

const ISSUER = 'online-compiler';
const ALGORITHM = 'HS256';

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  issue(userId: string): IssuedToken {
    const token = jwt.sign({}, this.secret, {
      algorithm: ALGORITHM,
      subject: userId,
      issuer: ISSUER,
      expiresIn: this.ttlSeconds,
    });

    return { token, expiresAt: new Date(Date.now() + this.ttlSeconds * 1000) };
  }

  verify(token: string): { userId: string } {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: [ALGORITHM], issuer: ISSUER });

      if (typeof payload === 'string' || !payload.sub) {
        throw new UnauthorizedError('Invalid token');
      }

      return { userId: payload.sub };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
