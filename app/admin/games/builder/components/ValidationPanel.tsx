'use client';

/**
 * ValidationPanel Component
 * 
 * Displays validation errors and warnings for the Game Builder.
 * 
 * SPRINT 2: Updated to use ResolveResult from lib/builder/resolver
 * SPRINT 3: Fixed gate semantics, entity accessors, stable sorting
 * @see docs/builder/SPRINT3_CONSOLIDATION_PLAN.md
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
import type { ResolveResult } from '@/lib/builder/resolver';
import type { BuilderError, EntityType, BuilderGate } from '@/types/builder-error';

// =============================================================================
// Types
// =============================================================================

interface ValidationPanelProps {
  result: ResolveResult;
  onNavigateToItem?: (section: string, itemId: string) => void;
  className?: string;
}

// =============================================================================
// Entity Accessors (robust fallback: root OR meta)
// =============================================================================

function getEntityType(e: BuilderError): EntityType | undefined {
  // Support both root-level and meta-level entityType
  return (e as { entityType?: EntityType }).entityType ?? e.meta?.entityType;
}

function getEntityId(e: BuilderError): string | undefined {
  // Support both root-level and meta-level entityId
  return (e as { entityId?: string }).entityId ?? e.meta?.entityId;
}

// Helper to map entityType to section name for navigation
function entityTypeToSection(entityType: EntityType | undefined): string {
  switch (entityType) {
    case 'step': return 'steps';
    case 'phase': return 'phases';
    case 'artifact': return 'artifacts';
    case 'trigger': return 'triggers';
    case 'role': return 'roles';
    case 'core': return 'core';
    default: return 'unknown';
  }
}

// =============================================================================
// Stable Sorting (prevents UI jitter)
// =============================================================================

const GATE_RANK: Record<BuilderGate, number> = { draft: 1, playable: 2, publish: 3 };
const SEVERITY_RANK: Record<string, number> = { error: 1, warning: 2, info: 3 };

function stableSort(items: BuilderError[]): BuilderError[] {
  return [...items].sort((a, b) => 
    (GATE_RANK[a.gate] ?? 9) - (GATE_RANK[b.gate] ?? 9) ||
    (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
    a.code.localeCompare(b.code) ||
    a.path.localeCompare(b.path)
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ValidationItem({
  error,
  onNavigate,
}: {
  error: BuilderError;
  onNavigate?: () => void;
}) {
  const t = useTranslations('admin.games.builder');
  const isError = error.severity === 'error';
  const section = entityTypeToSection(getEntityType(error));
  
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
              {section === 'triggers' && t('validation.itemPrefix.triggers')}
              {section === 'artifacts' && t('validation.itemPrefix.artifacts')}
              {section === 'steps' && t('validation.itemPrefix.steps')}
              {section === 'phases' && t('validation.itemPrefix.phases')}
              {section === 'roles' && t('validation.itemPrefix.roles')}
              {section === 'core' && t('validation.itemPrefix.core', { defaultValue: 'Grundinfo: ' })}
              <span className="font-medium font-mono text-xs">{error.path}</span>
            </div>
            <div className="text-xs text-muted-foreground/70 mt-0.5 font-mono">
              {error.code} ({error.gate})
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
  
  // =========================================================================
  // GATE SEMANTICS (SPRINT 3 FIX)
  // - isDraftOk:    draft gate passed (structure valid)
  // - isPlayableOk: playable gate passed (can test/publish)
  // - publishBlocked should show when !isPlayableOk, not !isDraftOk
  // =========================================================================
  const errors = result.errors;  // Trust contract: all are severity='error'
  const warnings = result.warnings;
  const isDraftOk = result.isGatePassed('draft');
  const isPlayableOk = result.isGatePassed('playable');
  const hasIssues = errors.length > 0 || warnings.length > 0;
  
  // Group by entity type with stable sorting
  const grouped = useMemo(() => {
    const groups: Record<string, BuilderError[]> = {};
    
    for (const error of [...errors, ...warnings]) {
      const section = entityTypeToSection(getEntityType(error));
      if (!groups[section]) groups[section] = [];
      groups[section].push(error);
    }
    
    // Apply stable sort to each group
    for (const section of Object.keys(groups)) {
      groups[section] = stableSort(groups[section]);
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
          !isPlayableOk && 'bg-destructive/5',
          isPlayableOk && !isDraftOk && 'bg-warning/5'
        )}
      >
        <div className="flex items-center gap-3">
          {!isPlayableOk ? (
            <ExclamationCircleIcon className="h-6 w-6 text-destructive" />
          ) : warnings.length > 0 ? (
            <ExclamationTriangleIcon className="h-6 w-6 text-warning" />
          ) : (
            <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
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
                {section === 'core' && t('validation.section.core', { defaultValue: 'Grundinfo' })}
                {section === 'unknown' && 'Övrigt'}
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  const entityId = getEntityId(item);
                  return (
                    <ValidationItem
                      key={entityId ? `${item.code}-${entityId}-${item.path}` : `${item.code}-${item.path}`}
                      error={item}
                      onNavigate={
                        onNavigateToItem && entityId
                          ? () => onNavigateToItem(section, entityId)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
          
          {!isPlayableOk && (
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
