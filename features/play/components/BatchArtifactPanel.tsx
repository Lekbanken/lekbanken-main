/**
 * BatchArtifactPanel Component
 * 
 * UI for selecting and performing batch operations on artifacts.
 * Supports filtering, multi-select, and progress tracking.
 * 
 * Backlog B.5: Batch artifact operations
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RectangleStackIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
  KeyIcon,
  QuestionMarkCircleIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  Squares2X2Icon,
  CircleStackIcon,
  CursorArrowRaysIcon,
  CheckIcon,
  MinusIcon,
  StopIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type {
  ArtifactInfo,
  BatchOperation,
  UseBatchArtifactsReturn,
} from '@/features/play/hooks/useBatchArtifacts';
import {
  PRESET_FILTERS,
  OPERATION_LABELS,
} from '@/features/play/hooks/useBatchArtifacts';

// =============================================================================
// Types
// =============================================================================

export interface BatchArtifactPanelProps {
  /** Batch artifacts hook return */
  batch: UseBatchArtifactsReturn;
  /** All artifacts */
  artifacts: ArtifactInfo[];
  /** Optional className */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const ARTIFACT_TYPE_ICONS: Record<string, React.ReactNode> = {
  keypad: <KeyIcon className="h-4 w-4" />,
  riddle: <QuestionMarkCircleIcon className="h-4 w-4" />,
  cipher: <CircleStackIcon className="h-4 w-4" />,
  tile_puzzle: <Squares2X2Icon className="h-4 w-4" />,
  logic_grid: <Squares2X2Icon className="h-4 w-4" />,
  hotspot: <CursorArrowRaysIcon className="h-4 w-4" />,
  card: <DocumentTextIcon className="h-4 w-4" />,
  document: <DocumentTextIcon className="h-4 w-4" />,
  image: <PhotoIcon className="h-4 w-4" />,
  audio: <SpeakerWaveIcon className="h-4 w-4" />,
  default: <PuzzlePieceIcon className="h-4 w-4" />,
};

const OPERATION_CONFIGS: Array<{
  operation: BatchOperation;
  icon: React.ReactNode;
  variant: 'default' | 'primary' | 'destructive' | 'outline';
  confirmRequired?: boolean;
}> = [
  { operation: 'reveal', icon: <EyeIcon className="h-4 w-4" />, variant: 'default' },
  { operation: 'hide', icon: <EyeSlashIcon className="h-4 w-4" />, variant: 'outline' },
  { operation: 'reset', icon: <ArrowPathIcon className="h-4 w-4" />, variant: 'outline', confirmRequired: true },
  { operation: 'unlock', icon: <LockOpenIcon className="h-4 w-4" />, variant: 'outline' },
  { operation: 'lock', icon: <LockClosedIcon className="h-4 w-4" />, variant: 'outline' },
  { operation: 'solve', icon: <CheckCircleIcon className="h-4 w-4" />, variant: 'default', confirmRequired: true },
];

// =============================================================================
// Sub-Component: ArtifactRow
// =============================================================================

interface ArtifactRowProps {
  artifact: ArtifactInfo;
  isSelected: boolean;
  onToggle: () => void;
}

