import { BrowserRouter } from 'react-router';

import { AppProviders } from './providers.js';
import { AppRoutes } from './router.js';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
