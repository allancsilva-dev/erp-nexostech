'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const currentTheme = theme ?? resolvedTheme;
  const isDark = currentTheme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme(): void {
    const nextTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', nextTheme);
    document.cookie = `theme=${nextTheme}; path=/; max-age=31536000; samesite=lax`;
    setTheme(nextTheme);
  }

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  return (
    <Button variant="outline" size="sm" onClick={toggleTheme} aria-label="Alternar tema">
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
