import { Navigate } from 'react-router';

import { useAuth } from '../auth/AuthProvider.js';

export function HomeRedirect() {
  const auth = useAuth();
  if (auth.isLoading) return <div className="page-state">Loading…</div>;
  return <Navigate replace to={auth.isAuthenticated ? '/forms' : '/login'} />;
}
