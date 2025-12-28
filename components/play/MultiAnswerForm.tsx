'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import {
  normalizeRiddleAnswer,
  type MultiAnswerConfig,
  type MultiAnswerState,
  type CheckItem,
  type CheckResult,
} from '@/types/puzzle-modules';

// =============================================================================
// Multi-Answer Form Component
// =============================================================================

export interface MultiAnswerFormProps {
  /** Configuration */
  config: MultiAnswerConfig;
  /** Current state (for controlled mode) */
  state?: MultiAnswerState;
  /** Called when all checks pass */
  onComplete?: () => void;
  /** Called on each check result */
  onCheckResult?: (checkId: string, passed: boolean, value?: string) => void;
  /** Called on any change */
  onChange?: (state: MultiAnswerState) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

/**
 * MultiAnswerForm - Multiple verification checks in sequence
 */
export function MultiAnswerForm({
  config,
  state: externalState,
  onComplete,
  onCheckResult,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: MultiAnswerFormProps) {
  // Internal state
  const [internalState, setInternalState] = useState<MultiAnswerState>({
    results: [],
    isComplete: false,
    passedCount: 0,
    totalCount: config.checks.length,
  });

  // Form values (local input state)
  const [values, setValues] = useState<Record<string, string>>({});

  // Use external state if provided
  const state = externalState ?? internalState;

  const updateState = useCallback((newState: MultiAnswerState) => {
    if (!externalState) {
      setInternalState(newState);
    }
    onChange?.(newState);
  }, [externalState, onChange]);

  const getCheckResult = (checkId: string): CheckResult | undefined => {
    return state.results.find(r => r.checkId === checkId);
  };

  const handleCheckSubmit = useCallback((check: CheckItem, value: string) => {
    if (disabled) return;

    let passed = false;

    switch (check.type) {
      case 'text':
      case 'code':
        if (check.expected) {
          const normalized = normalizeRiddleAnswer(value, check.normalizeMode ?? 'fuzzy');
          const expectedNormalized = normalizeRiddleAnswer(check.expected, check.normalizeMode ?? 'fuzzy');
          passed = normalized === expectedNormalized;
        }
        break;
      case 'select':
        passed = check.expected ? value === check.expected : Boolean(value);
        break;
      case 'toggle':
        passed = value === 'true';
        break;
    }

    const newResult: CheckResult = {
      checkId: check.id,
      passed,
      submittedValue: value,
      timestamp: new Date().toISOString(),
    };

    const existingResults = state.results.filter(r => r.checkId !== check.id);
    const newResults = [...existingResults, newResult];
    const passedCount = newResults.filter(r => r.passed).length;
    const isComplete = config.requireAll !== false
      ? passedCount === config.checks.length
      : passedCount > 0;

    const newState: MultiAnswerState = {
      results: newResults,
      isComplete,
      passedCount,
      totalCount: config.checks.length,
    };

    updateState(newState);
    onCheckResult?.(check.id, passed, value);

    if (isComplete) {
      onComplete?.();
    }
  }, [config, state.results, disabled, updateState, onCheckResult, onComplete]);

  const sizeStyles = {
    sm: { input: 'h-9 text-sm', gap: 'gap-3' },
    md: { input: 'h-11 text-base', gap: 'gap-4' },
    lg: { input: 'h-14 text-lg', gap: 'gap-5' },
  };

  const styles = sizeStyles[size];

  // Complete state
  if (state.isComplete) {
    return (
      <div className={cn('flex flex-col items-center gap-4 p-6', className)}>
        <CheckCircleIcon className="h-12 w-12 text-green-500" />
        <p className="text-lg font-medium text-green-500">Alla kontroller godkända!</p>
        <p className="text-sm text-muted-foreground">
          {state.passedCount}/{state.totalCount} klarade
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', styles.gap, className)}>
      {/* Progress indicator */}
      {config.showProgress !== false && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Framsteg</span>
          <span className="font-medium">
            {state.passedCount}/{state.totalCount}
          </span>
        </div>
      )}

      {/* Check items */}
      {config.checks.map((check) => {
        const result = getCheckResult(check.id);
        const isPassed = result?.passed === true;
        const isFailed = result?.passed === false;
        const currentValue = values[check.id] ?? '';

        return (
          <CheckItemInput
            key={check.id}
            check={check}
            value={currentValue}
            onChange={(val) => setValues(prev => ({ ...prev, [check.id]: val }))}
            onSubmit={() => handleCheckSubmit(check, currentValue)}
            isPassed={isPassed}
            isFailed={isFailed}
            disabled={disabled || isPassed}
            size={size}
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// Check Item Input Component
// =============================================================================

interface CheckItemInputProps {
  check: CheckItem;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isPassed: boolean;
  isFailed: boolean;
  disabled: boolean;
  size: 'sm' | 'md' | 'lg';
}

function CheckItemInput({
  check,
  value,
  onChange,
  onSubmit,
  isPassed,
  isFailed,
  disabled,
  size,
}: CheckItemInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const sizeStyles = {
    sm: { input: 'h-9 text-sm', button: 'h-9 px-3' },
    md: { input: 'h-11 text-base', button: 'h-11 px-4' },
    lg: { input: 'h-14 text-lg', button: 'h-14 px-6' },
  };

  const styles = sizeStyles[size];

  const statusIcon = isPassed ? (
    <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
  ) : isFailed ? (
    <XCircleIcon className="h-5 w-5 text-destructive flex-shrink-0" />
  ) : null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        isPassed && 'border-green-500/30 bg-green-500/5',
        isFailed && 'border-destructive/30 bg-destructive/5',
        !isPassed && !isFailed && 'border-border bg-muted/30'
      )}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium">{check.label}</label>
        {statusIcon}
      </div>

      {/* Input based on type */}
      <form onSubmit={handleSubmit}>
        {check.type === 'text' && (
          <div className="flex gap-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Skriv svar..."
              disabled={disabled}
              className={cn(styles.input, 'flex-1')}
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={disabled || !value.trim()}
              className={styles.button}
            >
              Kontrollera
            </Button>
          </div>
        )}

        {check.type === 'code' && (
          <div className="flex gap-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              placeholder="Ange kod..."
              disabled={disabled}
              className={cn(styles.input, 'flex-1 font-mono tracking-widest')}
              autoComplete="off"
              autoCapitalize="characters"
            />
            <Button
              type="submit"
              disabled={disabled || !value.trim()}
              className={styles.button}
            >
              Verifiera
            </Button>
          </div>
        )}

        {check.type === 'select' && check.options && (
          <div className="flex gap-2">
            <Select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              options={[
                { value: '', label: 'Välj...' },
                ...check.options.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })),
              ]}
              placeholder="Välj..."
            />
            <Button
              type="submit"
              disabled={disabled || !value}
              className={styles.button}
            >
              Bekräfta
            </Button>
          </div>
        )}

        {check.type === 'toggle' && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {check.hint ?? 'Bekräfta'}
            </span>
            <Switch
              checked={value === 'true'}
              onCheckedChange={(checked) => {
                onChange(checked ? 'true' : 'false');
                if (checked) {
                  // Auto-submit on toggle
                  setTimeout(() => onSubmit(), 100);
                }
              }}
              disabled={disabled}
            />
          </div>
        )}
      </form>

      {/* Hint */}
      {check.hint && check.type !== 'toggle' && (
        <p className="mt-2 text-xs text-muted-foreground">{check.hint}</p>
      )}
    </div>
  );
}

// =============================================================================
// Hook for Multi-Answer State Management
// =============================================================================

export interface UseMultiAnswerOptions {
  config: MultiAnswerConfig;
  onComplete?: () => void;
}

export interface UseMultiAnswerReturn {
  state: MultiAnswerState;
  submitCheck: (checkId: string, value: string) => boolean;
  reset: () => void;
}
