import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryClient } from '../shared/api/queryClient.js';
import { App } from './App.js';

const user = {
  displayName: 'Form Owner',
  email: 'owner@example.com',
  id: '1bdacdf4-15e5-4e4d-81e4-1f260b71dc56',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function mockApi(authenticated = false) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (path.endsWith('/api/auth/me')) {
      return authenticated
        ? json({ user })
        : json({ error: { code: 'authentication_required', message: 'Authentication is required.' } }, 401);
    }
    if (path.endsWith('/api/auth/login') && init?.method === 'POST') return json({ user });
    if (path.endsWith('/api/forms')) return json({ forms: [] });
    return json({ error: { code: 'not_found', message: 'Not found.' } }, 404);
  });
}

describe('application shell', () => {
  beforeEach(() => {
    queryClient.clear();
    window.history.replaceState({}, '', '/login');
  });

  it('redirects protected routes to login when no session exists', async () => {
    mockApi();
    window.history.replaceState({}, '', '/profile');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /design forms with a history/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('validates and completes the login flow', async () => {
    const fetchMock = mockApi();
    const interaction = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /design forms with a history/i });

    await interaction.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();

    await interaction.type(screen.getByLabelText('Email'), 'owner@example.com');
    await interaction.type(screen.getByLabelText('Password'), 'valid-passwordA!');
    await interaction.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Your forms' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/auth/login'), expect.objectContaining({ method: 'POST' }));
  });

  it('switches the visible navigation to Myanmar', async () => {
    mockApi();
    render(<App />);
    await screen.findByRole('heading', { name: /design forms with a history/i });
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByText('ဝင်ရောက်ရန်')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('my');
  });

  it('toggles dark mode', async () => {
    mockApi();
    const interaction = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: /design forms with a history/i });
    await interaction.click(screen.getByRole('button', { name: 'Toggle theme' }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});
