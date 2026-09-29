import { createContext, useContext } from 'react';
import type { Theme } from './themes';

/** 'system' follows the OS; any other value is a theme id. */
export type ThemeMode = 'system' | string;

export interface ThemeContextValue {
  mode: ThemeMode;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
