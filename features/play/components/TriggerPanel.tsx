'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BoltIcon, PlayIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import type { SessionTrigger } from '@/types/games';
import { getConditionLabel, getActionLabel } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerPanelProps {
  /** Session triggers to display */
  triggers: SessionTrigger[];
  /** Called when a manual trigger is fired */
  onFireTrigger?: (triggerId: string) => Promise<void>;
  /** Whether controls are disabled */
  disabled?: boolean;
}

// =============================================================================
// Helper Components
// =============================================================================

function StatusBadge({ status }: { status: SessionTrigger['status'] }) {
  const variants = {
    armed: { variant: 'success' as const, label: 'Redo', dot: true },
    fired: { variant: 'warning' as const, label: 'Avfyrad', dot: false },
    disabled: { variant: 'secondary' as const, label: 'Inaktiv', dot: false },
  };

  const { variant, label, dot } = variants[status];

  return (
    <Badge variant={variant} size="sm" dot={dot}>
      {label}
    </Badge>
  );
}

// =============================================================================
// TriggerPanel Component
// =============================================================================

export function TriggerPanel({
  triggers,
  onFireTrigger,
  disabled = false,
}: TriggerPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [firingId, setFiringId] = useState<string | null>(null);

  // Stats
  const armedCount = triggers.filter((t) => t.status === 'armed').length;
  const firedCount = triggers.filter((t) => t.status === 'fired').length;
  const manualTriggers = triggers.filter(
    (t) => t.condition.type === 'manual' && t.status === 'armed'
  );

  const handleFireTrigger = async (triggerId: string) => {
    if (!onFireTrigger) return;
    setFiringId(triggerId);
    try {
      await onFireTrigger(triggerId);
    } finally {
      setFiringId(null);
    }
  };

  return (
    <Card className="p-4">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-yellow-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Triggers
          </h3>
          <Badge variant="secondary" size="sm">
            {armedCount} redo
          </Badge>
          {firedCount > 0 && (
            <Badge variant="outline" size="sm">
              {firedCount} avfyrade
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Quick-fire buttons for manual triggers (always visible) */}
          {!expanded && manualTriggers.length > 0 && (
            <div className="flex items-center gap-1">
              {manualTriggers.slice(0, 3).map((trigger) => (
                <Button
                  key={trigger.id}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleFireTrigger(trigger.id);
                  }}
                  disabled={disabled || firingId === trigger.id}
                  className="gap-1 px-2"
                  title={trigger.name}
                >
                  <PlayIcon className="h-3 w-3" />
                  {trigger.name.slice(0, 10)}
                </Button>
              ))}
              {manualTriggers.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{manualTriggers.length - 3}
                </span>
              )}
            </div>
          )}
          {expanded ? (
            <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 space-y-2">
          {triggers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga triggers konfigurerade.</p>
          ) : (
            triggers.map((trigger) => {
              const isManual = trigger.condition.type === 'manual';
              const canFire = isManual && trigger.status === 'armed' && !disabled;

              return (
                <div
                  key={trigger.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    trigger.status === 'fired' ? 'bg-muted/50' : 'bg-surface-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BoltIcon
                      className={`h-4 w-4 flex-shrink-0 ${
                        trigger.status === 'armed' ? 'text-yellow-500' : 'text-muted-foreground'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{trigger.name}</span>
                        <StatusBadge status={trigger.status} />
                        {trigger.execute_once && (
                          <Badge variant="outline" size="sm">
                            1x
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {getConditionLabel(trigger.condition.type)} → {trigger.actions.map(a => getActionLabel(a.type)).join(', ')}
                      </p>
                    </div>
                  </div>

                  {/* Fire button for manual triggers */}
                  {canFire && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => void handleFireTrigger(trigger.id)}
                      disabled={firingId === trigger.id}
                      className="gap-1 ml-2 flex-shrink-0"
                    >
                      <PlayIcon className="h-3 w-3" />
                      Avfyra
                    </Button>
                  )}

                  {/* Show fired info */}
                  {trigger.status === 'fired' && trigger.fired_at && (
                    <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      Avfyrad {new Date(trigger.fired_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}

export default TriggerPanel;
