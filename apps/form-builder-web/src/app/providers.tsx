import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AuthProvider } from '../features/auth/AuthProvider.js';
import { queryClient } from '../shared/api/queryClient.js';
import { I18nProvider } from '../shared/i18n/I18nProvider.js';
import { ThemeProvider } from '../shared/theme/ThemeProvider.js';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
