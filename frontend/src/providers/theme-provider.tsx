'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  [key: string]: unknown;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): void {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    // Never pass an empty token to classList.remove.
    document.documentElement.classList.remove('light');
  }
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const storedTheme = localStorage.getItem('nexos-theme');
    const initialTheme: Theme = storedTheme === 'light' ? 'light' : 'dark';
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function setTheme(nextTheme: Theme): void {
    setThemeState(nextTheme);
    localStorage.setItem('nexos-theme', nextTheme);
    applyTheme(nextTheme);
  }

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
