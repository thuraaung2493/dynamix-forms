import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { createAuthRouter } from './auth/routes.js';
import {
  createSessionMiddleware,
  defaultTokenFactory,
  requireAuthentication,
} from './auth/session.js';
import type { PasswordService } from './auth/password.js';
import type { AppConfig } from './config.js';
import type { AppDatabase } from './database/client.js';
import { createFormsRouter } from './forms/routes.js';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { createCorsMiddleware, createOriginCheck } from './http/security.js';

export interface AppDependencies {
  config: AppConfig;
  database: AppDatabase;
  now?: () => Date;
  passwordService?: PasswordService;
  tokenFactory?: () => string;
}

export function createApp(dependencies: AppDependencies): Express {
  const app = express();
  const now = dependencies.now ?? (() => new Date());
  const sessionDependencies = {
    config: dependencies.config,
    database: dependencies.database,
    now,
    tokenFactory: dependencies.tokenFactory ?? defaultTokenFactory,
  };

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(createCorsMiddleware(dependencies.config.appOrigin));
  app.use(createOriginCheck(dependencies.config.appOrigin));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(createSessionMiddleware(sessionDependencies));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.use('/api/auth', createAuthRouter({
    ...sessionDependencies,
    ...(dependencies.passwordService === undefined
      ? {}
      : { passwordService: dependencies.passwordService }),
  }));
  app.use(
    '/api/forms',
    requireAuthentication,
    createFormsRouter({ database: dependencies.database, now }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
