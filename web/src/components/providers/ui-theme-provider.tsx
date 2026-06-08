'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyUiTheme,
  DEFAULT_UI_THEME,
  readUiTheme,
  type UiTheme,
  UI_THEME_STORAGE_KEY,
} from '@/lib/ui/theme';

type UiThemeContextValue = {
  theme: UiTheme;
  setTheme: (theme: UiTheme) => void;
};

const UiThemeContext = createContext<UiThemeContextValue | null>(null);

export function UiThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>(DEFAULT_UI_THEME);

  useEffect(() => {
    const saved = readUiTheme();
    setThemeState(saved);
    applyUiTheme(saved);
  }, []);

  const setTheme = useCallback((next: UiTheme) => {
    setThemeState(next);
    applyUiTheme(next);
    try {
      localStorage.setItem(UI_THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota errors */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

export function useUiTheme() {
  const ctx = useContext(UiThemeContext);
  if (!ctx) throw new Error('useUiTheme must be used within UiThemeProvider');
  return ctx;
}
