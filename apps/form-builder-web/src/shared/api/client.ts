export interface ApiErrorShape {
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(status: number, body: ApiErrorShape) {
    super(body.error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let body: ApiErrorShape;
    try {
      body = await response.json() as ApiErrorShape;
    } catch {
      body = { error: { code: 'request_failed', message: 'The request failed.' } };
    }
    throw new ApiClientError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return await response.json() as T;
}

export function apiUrl(path: string): string {
  return `${baseUrl}${path}`;
}
