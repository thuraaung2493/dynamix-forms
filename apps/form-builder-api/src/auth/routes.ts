import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';

import { sessions, users } from '../database/schema.js';
import { ApiError, asyncHandler } from '../http/errors.js';
import { argonPasswordService, passwordSchema, type PasswordService } from './password.js';
import {
  clearSessionCookie,
  createSession,
  getAuthenticatedUser,
  hashSessionToken,
  requireAuthentication,
  type SessionDependencies,
} from './session.js';

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const registerSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
});
const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

interface AuthRouterDependencies extends SessionDependencies {
  passwordService?: PasswordService;
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();
  const passwordService = dependencies.passwordService ?? argonPasswordService;
  const authLimiter = rateLimit({
    limit: 20,
    standardHeaders: 'draft-8',
    windowMs: 15 * 60 * 1_000,
  });

  router.post('/register', authLimiter, asyncHandler(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const [existing] = await dependencies.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (existing !== undefined) {
      throw new ApiError(409, 'email_in_use', 'An account with this email already exists.');
    }

    const passwordHash = await passwordService.hash(input.password);
    const [user] = await dependencies.database
      .insert(users)
      .values({
        displayName: input.displayName,
        email: input.email,
        passwordHash,
      })
      .returning({ displayName: users.displayName, email: users.email, id: users.id });
    if (user === undefined) {
      throw new Error('User insert did not return a row.');
    }

    await createSession(dependencies, response, user.id);
    response.status(201).json({ user });
  }));

  router.post('/login', authLimiter, asyncHandler(async (request, response) => {
    const input = loginSchema.parse(request.body);
    const [user] = await dependencies.database
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (user === undefined || !(await passwordService.verify(user.passwordHash, input.password))) {
      throw new ApiError(401, 'invalid_credentials', 'The email or password is incorrect.');
    }

    await createSession(dependencies, response, user.id);
    response.json({
      user: { displayName: user.displayName, email: user.email, id: user.id },
    });
  }));

  router.post('/logout', asyncHandler(async (request, response) => {
    const token = request.cookies?.[dependencies.config.session.cookieName] as unknown;
    if (typeof token === 'string' && token.length > 0) {
      await dependencies.database
        .delete(sessions)
        .where(eq(sessions.tokenHash, hashSessionToken(token)));
    }
    clearSessionCookie(response, dependencies.config);
    response.sendStatus(204);
  }));

  router.get('/me', requireAuthentication, (request, response) => {
    response.json({ user: getAuthenticatedUser(response) });
  });

  return router;
}
