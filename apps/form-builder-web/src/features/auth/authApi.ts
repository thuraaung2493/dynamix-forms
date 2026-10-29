import { ApiClientError, apiRequest } from '../../shared/api/client.js';
import type { LoginInput, RegisterInput, User } from './authTypes.js';

interface UserResponse {
  user: User;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return (await apiRequest<UserResponse>('/api/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<User> {
  return (await apiRequest<UserResponse>('/api/auth/login', {
    body: JSON.stringify(input),
    method: 'POST',
  })).user;
}

export async function register(input: RegisterInput): Promise<User> {
  return (await apiRequest<UserResponse>('/api/auth/register', {
    body: JSON.stringify(input),
    method: 'POST',
  })).user;
}

export async function logout(): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST' });
}
