'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme(): void {
    const nextTheme = isDark ? 'light' : 'dark';
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
