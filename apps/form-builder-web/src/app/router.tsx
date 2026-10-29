import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';

import { ProtectedRoute } from '../features/auth/ProtectedRoute.js';
import { DefaultLayout } from '../shared/layout/DefaultLayout.js';

const DashboardPage = lazy(async () => ({ default: (await import('../features/forms/DashboardPage.js')).DashboardPage }));
const EditorPage = lazy(async () => ({ default: (await import('../features/editor/EditorPage.js')).EditorPage }));
const HomeRedirect = lazy(async () => ({ default: (await import('../features/home/HomeRedirect.js')).HomeRedirect }));
const LoginPage = lazy(async () => ({ default: (await import('../features/auth/LoginPage.js')).LoginPage }));
const NotFoundPage = lazy(async () => ({ default: (await import('../features/home/NotFoundPage.js')).NotFoundPage }));
const ProfilePage = lazy(async () => ({ default: (await import('../features/auth/ProfilePage.js')).ProfilePage }));
const RegisterPage = lazy(async () => ({ default: (await import('../features/auth/RegisterPage.js')).RegisterPage }));
const TrashPage = lazy(async () => ({ default: (await import('../features/forms/TrashPage.js')).TrashPage }));

export function AppRoutes() {
  return (
    <Suspense fallback={<div className="page-state">Loading…</div>}>
      <Routes>
        <Route element={<DefaultLayout />}>
          <Route element={<HomeRedirect />} index />
          <Route element={<LoginPage />} path="login" />
          <Route element={<RegisterPage />} path="register" />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardPage />} path="forms" />
            <Route element={<EditorPage />} path="forms/:formId/edit" />
            <Route element={<TrashPage />} path="trash" />
            <Route element={<ProfilePage />} path="profile" />
          </Route>
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </Suspense>
  );
}
