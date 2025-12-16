'use client';

import { useState, useRef, useCallback, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@heroicons/react/24/solid';

type JoinSessionFormProps = {
  onSubmit: (code: string, displayName: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
};

const CODE_LENGTH = 6;

export function JoinSessionForm({
  onSubmit,
  isLoading = false,
  error = null,
  className = '',
}: JoinSessionFormProps) {
  const [codeChars, setCodeChars] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const displayedError = error || localError;

  const isValidCode = codeChars.every((char) => char.length === 1);
  const isValidName = displayName.trim().length >= 2;
  const canSubmit = isValidCode && isValidName && !isLoading;

  const code = codeChars.join('').toUpperCase();

  const focusInput = (index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleCodeChange = useCallback((index: number, value: string) => {
    // Only accept alphanumeric characters
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const char = sanitized.slice(-1); // Take only last character

    setLocalError(null);

    setCodeChars((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });

    // Auto-advance to next input
    if (char && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!codeChars[index] && index > 0) {
        // If current is empty, go back and clear previous
        focusInput(index - 1);
        setCodeChars((prev) => {
          const next = [...prev];
          next[index - 1] = '';
          return next;
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  }, [codeChars]);

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const chars = pasted.slice(0, CODE_LENGTH).split('');

    setCodeChars((prev) => {
      const next = [...prev];
      chars.forEach((char, i) => {
        next[i] = char;
      });
      return next;
    });

    // Focus the next empty input or last one
    const nextEmptyIndex = chars.length < CODE_LENGTH ? chars.length : CODE_LENGTH - 1;
    focusInput(nextEmptyIndex);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!isValidCode) {
      setLocalError('Ange en komplett sessionskod');
      return;
    }

    if (!isValidName) {
      setLocalError('Ange ett visningsnamn (minst 2 tecken)');
      return;
    }

    await onSubmit(code, displayName.trim());
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Session Code Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          Sessionskod
        </label>
        <div className="flex justify-center gap-2">
          {codeChars.map((char, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="text"
              maxLength={1}
              value={char}
              onChange={(e) => handleCodeChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={isLoading}
              aria-label={`Tecken ${i + 1} av ${CODE_LENGTH}`}
              className={cn(
                'h-14 w-12 text-center text-2xl font-mono font-bold uppercase',
                'rounded-lg border-2 bg-muted transition-all duration-150',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                displayedError && 'border-destructive focus:border-destructive focus:ring-destructive/20',
                !displayedError && char && 'border-primary/40'
              )}
            />
          ))}
        </div>
        {displayedError && (
          <p className="mt-2 text-center text-sm text-destructive">{displayedError}</p>
        )}
      </div>

      {/* Display Name Input */}
      <Input
        label="Ditt visningsnamn"
        placeholder="T.ex. Anna"
        value={displayName}
        onChange={(e) => {
          setDisplayName(e.target.value);
          setLocalError(null);
        }}
        maxLength={20}
        inputSize="lg"
        variant="filled"
        disabled={isLoading}
        hint={`${displayName.length}/20 tecken`}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isLoading}
        loadingText="Ansluter..."
        disabled={!canSubmit}
      >
        Gå med nu
        <ArrowRightIcon className="h-5 w-5" />
      </Button>
    </form>
  );
}
