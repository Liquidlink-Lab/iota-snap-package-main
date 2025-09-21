'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="transition-colors"
    >
      {mounted ? (
        <>
          <Sun
            className={cn(
              'h-4 w-4',
              resolvedTheme === 'dark' ? 'hidden' : 'block',
            )}
          />
          <Moon
            className={cn(
              'h-4 w-4',
              resolvedTheme !== 'dark' ? 'hidden' : 'block',
            )}
          />
        </>
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
