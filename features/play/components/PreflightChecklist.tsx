/**
 * PreflightChecklist Component
 *
 * Shows a readiness checklist before starting a session.
 * Helps host verify all prerequisites are met before entering active play.
 */

'use client';

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export type ChecklistItemStatus = 'ready' | 'warning' | 'error' | 'pending';

export interface ChecklistItem {
  id: string;
  label: string;
  status: ChecklistItemStatus;
  detail?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface PreflightChecklistProps {
  /** List of checklist items */
  items: ChecklistItem[];
  /** Can the session be started? */
  canStart: boolean;
  /** Called when user clicks start */
  onStart: () => void;
  /** Is start action pending? */
  isStarting?: boolean;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function StatusIcon({ status }: { status: ChecklistItemStatus }) {
  switch (status) {
    case 'ready':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    case 'error':
      return <XCircleIcon className="h-5 w-5 text-destructive" />;
    case 'pending':
    default:
      return (
        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
      );
  }
}

function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        item.status === 'ready' && 'border-green-200 bg-green-50/50',
        item.status === 'warning' && 'border-yellow-200 bg-yellow-50/50',
        item.status === 'error' && 'border-destructive/20 bg-destructive/5',
        item.status === 'pending' && 'border-border bg-muted/30'
      )}
    >
      <StatusIcon status={item.status} />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{item.label}</div>
        {item.detail && (
          <div className="mt-0.5 text-sm text-muted-foreground">{item.detail}</div>
        )}
      </div>
      {item.action && (
        <Button
          variant="outline"
          size="sm"
          onClick={item.action.onClick}
          className="shrink-0"
        >
          {item.action.label}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PreflightChecklist({
  items,
  canStart,
  onStart,
  isStarting = false,
  className,
}: PreflightChecklistProps) {
  const readyCount = items.filter((i) => i.status === 'ready').length;
  const hasErrors = items.some((i) => i.status === 'error');
  const hasWarnings = items.some((i) => i.status === 'warning');

  return (
    <Card
      className={cn(
        'p-6 border-2',
        canStart ? 'border-green-200 bg-green-50/30' : 'border-yellow-200 bg-yellow-50/30',
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Redo att starta?
          </h2>
          <p className="text-sm text-muted-foreground">
            Kontrollera att allt är på plats innan du startar spelläget.
          </p>
        </div>
        <Badge
          variant={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
          size="lg"
        >
          {readyCount} / {items.length} klara
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <ChecklistItemRow key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        {!canStart && (
          <p className="text-sm text-muted-foreground">
            {hasErrors
              ? 'Åtgärda felen ovan för att kunna starta.'
              : 'Kontrollera varningarna innan du startar.'}
          </p>
        )}
        {canStart && (
          <p className="text-sm text-green-700">
            ✓ Allt ser bra ut! Du kan starta sessionen.
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          disabled={!canStart || isStarting}
          className="shrink-0"
        >
          {isStarting ? 'Startar...' : 'Starta spelläge'}
        </Button>
      </div>
    </Card>
  );
}

// =============================================================================
// Helper: Build checklist items from session state
// =============================================================================

export interface SessionChecklistState {
  participantCount: number;
  hasGame: boolean;
  rolesSnapshotted: boolean;
  rolesAssignedCount: number;
  totalRoles: number;
  artifactsSnapshotted?: boolean;
  secretsUnlocked?: boolean;
}

export function buildPreflightItems(
  state: SessionChecklistState,
  actions: {
    onSnapshotRoles?: () => void;
    onAssignRoles?: () => void;
  }
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Participants check
  items.push({
    id: 'participants',
    label: 'Deltagare',
    status: state.participantCount > 0 ? 'ready' : 'warning',
    detail:
      state.participantCount > 0
        ? `${state.participantCount} deltagare har gått med`
        : 'Inga deltagare har gått med ännu',
  });

  // Game check
  if (!state.hasGame) {
    items.push({
      id: 'game',
      label: 'Spel kopplat',
      status: 'error',
      detail: 'Sessionen har inget spel kopplat',
    });
  }

  // Roles snapshot check
  if (state.hasGame) {
    if (!state.rolesSnapshotted) {
      items.push({
        id: 'roles-snapshot',
        label: 'Roller kopierade',
        status: 'error',
        detail: 'Kopiera roller från spelet innan du kan tilldela dem',
        action: actions.onSnapshotRoles
          ? { label: 'Kopiera roller', onClick: actions.onSnapshotRoles }
          : undefined,
      });
    } else {
      items.push({
        id: 'roles-snapshot',
        label: 'Roller kopierade',
        status: 'ready',
        detail: `${state.totalRoles} roller kopierade från spelet`,
      });
    }

    // Roles assignment check
    if (state.rolesSnapshotted) {
      const allAssigned =
        state.participantCount > 0 &&
        state.rolesAssignedCount >= state.participantCount;
      const someAssigned = state.rolesAssignedCount > 0;

      items.push({
        id: 'roles-assigned',
        label: 'Roller tilldelade',
        status: allAssigned ? 'ready' : someAssigned ? 'warning' : 'pending',
        detail: allAssigned
          ? 'Alla deltagare har fått roller'
          : someAssigned
            ? `${state.rolesAssignedCount} av ${state.participantCount} deltagare har roller`
            : 'Ingen deltagare har tilldelats roll än',
        action:
          !allAssigned && actions.onAssignRoles
            ? { label: 'Tilldela roller', onClick: actions.onAssignRoles }
            : undefined,
      });
    }
  }

  return items;
}
