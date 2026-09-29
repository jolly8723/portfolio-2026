import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeMode } from './useTheme';
import { SYSTEM_THEME, THEME_BY_ID, type Scheme, type Theme } from './themes';

const STORAGE_KEY = 'theme-mode';

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'system' || THEME_BY_ID[stored])) return stored;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

function resolve(mode: ThemeMode, systemScheme: Scheme): Theme {
  if (mode !== 'system' && THEME_BY_ID[mode]) return THEME_BY_ID[mode];
  return THEME_BY_ID[SYSTEM_THEME[systemScheme]];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemScheme, setSystemScheme] = useState<Scheme>(() => (darkQuery().matches ? 'dark' : 'light'));

  useEffect(() => {
    const mq = darkQuery();
    const onChange = () => setSystemScheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = resolve(mode, systemScheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.id;
    root.dataset.scheme = theme.scheme;
    root.style.colorScheme = theme.scheme;
  }, [theme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
