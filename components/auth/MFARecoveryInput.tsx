/**
 * MFA Recovery Code Input Component
 * For entering recovery codes in format XXXX-XXXX-XXXX
 */

'use client';

import { useState, useCallback, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { KeyIcon } from '@heroicons/react/24/outline';

interface MFARecoveryInputProps {
  /** Callback when code is submitted */
  onSubmit: (code: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export function MFARecoveryInput({
  onSubmit,
  isLoading = false,
  error = null,
  disabled = false,
  className,
}: MFARecoveryInputProps) {
  const t = useTranslations('auth.mfa.challenge');
  const [value, setValue] = useState('');

  // Format input as XXXX-XXXX-XXXX
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Add dashes
    if (input.length > 4) {
      input = input.slice(0, 4) + '-' + input.slice(4);
    }
    if (input.length > 9) {
      input = input.slice(0, 9) + '-' + input.slice(9);
    }
    
    // Max length with dashes: 14 (12 chars + 2 dashes)
    setValue(input.slice(0, 14));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.replace(/-/g, '').length === 12) {
      onSubmit(value);
    }
  }, [value, onSubmit]);

  const isValidLength = value.replace(/-/g, '').length === 12;

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <label 
          htmlFor="recovery-code" 
          className="block text-sm font-medium text-foreground"
        >
          {t('recoveryCodeLabel')}
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <KeyIcon className="h-5 w-5" />
          </div>
          <input
            id="recovery-code"
            type="text"
            value={value}
            onChange={handleChange}
            placeholder="XXXX-XXXX-XXXX"
            disabled={disabled || isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck="false"
            className={cn(
              'w-full pl-10 pr-4 py-3 font-mono text-lg tracking-wider rounded-lg border transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'placeholder:text-muted-foreground/50',
              disabled || isLoading
                ? 'bg-muted border-border cursor-not-allowed opacity-50'
                : error
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'bg-background border-border focus:border-primary focus:ring-primary',
            )}
          />
        </div>
        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t('recoveryCodeHelp')}
        </p>
      </div>

      <Button
        type="submit"
        disabled={!isValidLength || disabled || isLoading}
        loading={isLoading}
        loadingText={t('verifying')}
        className="w-full"
      >
        {t('verifyWithRecovery')}
      </Button>
    </form>
  );
}
