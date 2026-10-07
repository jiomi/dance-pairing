import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Theme } from '../types';

export const THEME_STORAGE_KEY = 'dance-pairing:theme';

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** Read the saved theme (dark by default). Used at startup, before React renders. */
export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === '"light"' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** Apply the saved theme immediately, so pages never flash the wrong colors. */
export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, 'dark');

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
