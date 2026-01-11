'use client';

import { useLocaleSwitcher } from '@/lib/i18n/useLocaleSwitcher';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Locale } from '@/lib/i18n/config';

interface LanguageSwitcherProps {
  /** Show label next to icon */
  showLabel?: boolean;
  /** Additional className */
  className?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Language switcher dropdown component
 * Allows users to switch between supported locales (sv, en, no)
 */
export function LanguageSwitcher({
  showLabel = false,
  className,
  variant = 'ghost',
  size = 'sm',
}: LanguageSwitcherProps) {
  const { locale, locales, localeNames, switchLocale, isPending } = useLocaleSwitcher();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          disabled={isPending}
        >
          <GlobeAltIcon className="h-4 w-4" />
          {showLabel && (
            <span className="hidden sm:inline">{localeNames[locale]}</span>
          )}
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc as Locale)}
            className={cn(
              'cursor-pointer',
              locale === loc && 'bg-accent font-medium'
            )}
          >
            <span className="mr-2">{getLanguageFlag(loc)}</span>
            {localeNames[loc as Locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Get emoji flag for locale
 */
function getLanguageFlag(locale: string): string {
  const flags: Record<string, string> = {
    sv: '🇸🇪',
    no: '🇳🇴',
    en: '🇬🇧',
  };
  return flags[locale] || '🌐';
}
