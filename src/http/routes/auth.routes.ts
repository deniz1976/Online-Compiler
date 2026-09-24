import { Router, type CookieOptions } from 'express';
import type { AppDependencies } from '../dependencies';
import { AUTH_COOKIE, authenticate, currentUserId, identify } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rate-limit';
import { loginSchema, registerSchema } from '../schemas/auth.schemas';
import { parseBody } from '../validation';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function createAuthRouter({ config, authService, tokenService }: AppDependencies): Router {
  const router = Router();
  const rateLimiter = createRateLimiter({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: config.rateLimits.authPer15Minutes,
  });
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.auth.secureCookies,
    sameSite: 'strict',
    path: '/',
  };

  router.post('/register', rateLimiter, async (req, res) => {
    const user = await authService.register(parseBody(registerSchema, req.body));
    res.status(201).json({ data: { user } });
  });

  router.post('/login', rateLimiter, async (req, res) => {
    const session = await authService.login(parseBody(loginSchema, req.body));

    res.cookie(AUTH_COOKIE, session.token, { ...cookieOptions, expires: session.expiresAt });
    res.status(200).json({
      data: { user: session.user, token: session.token, expiresAt: session.expiresAt },
    });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/session', identify(tokenService), async (req, res) => {
    const user = req.auth ? await authService.findProfile(req.auth.userId) : null;
    res.status(200).json({ data: { user } });
  });

  router.get('/me', authenticate(tokenService), async (req, res) => {
    const user = await authService.getProfile(currentUserId(req));
    res.status(200).json({ data: { user } });
  });

  return router;
}
