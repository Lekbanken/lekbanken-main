/**
 * AnalyticsDashboard Component
 * 
 * Displays session performance metrics and analytics.
 * Shows completion rates, timing data, and engagement metrics.
 * 
 * Backlog B.7: Analytics dashboard
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PuzzlePieceIcon,
  BoltIcon,
  LightBulbIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import type {
  SessionAnalytics,
  StepMetrics,
  PuzzleMetrics,
  UseSessionAnalyticsReturn,
} from '@/features/play/hooks/useSessionAnalytics';

// =============================================================================
// Types
// =============================================================================

export interface AnalyticsDashboardProps {
  /** Analytics hook return */
  analyticsHook: UseSessionAnalyticsReturn;
  /** Optional className */
  className?: string;
  /** Compact mode */
  compact?: boolean;
  /** Show export buttons */
  showExport?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getCompletionColor(rate: number): string {
  if (rate >= 0.8) return 'text-green-500';
  if (rate >= 0.5) return 'text-yellow-500';
  return 'text-red-500';
}

// =============================================================================
// Sub-Component: MetricCard
// =============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

function MetricCard({
  title,
  value,
  icon,
  description,
  variant = 'default',
}: MetricCardProps) {
  const variantClasses = {
    default: 'bg-muted/30',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    error: 'bg-red-500/10 border-red-500/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-Component: OverviewTab
// =============================================================================

interface OverviewTabProps {
  analytics: SessionAnalytics;
}

function OverviewTab({ analytics }: OverviewTabProps) {
  const t = useTranslations('play.cockpit.analytics');
  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title={t('progress')}
          value={`${Math.round(analytics.progressPercent)}%`}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          description={t('stepOfTotal', { current: analytics.currentStep + 1, total: analytics.totalSteps })}
          variant={analytics.progressPercent >= 80 ? 'success' : 'default'}
        />
        <MetricCard
          title={t('totalTime')}
          value={formatDuration(analytics.totalDuration)}
          icon={<ClockIcon className="h-4 w-4" />}
          description={analytics.status}
        />
        <MetricCard
          title={t('puzzlesSolved')}
          value={`${analytics.engagement.puzzlesSolved}/${analytics.engagement.totalPuzzles}`}
          icon={<PuzzlePieceIcon className="h-4 w-4" />}
          description={formatPercent(analytics.engagement.overallCompletionRate)}
          variant={analytics.engagement.overallCompletionRate >= 0.8 ? 'success' : 'default'}
        />
        <MetricCard
          title={t('events')}
          value={analytics.eventCount}
          icon={<SignalIcon className="h-4 w-4" />}
          description={t('totalLogged')}
        />
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            {t('engagement')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('avgTimePerStep')}</div>
              <div className="font-semibold">{formatDuration(analytics.engagement.avgTimePerStep)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('medianTimePerStep')}</div>
              <div className="font-semibold">{formatDuration(analytics.engagement.medianTimePerStep)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('hintsUsed')}</div>
              <div className="font-semibold">{analytics.engagement.totalHintsUsed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('triggersFired')}</div>
              <div className="font-semibold">{analytics.engagement.totalTriggerFires}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('triggerErrors')}</div>
              <div className={`font-semibold ${analytics.engagement.triggerErrors > 0 ? 'text-red-500' : ''}`}>
                {analytics.engagement.triggerErrors}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('signals')}</div>
              <div className="font-semibold">{analytics.engagement.signalsSent}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            {t('completionRate')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('totalProgression')}</span>
            <span className={getCompletionColor(analytics.engagement.overallCompletionRate)}>
              {formatPercent(analytics.engagement.overallCompletionRate)}
            </span>
          </div>
          <Progress 
            value={analytics.engagement.overallCompletionRate * 100} 
          />
          <div className="text-xs text-muted-foreground">
            {t('puzzlesOfTotal', { solved: analytics.engagement.puzzlesSolved, total: analytics.engagement.totalPuzzles })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Sub-Component: StepsTab
// =============================================================================

interface StepsTabProps {
  stepMetrics: StepMetrics[];
}

function StepsTab({ stepMetrics }: StepsTabProps) {
  const t = useTranslations('play.cockpit.analytics');
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('step')}</TableHead>
            <TableHead>{t('time')}</TableHead>
            <TableHead className="text-center">{t('solved')}</TableHead>
            <TableHead className="text-center">{t('errors')}</TableHead>
            <TableHead className="text-center">{t('triggers')}</TableHead>
            <TableHead className="text-right">{t('status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stepMetrics.map((step) => (
            <TableRow key={step.stepIndex}>
              <TableCell>
                <div className="font-medium">{t('stepNumber', { number: step.stepIndex + 1 })}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {step.stepName}
                </div>
              </TableCell>
              <TableCell>{formatDuration(step.duration)}</TableCell>
              <TableCell className="text-center">
                <span className="text-green-500">{step.puzzlesSolved}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className={step.puzzleFailures > 0 ? 'text-red-500' : ''}>
                  {step.puzzleFailures}
                </span>
              </TableCell>
              <TableCell className="text-center">{step.triggersFired}</TableCell>
              <TableCell className="text-right">
                {step.completed ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    {t('completed')}
                  </Badge>
                ) : (
                  <Badge variant="outline">{t('inProgress')}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Step Duration Chart (simple bar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('timePerStep')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stepMetrics.map((step) => {
              const maxDuration = Math.max(...stepMetrics.map((s) => s.duration));
              const width = maxDuration > 0 ? (step.duration / maxDuration) * 100 : 0;
              
              return (
                <div key={step.stepIndex} className="flex items-center gap-2">
                  <span className="text-xs w-12">{t('stepNumber', { number: step.stepIndex + 1 })}</span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-xs w-16 text-right">
                    {formatDuration(step.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Sub-Component: PuzzlesTab
// =============================================================================

interface PuzzlesTabProps {
  puzzleMetrics: PuzzleMetrics[];
}

function PuzzlesTab({ puzzleMetrics }: PuzzlesTabProps) {
  const t = useTranslations('play.cockpit.analytics');
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'attempts'>('name');

  const sortedPuzzles = [...puzzleMetrics].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return (b.solveTime ?? 0) - (a.solveTime ?? 0);
      case 'attempts':
        return b.attempts - a.attempts;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const sortOptions = [
    { value: 'name', label: t('name') },
    { value: 'time', label: t('solutionTime') },
    { value: 'attempts', label: t('attempts') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('ofSolved', { solved: puzzleMetrics.filter((p) => p.solved).length, total: puzzleMetrics.length })}
        </div>
        <Select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          options={sortOptions}
          className="w-[140px]"
        />
      </div>

      <ScrollArea maxHeight={300}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('puzzle')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('step')}</TableHead>
              <TableHead className="text-center">{t('attempts')}</TableHead>
              <TableHead className="text-right">{t('solutionTime')}</TableHead>
              <TableHead className="text-right">{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPuzzles.map((puzzle) => (
              <TableRow key={puzzle.artifactId}>
                <TableCell className="font-medium">{puzzle.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {puzzle.type}
                  </Badge>
                </TableCell>
                <TableCell>{t('stepNumber', { number: puzzle.stepIndex + 1 })}</TableCell>
                <TableCell className="text-center">{puzzle.attempts}</TableCell>
                <TableCell className="text-right">
                  {puzzle.solveTime ? formatDuration(puzzle.solveTime) : '–'}
                </TableCell>
                <TableCell className="text-right">
                  {puzzle.solved ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 inline" />
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// =============================================================================
// Sub-Component: ExportButtons
// =============================================================================

interface ExportButtonsProps {
  onExportJSON: () => void;
  onExportCSV: () => void;
}

function ExportButtons({ onExportJSON, onExportCSV }: ExportButtonsProps) {
  const t = useTranslations('play.cockpit.analytics');
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExportJSON}>
        <DocumentTextIcon className="h-4 w-4 mr-1" />
        {t('export.json')}
      </Button>
      <Button variant="outline" size="sm" onClick={onExportCSV}>
        <TableCellsIcon className="h-4 w-4 mr-1" />
        {t('export.csv')}
      </Button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AnalyticsDashboard({
  analyticsHook,
  className,
  compact = false,
  showExport = true,
}: AnalyticsDashboardProps) {
  const t = useTranslations('play.cockpit.analytics');
  const { analytics, exportJSON, exportCSV } = analyticsHook;
  const [activeTab, setActiveTab] = useState('overview');

  const handleExportJSON = () => {
    const data = exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-analytics-${analytics.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const data = exportCSV();
    const blob = new Blob([data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-analytics-${analytics.sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'steps', label: t('tabs.steps') },
    { id: 'puzzles', label: t('tabs.puzzles') },
  ];

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartBarIcon className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            {!compact && (
              <CardDescription>
                {t('description')}
              </CardDescription>
            )}
          </div>
          {showExport && (
            <ExportButtons
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
            />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-4">
          <TabPanel id="overview" activeTab={activeTab}>
            <OverviewTab analytics={analytics} />
          </TabPanel>

          <TabPanel id="steps" activeTab={activeTab}>
            <StepsTab stepMetrics={analytics.stepMetrics} />
          </TabPanel>

          <TabPanel id="puzzles" activeTab={activeTab}>
            <PuzzlesTab puzzleMetrics={analytics.puzzleMetrics} />
          </TabPanel>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Compact Summary Card
// =============================================================================

export interface AnalyticsSummaryCardProps {
  analytics: SessionAnalytics;
  className?: string;
}

export function AnalyticsSummaryCard({
  analytics,
  className,
}: AnalyticsSummaryCardProps) {
  const t = useTranslations('play.cockpit.analytics');
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span>{t('progress')}</span>
          <span className="font-medium">{Math.round(analytics.progressPercent)}%</span>
        </div>
        <Progress value={analytics.progressPercent} />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-muted-foreground" />
          <span>{formatDuration(analytics.totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <PuzzlePieceIcon className="h-4 w-4 text-muted-foreground" />
          <span>
            {analytics.engagement.puzzlesSolved}/{analytics.engagement.totalPuzzles}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BoltIcon className="h-4 w-4 text-muted-foreground" />
          <span>{t('triggersCount', { count: analytics.engagement.totalTriggerFires })}</span>
        </div>
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-4 w-4 text-muted-foreground" />
          <span>{t('hints', { count: analytics.engagement.totalHintsUsed })}</span>
        </div>
      </div>

      {/* Warnings */}
      {analytics.engagement.triggerErrors > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{t('triggerErrorsCount', { count: analytics.engagement.triggerErrors })}</span>
        </div>
      )}
    </div>
  );
}
