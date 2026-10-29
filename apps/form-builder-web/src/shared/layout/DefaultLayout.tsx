import { Outlet } from 'react-router';

import { useI18n } from '../i18n/I18nProvider.js';
import { Header } from './Header.js';

export function DefaultLayout() {
  const { t } = useI18n();
  return (
    <div className="app-shell">
      <Header />
      <main className="site-main"><Outlet /></main>
      <footer className="site-footer">
        <span>© 2026 Dynamix Forms</span>
        <span>{t('footer')}</span>
      </footer>
    </div>
  );
}
