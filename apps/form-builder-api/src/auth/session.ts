import { createHash, randomBytes } from 'node:crypto';

import { and, eq, gt } from 'drizzle-orm';
import type { RequestHandler, Response } from 'express';

import type { AppConfig } from '../config.js';
import type { AppDatabase } from '../database/client.js';
import { sessions, users, type UserRecord } from '../database/schema.js';
import { ApiError } from '../http/errors.js';

export interface AuthenticatedUser {
  displayName: string;
  email: string;
  id: string;
}

export interface AuthLocals {
  user?: AuthenticatedUser;
}

export interface SessionDependencies {
  config: AppConfig;
  database: AppDatabase;
  now: () => Date;
  tokenFactory: () => string;
}

export const defaultTokenFactory = (): string => randomBytes(32).toString('base64url');

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function publicUser(user: Pick<UserRecord, 'displayName' | 'email' | 'id'>): AuthenticatedUser {
  return { displayName: user.displayName, email: user.email, id: user.id };
}

function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  config: AppConfig,
): void {
  response.cookie(config.session.cookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: config.session.secureCookie,
  });
}

export function clearSessionCookie(response: Response, config: AppConfig): void {
  response.clearCookie(config.session.cookieName, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: config.session.secureCookie,
  });
}

export async function createSession(
  dependencies: SessionDependencies,
  response: Response,
  userId: string,
): Promise<void> {
  const token = dependencies.tokenFactory();
  const now = dependencies.now();
  const absoluteExpiresAt = new Date(now.getTime() + dependencies.config.session.absoluteLifetimeMs);
  const expiresAt = new Date(now.getTime() + dependencies.config.session.rollingLifetimeMs);

  await dependencies.database.insert(sessions).values({
    absoluteExpiresAt,
    createdAt: now,
    expiresAt,
    lastUsedAt: now,
    tokenHash: hashSessionToken(token),
    userId,
  });
  setSessionCookie(response, token, expiresAt, dependencies.config);
}

export function createSessionMiddleware(dependencies: SessionDependencies): RequestHandler {
  return async (request, response, next) => {
    try {
      const token = request.cookies?.[dependencies.config.session.cookieName] as unknown;
      if (typeof token !== 'string' || token.length === 0) {
        next();
        return;
      }

      const now = dependencies.now();
      const [record] = await dependencies.database
        .select({
          absoluteExpiresAt: sessions.absoluteExpiresAt,
          displayName: users.displayName,
          email: users.email,
          expiresAt: sessions.expiresAt,
          sessionId: sessions.id,
          userId: users.id,
        })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(
            eq(sessions.tokenHash, hashSessionToken(token)),
            gt(sessions.expiresAt, now),
            gt(sessions.absoluteExpiresAt, now),
          ),
        )
        .limit(1);

      if (record === undefined) {
        clearSessionCookie(response, dependencies.config);
        next();
        return;
      }

      const rollingExpiry = new Date(now.getTime() + dependencies.config.session.rollingLifetimeMs);
      const expiresAt = rollingExpiry < record.absoluteExpiresAt
        ? rollingExpiry
        : record.absoluteExpiresAt;

      await dependencies.database
        .update(sessions)
        .set({ expiresAt, lastUsedAt: now })
        .where(eq(sessions.id, record.sessionId));
      setSessionCookie(response, token, expiresAt, dependencies.config);
      (response.locals as AuthLocals).user = publicUser({
        displayName: record.displayName,
        email: record.email,
        id: record.userId,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuthentication: RequestHandler = (_request, response, next) => {
  if ((response.locals as AuthLocals).user === undefined) {
    next(new ApiError(401, 'authentication_required', 'Authentication is required.'));
    return;
  }
  next();
};

export function getAuthenticatedUser(response: Response): AuthenticatedUser {
  const user = (response.locals as AuthLocals).user;
  if (user === undefined) {
    throw new ApiError(401, 'authentication_required', 'Authentication is required.');
  }
  return user;
}
