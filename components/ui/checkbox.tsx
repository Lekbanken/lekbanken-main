'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, MinusIcon } from '@heroicons/react/20/solid';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label for the checkbox */
  label?: string;
  /** Description text */
  description?: string;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Error message */
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, indeterminate, error, className, id, checked, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('relative flex items-start', className)}>
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            className="sr-only peer"
            aria-invalid={Boolean(error)}
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border flex items-center justify-center cursor-pointer transition-colors',
              'border-border bg-background',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2',
              'peer-checked:bg-primary peer-checked:border-primary',
              'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
              error && 'border-red-500'
            )}
            onClick={() => {
              const input = document.getElementById(checkboxId!) as HTMLInputElement;
              if (input && !props.disabled) {
                input.click();
              }
            }}
          >
            {(checked || indeterminate) && (
              indeterminate ? (
                <MinusIcon className="h-3 w-3 text-primary-foreground" />
              ) : (
                <CheckIcon className="h-3 w-3 text-primary-foreground" />
              )
            )}
          </div>
        </div>
        {(label || description) && (
          <div className="ml-2 text-sm">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'font-medium text-foreground cursor-pointer',
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
            {error && (
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
