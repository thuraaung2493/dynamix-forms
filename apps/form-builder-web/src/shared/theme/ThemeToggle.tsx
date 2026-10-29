import { Moon, Sun } from 'lucide-react';

import { useI18n } from '../i18n/I18nProvider.js';
import { Button } from '../ui/Button.js';
import { useTheme } from './ThemeProvider.js';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const dark = theme === 'dark';
  return (
    <Button
      aria-label={t('theme')}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      size="icon"
      variant="ghost"
    >
      {dark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </Button>
  );
}
