/**
 * TimeBankLivePanel Component
 * 
 * Live display and control panel for TimeBank during Director Mode.
 * Shows current balance, recent changes, and allows manual adjustments.
 * 
 * Task 4.6 - Session Cockpit Architecture
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import {
  ClockIcon,
  PlusIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import type { TimeBankEntry, TimeBankRules } from '@/types/session-cockpit';

// =============================================================================
// Types
// =============================================================================

/** TimeBank state for the live panel */
export interface TimeBankState {
  balance: number;
  paused: boolean;
  ledger: TimeBankEntry[];
  rules: TimeBankRules;
}

export interface TimeBankLivePanelProps {
  /** Current TimeBank state */
  state: TimeBankState;
  /** Apply a delta to the balance */
  onApplyDelta: (delta: number, reason?: string) => void;
  /** Pause/resume the TimeBank */
  onTogglePause: () => void;
  /** Reset to initial balance */
  onReset?: () => void;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const QUICK_ADJUSTMENTS = [
  { delta: 30, label: '+30s' },
  { delta: 60, label: '+1m' },
  { delta: 300, label: '+5m' },
  { delta: -30, label: '-30s' },
  { delta: -60, label: '-1m' },
  { delta: -300, label: '-5m' },
];

// =============================================================================
// Helper: Format Time
// =============================================================================

const formatTime = (seconds: number, showSign = false): string => {
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const sign = seconds < 0 ? '-' : (showSign && seconds > 0 ? '+' : '');
  
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${sign}${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
};

// =============================================================================
// Helper: Get Balance Status
// =============================================================================

type BalanceStatus = 'critical' | 'warning' | 'normal' | 'good';

const getBalanceStatus = (balance: number, maxBalance: number): BalanceStatus => {
  if (balance <= 0) return 'critical';
  if (balance < 60) return 'warning';
  if (balance > maxBalance * 0.8) return 'good';
  return 'normal';
};

// =============================================================================
// Sub-Component: BalanceDisplay
// =============================================================================

interface BalanceDisplayProps {
  balance: number;
  maxBalance: number;
  paused: boolean;
  compact?: boolean;
}

function BalanceDisplay({ balance, maxBalance, paused, compact }: BalanceDisplayProps) {
  const status = getBalanceStatus(balance, maxBalance);
  const percentage = Math.min(100, Math.max(0, (balance / maxBalance) * 100));
  
  const statusColors: Record<BalanceStatus, string> = {
    critical: 'text-red-500',
    warning: 'text-yellow-500',
    normal: 'text-foreground',
    good: 'text-green-500',
  };
  
  const progressColors: Record<BalanceStatus, string> = {
    critical: 'bg-red-500',
    warning: 'bg-yellow-500',
    normal: 'bg-primary',
    good: 'bg-green-500',
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ClockIcon className={`h-4 w-4 ${statusColors[status]}`} />
        <span className={`font-mono font-bold ${statusColors[status]}`}>
          {formatTime(balance)}
        </span>
        {paused && (
          <Badge variant="outline" className="text-xs">
            <PauseIcon className="h-3 w-3 mr-1" />
            Pausad
          </Badge>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Main balance display */}
      <div className="flex items-center justify-center gap-3">
        <div className={`
          text-5xl font-mono font-bold tabular-nums
          ${statusColors[status]}
          ${paused ? 'opacity-50' : ''}
          ${status === 'critical' && !paused ? 'animate-pulse' : ''}
        `}>
          {formatTime(balance)}
        </div>
        {paused && (
          <Badge variant="outline" className="h-8">
            <PauseIcon className="h-4 w-4 mr-1" />
            Pausad
          </Badge>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${progressColors[status]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {status === 'critical' && (
          <>
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <span className="text-red-500 font-medium">Kritisk tidsnivå!</span>
          </>
        )}
        {status === 'warning' && (
          <>
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-500">Tiden är snart slut</span>
          </>
        )}
        {status === 'good' && (
          <span className="text-green-500">
            <ArrowTrendingUpIcon className="h-4 w-4 inline mr-1" />
            Bra tidsmarginal
          </span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-Component: LedgerHistory
// =============================================================================

interface LedgerHistoryProps {
  ledger: TimeBankEntry[];
  maxItems?: number;
}

function LedgerHistory({ ledger, maxItems = 5 }: LedgerHistoryProps) {
  if (ledger.length === 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-2">
        Inga justeringar ännu
      </div>
    );
  }
  
  // Get most recent entries
  const recentEntries = ledger.slice(-maxItems).reverse();
  
  return (
    <div className="space-y-1">
      {recentEntries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
        >
          <div className="flex items-center gap-2 min-w-0">
            {entry.deltaSeconds >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3 text-green-500 flex-shrink-0" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3 text-red-500 flex-shrink-0" />
            )}
            <span className="truncate text-muted-foreground">
              {entry.reason || 'Manuell justering'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`font-mono font-medium ${entry.deltaSeconds >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatTime(entry.deltaSeconds, true)}
            </span>
            <span className="text-muted-foreground/50">
              {new Date(entry.createdAt).toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TimeBankLivePanel({
  state,
  onApplyDelta,
  onTogglePause,
  onReset,
  compact = false,
  className,
}: TimeBankLivePanelProps) {
  const [customDelta, setCustomDelta] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  
  const handleQuickAdjust = useCallback((delta: number) => {
    onApplyDelta(delta, `Snabbjustering: ${formatTime(delta, true)}`);
  }, [onApplyDelta]);
  
  const handleCustomAdjust = useCallback(() => {
    const delta = parseInt(customDelta);
    if (isNaN(delta) || delta === 0) return;
    
    onApplyDelta(delta, customReason || 'Manuell justering');
    setCustomDelta('');
    setCustomReason('');
  }, [customDelta, customReason, onApplyDelta]);
  
  // Calculate recent trend
  const recentTrend = useMemo(() => {
    const recentEntries = state.ledger.slice(-5);
    const totalDelta = recentEntries.reduce((sum: number, e: TimeBankEntry) => sum + e.deltaSeconds, 0);
    return totalDelta;
  }, [state.ledger]);
  
  // Compact mode
  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <BalanceDisplay
          balance={state.balance}
          maxBalance={state.rules.maxBalance ?? 600}
          paused={state.paused}
          compact
        />
        
        <div className="flex items-center gap-1">
          <Tooltip content="+30 sekunder">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAdjust(30)}
              className="h-7 w-7 p-0"
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content="-30 sekunder">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleQuickAdjust(-30)}
              className="h-7 w-7 p-0"
            >
              <MinusIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
          
          <Tooltip content={state.paused ? 'Återuppta' : 'Pausa'}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePause}
              className="h-7 w-7 p-0"
            >
              {state.paused ? (
                <PlayIcon className="h-4 w-4" />
              ) : (
                <PauseIcon className="h-4 w-4" />
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
    );
  }
  
  // Full panel
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="h-5 w-5" />
            TimeBank
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onTogglePause}
              className={state.paused ? 'bg-yellow-500/10' : ''}
            >
              {state.paused ? (
                <>
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Återuppta
                </>
              ) : (
                <>
                  <PauseIcon className="h-4 w-4 mr-1" />
                  Pausa
                </>
              )}
            </Button>
            
            {onReset && (
              <Tooltip content="Återställ till start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="h-8 w-8 p-0"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance display */}
        <BalanceDisplay
          balance={state.balance}
          maxBalance={state.rules.maxBalance ?? 600}
          paused={state.paused}
        />
        
        {/* Quick adjustments */}
        <div className="grid grid-cols-6 gap-2">
          {QUICK_ADJUSTMENTS.map((adj) => (
            <Tooltip key={adj.delta} content={`${adj.delta > 0 ? 'Lägg till' : 'Dra av'} ${Math.abs(adj.delta)} sekunder`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAdjust(adj.delta)}
                className={`
                  font-mono text-xs
                  ${adj.delta > 0 ? 'hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/50' : ''}
                  ${adj.delta < 0 ? 'hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/50' : ''}
                `}
              >
                {adj.label}
              </Button>
            </Tooltip>
          ))}
        </div>
        
        {/* Custom adjustment */}
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Anpassad justering
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={customDelta}
              onChange={(e) => setCustomDelta(e.target.value)}
              placeholder="Sekunder (+/-)"
              className="w-24"
            />
            <Input
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Anledning (valfri)"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleCustomAdjust}
              disabled={!customDelta || parseInt(customDelta) === 0}
            >
              <BoltIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* History toggle & display */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-4 w-4" />
              Historik
              <Badge variant="outline" className="text-xs">
                {state.ledger.length}
              </Badge>
            </span>
            <span>{showHistory ? '−' : '+'}</span>
          </Button>
          
          {showHistory && (
            <div className="pt-2">
              <LedgerHistory ledger={state.ledger} maxItems={8} />
            </div>
          )}
        </div>
        
        {/* Trend indicator */}
        {state.ledger.length >= 3 && (
          <div className={`
            flex items-center justify-center gap-2 text-xs p-2 rounded
            ${recentTrend >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}
          `}>
            {recentTrend >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            <span>
              Senaste trend: {formatTime(recentTrend, true)} (senaste 5 händelser)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