function ArtifactRow({ artifact, isSelected, onToggle }: ArtifactRowProps) {
  const icon = ARTIFACT_TYPE_ICONS[artifact.type] || ARTIFACT_TYPE_ICONS.default;

  return (
    <div
      className={`
        flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
        ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'}
      `}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onChange={onToggle} />
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{artifact.name}</div>
        <div className="text-xs text-muted-foreground">{artifact.type}</div>
      </div>
      <div className="flex items-center gap-1">
        {artifact.visible ? (
          <EyeIcon className="h-3 w-3 text-green-500" />
        ) : (
          <EyeSlashIcon className="h-3 w-3 text-muted-foreground" />
        )}
        {artifact.locked && <LockClosedIcon className="h-3 w-3 text-yellow-500" />}
        {artifact.solved && <CheckCircleIcon className="h-3 w-3 text-green-500" />}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: SelectionHeader
// =============================================================================

interface SelectionHeaderProps {
  batch: UseBatchArtifactsReturn;
  totalCount: number;
}

function SelectionHeader({ batch, totalCount }: SelectionHeaderProps) {
  const allSelected = batch.selectedCount === totalCount && totalCount > 0;
  const someSelected = batch.selectedCount > 0 && batch.selectedCount < totalCount;

  const handleToggleAll = () => {
    if (allSelected || someSelected) {
      batch.clearSelection();
    } else {
      batch.selectAll();
    }
  };

  return (
    <div className="flex items-center gap-3 pb-3 border-b">
      <button
        onClick={handleToggleAll}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {allSelected ? (
          <CheckIcon className="h-4 w-4 text-primary" />
        ) : someSelected ? (
          <MinusIcon className="h-4 w-4 text-primary" />
        ) : (
          <StopIcon className="h-4 w-4" />
        )}
        {allSelected ? 'Avmarkera alla' : 'Markera alla'}
      </button>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Snabbval
            <ChevronDownIcon className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {PRESET_FILTERS.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onClick={() => batch.selectByFilter(preset.filter)}
            >
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {batch.filterOptions.types.map((type) => (
            <DropdownMenuItem
              key={type}
              onClick={() => batch.selectByFilter({ type: 'type', value: type })}
            >
              Alla {type}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Badge variant="default">
        {batch.selectedCount} av {totalCount}
      </Badge>
    </div>
  );
}

// =============================================================================
// Sub-Component: OperationButtons
// =============================================================================

interface OperationButtonsProps {
  batch: UseBatchArtifactsReturn;
  onOperation: (operation: BatchOperation) => void;
}

function OperationButtons({ batch, onOperation }: OperationButtonsProps) {
  const disabled = batch.selectedCount === 0 || batch.isProcessing;

  return (
    <div className="flex flex-wrap gap-2 pt-3 border-t">
      {OPERATION_CONFIGS.map((config) => (
        <Button
          key={config.operation}
          variant={config.variant}
          size="sm"
          disabled={disabled}
          onClick={() => onOperation(config.operation)}
          className="gap-1"
        >
          {config.icon}
          {OPERATION_LABELS[config.operation]}
        </Button>
      ))}
    </div>
  );
}

// =============================================================================
// Sub-Component: ProgressOverlay
// =============================================================================

interface ProgressOverlayProps {
  isProcessing: boolean;
  progress: number;
  selectedCount: number;
}

function ProgressOverlay({ isProcessing, progress, selectedCount }: ProgressOverlayProps) {
  const t = useTranslations('play.batchArtifactPanel');
  if (!isProcessing) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
      <div className="text-center space-y-3">
        <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('processing')}</p>
          <p className="text-xs text-muted-foreground">
            {t('progressCount', { done: Math.round((progress / 100) * selectedCount), total: selectedCount })}
          </p>
        </div>
        <Progress value={progress} className="w-48" />
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: ResultSummary
// =============================================================================

interface ResultSummaryProps {
  result: UseBatchArtifactsReturn['lastResult'];
}

function ResultSummary({ result }: ResultSummaryProps) {
  const t = useTranslations('play.batchArtifactPanel');
  if (!result) return null;

  const hasErrors = result.failed.length > 0;

  return (
    <div
      className={`
        p-3 rounded-lg text-sm
        ${hasErrors ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600'}
      `}
    >
      <div className="flex items-center gap-2">
        {hasErrors ? (
          <ExclamationTriangleIcon className="h-4 w-4" />
        ) : (
          <CheckCircleIcon className="h-4 w-4" />
        )}
        <span>
          {hasErrors
            ? t('resultWithErrors', { operation: OPERATION_LABELS[result.operation], count: result.successful.length, failed: result.failed.length })
            : t('resultSuccess', { operation: OPERATION_LABELS[result.operation], count: result.successful.length })}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function BatchArtifactPanel({
  batch,
  artifacts,
  className,
  compact = false,
}: BatchArtifactPanelProps) {
  const t = useTranslations('play.batchArtifactPanel');
  const [confirmOperation, setConfirmOperation] = useState<BatchOperation | null>(null);

  const handleOperation = (operation: BatchOperation) => {
    const config = OPERATION_CONFIGS.find((c) => c.operation === operation);
    if (config?.confirmRequired) {
      setConfirmOperation(operation);
    } else {
      batch.performBatchOperation(operation);
    }
  };

  const handleConfirm = () => {
    if (confirmOperation) {
      batch.performBatchOperation(confirmOperation);
      setConfirmOperation(null);
    }
  };

  return (
    <Card className={`relative ${className}`}>
      <ProgressOverlay
        isProcessing={batch.isProcessing}
        progress={batch.progress}
        selectedCount={batch.selectedCount}
      />

      <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
        <CardTitle className="flex items-center gap-2 text-base">
          <RectangleStackIcon className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        {!compact && (
          <CardDescription>
            {t('description')}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <SelectionHeader batch={batch} totalCount={artifacts.length} />

        <ScrollArea maxHeight={compact ? '200px' : '300px'}>
          <div className="space-y-1 pr-3">
            {artifacts.map((artifact) => (
              <ArtifactRow
                key={artifact.id}
                artifact={artifact}
                isSelected={batch.isSelected(artifact.id)}
                onToggle={() => batch.toggleSelection(artifact.id)}
              />
            ))}
          </div>
        </ScrollArea>

        <OperationButtons batch={batch} onOperation={handleOperation} />

        <ResultSummary result={batch.lastResult} />
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmOperation !== null}
        onOpenChange={() => setConfirmOperation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDescription', {
                operation: confirmOperation && OPERATION_LABELS[confirmOperation].toLowerCase(),
                count: batch.selectedCount,
                plural: batch.selectedCount !== 1 ? 'er' : ''
              })}
              {confirmOperation === 'reset' && (
                <span className="block mt-2 text-yellow-600">
                  {t('confirmReset')}
                </span>
              )}
              {confirmOperation === 'solve' && (
                <span className="block mt-2 text-yellow-600">
                  {t('confirmSolve')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
