import { FileStack, Languages, LogIn, LogOut, UserRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';

import { useAuth } from '../../features/auth/AuthProvider.js';
import { useI18n } from '../i18n/I18nProvider.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { Button } from '../ui/Button.js';

export function Header() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="site-header">
      <Link className="brand" to={auth.isAuthenticated ? '/forms' : '/login'}>
        <span className="brand-mark"><FileStack aria-hidden="true" size={19} /></span>
        <span>{t('appName')}</span>
      </Link>
      <nav aria-label="Primary navigation" className="main-nav">
        {auth.isAuthenticated ? (
          <>
            <NavLink to="/forms">{t('dashboard')}</NavLink>
            <NavLink to="/trash">{t('deletedForms')}</NavLink>
            <NavLink aria-label={t('profile')} to="/profile"><UserRound size={18} /></NavLink>
          </>
        ) : (
          <>
            <NavLink to="/login">{t('login')}</NavLink>
            <NavLink to="/register">{t('register')}</NavLink>
          </>
        )}
      </nav>
      <div className="header-actions">
        <Button
          aria-label="Switch language"
          onClick={() => setLocale(locale === 'en' ? 'my' : 'en')}
          variant="ghost"
        >
          <Languages aria-hidden="true" size={17} /> {t('language')}
        </Button>
        <ThemeToggle />
        {auth.isAuthenticated ? (
          <Button
            aria-label={t('logout')}
            onClick={() => void auth.logout().then(() => navigate('/login'))}
            size="icon"
            variant="ghost"
          >
            <LogOut size={18} />
          </Button>
        ) : <LogIn aria-hidden="true" className="header-login-icon" size={17} />}
      </div>
    </header>
  );
}
