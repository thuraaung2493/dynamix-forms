import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export interface ApiErrorBody {
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new ApiError(404, 'not_found', 'The requested resource was not found.'));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  void _next;
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    };
    response.status(error.status).json(body);
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'invalid_request',
        details: error.issues,
        message: 'The request is invalid.',
      },
    } satisfies ApiErrorBody);
    return;
  }

  const databaseError = error as { code?: string; constraint?: string };
  if (databaseError.code === '23505') {
    response.status(409).json({
      error: {
        code: 'conflict',
        message: 'A resource with the same unique value already exists.',
      },
    } satisfies ApiErrorBody);
    return;
  }

  console.error(error);
  response.status(500).json({
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred.',
    },
  } satisfies ApiErrorBody);
};

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}
