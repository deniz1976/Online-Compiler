import type { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../../errors/app-error';
import type { TokenService } from '../../services/token.service';

export const AUTH_COOKIE = 'token';

export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const token = extractToken(req);

    if (!token) {
      next(new UnauthorizedError());
      return;
    }

    req.auth = tokens.verify(token);
    next();
  };
}

export function currentUserId(req: Request): string {
  if (!req.auth) {
    throw new UnauthorizedError();
  }

  return req.auth.userId;
}

function extractToken(req: Request): string | undefined {
  const header = req.get('authorization');

  if (header) {
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
  }

  const cookie: unknown = req.cookies?.[AUTH_COOKIE];
  return typeof cookie === 'string' && cookie.length > 0 ? cookie : undefined;
}
