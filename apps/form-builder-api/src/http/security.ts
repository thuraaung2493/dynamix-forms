import type { RequestHandler } from 'express';

import { ApiError } from './errors.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createCorsMiddleware(appOrigin: string): RequestHandler {
  return (request, response, next) => {
    const origin = request.get('origin');
    if (origin === appOrigin) {
      response.setHeader('Access-Control-Allow-Origin', appOrigin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.setHeader('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      if (origin !== appOrigin) {
        next(new ApiError(403, 'origin_not_allowed', 'The request origin is not allowed.'));
        return;
      }
      response.sendStatus(204);
      return;
    }

    next();
  };
}

export function createOriginCheck(appOrigin: string): RequestHandler {
  return (request, _response, next) => {
    if (!STATE_CHANGING_METHODS.has(request.method)) {
      next();
      return;
    }

    const origin = request.get('origin');
    if (origin !== undefined && origin !== appOrigin) {
      next(new ApiError(403, 'origin_not_allowed', 'The request origin is not allowed.'));
      return;
    }

    next();
  };
}
