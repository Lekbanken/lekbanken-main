/**
 * ReadinessIndicator Component
 * 
 * Visual indicator showing session readiness percentage with
 * detailed breakdown by category.
 * 
 * Backlog B.4: Confidence indicator ("95% ready")
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
  DocumentTextIcon,
  BoltIcon,
  PuzzlePieceIcon,
  RadioIcon,
  CogIcon,
  ChartBarSquareIcon,
  MinusCircleIcon,
} from '@heroicons/react/24/outline';
import type {
  ReadinessCheck,
  ReadinessCategory,
  UseSessionReadinessReturn,
} from '@/features/play/hooks/useSessionReadiness';
import { READINESS_CATEGORY_LABELS } from '@/features/play/hooks/useSessionReadiness';

// =============================================================================
// Types
// =============================================================================

export interface ReadinessIndicatorProps {
  /** Readiness data from useSessionReadiness */
  readiness: UseSessionReadinessReturn;
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'inline';
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_ICONS: Record<ReadinessCategory, React.ReactNode> = {
  participants: <UsersIcon className="h-4 w-4" />,
  content: <DocumentTextIcon className="h-4 w-4" />,
  triggers: <BoltIcon className="h-4 w-4" />,
  artifacts: <PuzzlePieceIcon className="h-4 w-4" />,
  signals: <RadioIcon className="h-4 w-4" />,
  configuration: <CogIcon className="h-4 w-4" />,
};

const STATUS_ICONS: Record<ReadinessCheck['status'], React.ReactNode> = {
  pass: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
  warning: <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />,
  fail: <XCircleIcon className="h-4 w-4 text-red-500" />,
  skip: <MinusCircleIcon className="h-4 w-4 text-muted-foreground" />,
};

const COLOR_CLASSES = {
  green: {
    bg: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500',
    light: 'bg-green-500/10',
  },
  yellow: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-600',
    border: 'border-yellow-500',
    light: 'bg-yellow-500/10',
  },
  red: {
    bg: 'bg-red-500',
    text: 'text-red-600',
    border: 'border-red-500',
    light: 'bg-red-500/10',
  },
};

// =============================================================================
// Sub-Component: CheckRow
// =============================================================================

interface CheckRowProps {
  check: ReadinessCheck;
}

function CheckRow({ check }: CheckRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {STATUS_ICONS[check.status]}
      <span className="flex-1 text-sm">{check.name}</span>
      {check.status !== 'skip' && (
        <span className="text-xs text-muted-foreground">
          {check.current}/{check.target}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Component: CategorySection
// =============================================================================

interface CategorySectionProps {
  category: ReadinessCategory;
  checks: ReadinessCheck[];
}

function CategorySection({ category, checks }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  if (checks.length === 0) return null;
  
  const passCount = checks.filter((c) => c.status === 'pass').length;
  const hasIssues = checks.some((c) => c.status === 'fail' || c.status === 'warning');
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2 transition-colors">
        {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        {CATEGORY_ICONS[category]}
        <span className="font-medium text-sm flex-1 text-left">
          {READINESS_CATEGORY_LABELS[category]}
        </span>
        <Badge variant={hasIssues ? 'outline' : 'default'} className="text-xs">
          {passCount}/{checks.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-8 pr-2">
        {checks.map((check) => (
          <CheckRow key={check.id} check={check} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// Variant: Inline (just the percentage badge)
// =============================================================================

function InlineIndicator({ readiness, className }: ReadinessIndicatorProps) {
  const colors = COLOR_CLASSES[readiness.readinessColor];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${colors.border} ${className}`}
        >
          <ChartBarSquareIcon className={`h-4 w-4 ${colors.text}`} />
          <span className={colors.text}>{readiness.readinessPercent}%</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">{readiness.readinessLabel}</span>
            <Badge className={colors.bg}>{readiness.readinessPercent}%</Badge>
          </div>
          <Progress value={readiness.readinessPercent} className="h-2" />
          <p className="text-sm text-muted-foreground">{readiness.summary}</p>
          
          {readiness.criticalIssues.length > 0 && (
            <div className="space-y-1 pt-2 border-t">
              <p className="text-xs font-medium text-red-600">Kritiska problem:</p>
              {readiness.criticalIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="h-3 w-3 text-red-500" />
                  {issue.details}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Variant: Compact (progress bar with popover)
// =============================================================================

function CompactIndicator({ readiness, className }: ReadinessIndicatorProps) {
  const colors = COLOR_CLASSES[readiness.readinessColor];
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`cursor-pointer ${className}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium flex items-center gap-2">
              <ChartBarSquareIcon className={`h-4 w-4 ${colors.text}`} />
              {readiness.readinessLabel}
            </span>
            <span className={`text-sm font-bold ${colors.text}`}>
              {readiness.readinessPercent}%
            </span>
          </div>
          <Progress value={readiness.readinessPercent} className="h-2" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="start">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{readiness.summary}</p>
          
          <div className="space-y-1 pt-2 border-t">
            {Object.entries(readiness.checksByCategory).map(([cat, checks]) => (
              <CategorySection
                key={cat}
                category={cat as ReadinessCategory}
                checks={checks}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Variant: Detailed (full card)
// =============================================================================

function DetailedIndicator({ readiness, className }: ReadinessIndicatorProps) {
  const colors = COLOR_CLASSES[readiness.readinessColor];
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChartBarSquareIcon className={`h-5 w-5 ${colors.text}`} />
            Sessionsberedskap
          </CardTitle>
          <Badge className={`${colors.bg} text-white`}>
            {readiness.readinessPercent}%
          </Badge>
        </div>
        <CardDescription>{readiness.readinessLabel}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <Progress value={readiness.readinessPercent} className="h-3" />
        
        {/* Summary */}
        <p className="text-sm">{readiness.summary}</p>
        
        {/* Critical issues */}
        {readiness.criticalIssues.length > 0 && (
          <div className={`p-3 rounded-lg ${COLOR_CLASSES.red.light}`}>
            <p className="text-sm font-medium text-red-600 mb-2">
              Måste åtgärdas innan start:
            </p>
            <div className="space-y-1">
              {readiness.criticalIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-2 text-sm">
                  <XCircleIcon className="h-4 w-4 text-red-500" />
                  {issue.details}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Warnings */}
        {readiness.warnings.length > 0 && (
          <div className={`p-3 rounded-lg ${COLOR_CLASSES.yellow.light}`}>
            <p className="text-sm font-medium text-yellow-600 mb-2">
              Rekommenderas att åtgärda:
            </p>
            <div className="space-y-1">
              {readiness.warnings.map((warning) => (
                <div key={warning.id} className="flex items-center gap-2 text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                  {warning.details}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Category breakdown */}
        <div className="space-y-1 pt-2 border-t">
          {Object.entries(readiness.checksByCategory).map(([cat, checks]) => (
            <CategorySection
              key={cat}
              category={cat as ReadinessCategory}
              checks={checks}
            />
          ))}
        </div>
        
        {/* Can start indicator */}
        <div className="pt-3 border-t">
          {readiness.canStart ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">Redo att starta session</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="h-5 w-5" />
              <span className="font-medium">Kan inte starta - åtgärda kritiska problem</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ReadinessIndicator({
  readiness,
  variant = 'compact',
  className,
}: ReadinessIndicatorProps) {
  switch (variant) {
    case 'inline':
      return <InlineIndicator readiness={readiness} className={className} />;
    case 'compact':
      return <CompactIndicator readiness={readiness} className={className} />;
    case 'detailed':
      return <DetailedIndicator readiness={readiness} className={className} />;
  }
}
