import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from './AuthProvider.js';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.isLoading) {
    return <div className="page-state" role="status">Loading your workspace…</div>;
  }
  if (!auth.isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  return <Outlet />;
}
