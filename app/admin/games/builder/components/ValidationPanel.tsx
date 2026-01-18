'use client';

/**
 * ValidationPanel Component
 * 
 * Displays validation errors and warnings for the Game Builder.
 * Task 2.6 - Session Cockpit Architecture
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import type { ValidationResult, ValidationError } from '../utils/validateGameRefs';

// =============================================================================
// Types
// =============================================================================

interface ValidationPanelProps {
  result: ValidationResult;
  onNavigateToItem?: (section: string, itemId: string) => void;
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

function ValidationItem({
  error,
  onNavigate,
}: {
  error: ValidationError;
  onNavigate?: () => void;
}) {
  const t = useTranslations('admin.games.builder');
  const isError = error.severity === 'error';
  
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        isError
          ? 'bg-destructive/5 border-destructive/20'
          : 'bg-warning/5 border-warning/20'
      )}
    >
      {isError ? (
        <ExclamationCircleIcon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      ) : (
        <ExclamationTriangleIcon className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className={cn(
              'font-medium text-sm',
              isError ? 'text-destructive' : 'text-warning'
            )}>
              {error.message}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {error.section === 'triggers' && t('validation.itemPrefix.triggers')}
              {error.section === 'artifacts' && t('validation.itemPrefix.artifacts')}
              {error.section === 'steps' && t('validation.itemPrefix.steps')}
              {error.section === 'phases' && t('validation.itemPrefix.phases')}
              {error.section === 'roles' && t('validation.itemPrefix.roles')}
              <span className="font-medium">{error.itemName}</span>
            </div>
            {error.suggestion && (
              <div className="text-xs text-muted-foreground mt-1 italic">
                💡 {error.suggestion}
              </div>
            )}
          </div>
          {onNavigate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigate}
              className="text-xs flex-shrink-0"
            >
              {t('validation.navigate')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ValidationPanel({
  result,
  onNavigateToItem,
  className,
}: ValidationPanelProps) {
  const t = useTranslations('admin.games.builder');
  const [isExpanded, setIsExpanded] = useState(true);
  
  const { errors, warnings, isValid } = result;
  const hasIssues = errors.length > 0 || warnings.length > 0;
  
  // Group by section
  const grouped = useMemo(() => {
    const groups: Record<string, ValidationError[]> = {};
    
    for (const error of [...errors, ...warnings]) {
      const section = error.section;
      if (!groups[section]) groups[section] = [];
      groups[section].push(error);
    }
    
    return groups;
  }, [errors, warnings]);
  
  // If no issues, show success state
  if (!hasIssues) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
          <div>
            <div className="font-medium text-foreground">{t('validation.emptyTitle')}</div>
            <div className="text-sm text-muted-foreground">
              {t('validation.emptyDescription')}
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors',
          !isValid && 'bg-destructive/5'
        )}
      >
        <div className="flex items-center gap-3">
          {!isValid ? (
            <ExclamationCircleIcon className="h-6 w-6 text-destructive" />
          ) : (
            <ExclamationTriangleIcon className="h-6 w-6 text-warning" />
          )}
          <div className="text-left">
            <div className="font-medium text-foreground">
              {t('validation.headerTitle')}
            </div>
            <div className="text-sm text-muted-foreground">
              {errors.length > 0 && (
                <span className="text-destructive font-medium">
                  {t('validation.count.errors', { count: errors.length })}
                </span>
              )}
              {errors.length > 0 && warnings.length > 0 && t('validation.separator')}
              {warnings.length > 0 && (
                <span className="text-warning">
                  {t('validation.count.warnings', { count: warnings.length })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <Badge variant="destructive" size="sm">
              {t('validation.count.errors', { count: errors.length })}
            </Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="warning" size="sm">
              {t('validation.count.warnings', { count: warnings.length })}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-4">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {section === 'triggers' && t('validation.section.triggers')}
                {section === 'artifacts' && t('validation.section.artifacts')}
                {section === 'steps' && t('validation.section.steps')}
                {section === 'phases' && t('validation.section.phases')}
                {section === 'roles' && t('validation.section.roles')}
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <ValidationItem
                    key={item.id}
                    error={item}
                    onNavigate={
                      onNavigateToItem
                        ? () => onNavigateToItem(item.section, item.itemId)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          
          {!isValid && (
            <div className="pt-2 border-t">
              <div className="text-sm text-destructive font-medium">
                {t('validation.publishBlocked')}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
