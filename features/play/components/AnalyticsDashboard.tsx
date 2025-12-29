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
  return (
    <div className="space-y-4">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          title="Framsteg"
          value={`${Math.round(analytics.progressPercent)}%`}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          description={`Steg ${analytics.currentStep + 1} av ${analytics.totalSteps}`}
          variant={analytics.progressPercent >= 80 ? 'success' : 'default'}
        />
        <MetricCard
          title="Total tid"
          value={formatDuration(analytics.totalDuration)}
          icon={<ClockIcon className="h-4 w-4" />}
          description={analytics.status}
        />
        <MetricCard
          title="Pussel lösta"
          value={`${analytics.engagement.puzzlesSolved}/${analytics.engagement.totalPuzzles}`}
          icon={<PuzzlePieceIcon className="h-4 w-4" />}
          description={formatPercent(analytics.engagement.overallCompletionRate)}
          variant={analytics.engagement.overallCompletionRate >= 0.8 ? 'success' : 'default'}
        />
        <MetricCard
          title="Händelser"
          value={analytics.eventCount}
          icon={<SignalIcon className="h-4 w-4" />}
          description="Totalt loggade"
        />
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            Engagemang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Snitt tid/steg</div>
              <div className="font-semibold">{formatDuration(analytics.engagement.avgTimePerStep)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Median tid/steg</div>
              <div className="font-semibold">{formatDuration(analytics.engagement.medianTimePerStep)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ledtrådar använda</div>
              <div className="font-semibold">{analytics.engagement.totalHintsUsed}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Triggers avfyrade</div>
              <div className="font-semibold">{analytics.engagement.totalTriggerFires}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Trigger-fel</div>
              <div className={`font-semibold ${analytics.engagement.triggerErrors > 0 ? 'text-red-500' : ''}`}>
                {analytics.engagement.triggerErrors}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Signaler</div>
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
            Slutförandegrad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Total progression</span>
            <span className={getCompletionColor(analytics.engagement.overallCompletionRate)}>
              {formatPercent(analytics.engagement.overallCompletionRate)}
            </span>
          </div>
          <Progress 
            value={analytics.engagement.overallCompletionRate * 100} 
          />
          <div className="text-xs text-muted-foreground">
            {analytics.engagement.puzzlesSolved} av {analytics.engagement.totalPuzzles} pussel lösta
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
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Steg</TableHead>
            <TableHead>Tid</TableHead>
            <TableHead className="text-center">Lösta</TableHead>
            <TableHead className="text-center">Fel</TableHead>
            <TableHead className="text-center">Triggers</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stepMetrics.map((step) => (
            <TableRow key={step.stepIndex}>
              <TableCell>
                <div className="font-medium">Steg {step.stepIndex + 1}</div>
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
                    Klar
                  </Badge>
                ) : (
                  <Badge variant="outline">Pågår</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Step Duration Chart (simple bar) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tid per steg</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stepMetrics.map((step) => {
              const maxDuration = Math.max(...stepMetrics.map((s) => s.duration));
              const width = maxDuration > 0 ? (step.duration / maxDuration) * 100 : 0;
              
              return (
                <div key={step.stepIndex} className="flex items-center gap-2">
                  <span className="text-xs w-12">Steg {step.stepIndex + 1}</span>
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
    { value: 'name', label: 'Namn' },
    { value: 'time', label: 'Lösningstid' },
    { value: 'attempts', label: 'Försök' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {puzzleMetrics.filter((p) => p.solved).length} av {puzzleMetrics.length} lösta
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
              <TableHead>Pussel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Steg</TableHead>
              <TableHead className="text-center">Försök</TableHead>
              <TableHead className="text-right">Lösningstid</TableHead>
              <TableHead className="text-right">Status</TableHead>
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
                <TableCell>Steg {puzzle.stepIndex + 1}</TableCell>
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
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onExportJSON}>
        <DocumentTextIcon className="h-4 w-4 mr-1" />
        JSON
      </Button>
      <Button variant="outline" size="sm" onClick={onExportCSV}>
        <TableCellsIcon className="h-4 w-4 mr-1" />
        CSV
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
    { id: 'overview', label: 'Översikt' },
    { id: 'steps', label: 'Steg' },
    { id: 'puzzles', label: 'Pussel' },
  ];

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartBarIcon className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            {!compact && (
              <CardDescription>
                Session-prestanda och statistik
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
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span>Framsteg</span>
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
          <span>{analytics.engagement.totalTriggerFires} triggers</span>
        </div>
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-4 w-4 text-muted-foreground" />
          <span>{analytics.engagement.totalHintsUsed} ledtrådar</span>
        </div>
      </div>

      {/* Warnings */}
      {analytics.engagement.triggerErrors > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <ExclamationCircleIcon className="h-4 w-4" />
          <span>{analytics.engagement.triggerErrors} trigger-fel</span>
        </div>
      )}
    </div>
  );
}
