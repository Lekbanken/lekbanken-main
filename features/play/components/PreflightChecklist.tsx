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
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('play.preflightChecklist');
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
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <Badge
          variant={hasErrors ? 'error' : hasWarnings ? 'warning' : 'success'}
          size="lg"
        >
          {t('itemsReady', { ready: readyCount, total: items.length })}
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
              ? t('errorMessage')
              : t('warningMessage')}
          </p>
        )}
        {canStart && (
          <p className="text-sm text-green-700">
            {t('successMessage')}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          disabled={!canStart || isStarting}
          className="shrink-0"
        >
          {isStarting ? t('starting') : t('startPlayMode')}
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
  // Extended checks (Task 1.5)
  hasSecretInstructions?: boolean;
  secretsRevealedCount?: number;
  hasTriggers?: boolean;
  triggersSnapshotted?: boolean;
  armedTriggersCount?: number;
  signalCapabilitiesTested?: boolean;
  roleMinCountsStatus?: Array<{ roleId: string; name: string; min: number; assigned: number; met: boolean }>;
}

// Type for the translate function
type TranslateFunction = (key: string, values?: Record<string, string | number>) => string;

export function buildPreflightItems(
  state: SessionChecklistState,
  actions: {
    onSnapshotRoles?: () => void;
    onAssignRoles?: () => void;
    onUnlockSecrets?: () => void;
    onTestSignals?: () => void;
  },
  t: TranslateFunction
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 1. Participants check
  items.push({
    id: 'participants',
    label: t('items.participants.label'),
    status: state.participantCount > 0 ? 'ready' : 'warning',
    detail:
      state.participantCount > 0
        ? t('items.participants.joined', { count: state.participantCount })
        : t('items.participants.noneJoined'),
  });

  // 2. Game check
  if (!state.hasGame) {
    items.push({
      id: 'game',
      label: t('items.game.label'),
      status: 'error',
      detail: t('items.game.noGame'),
    });
    return items; // Early return - can't continue without game
  }

  // 3. Roles snapshot check
  if (!state.rolesSnapshotted) {
    items.push({
      id: 'roles-snapshot',
      label: t('items.rolesSnapshot.label'),
      status: 'error',
      detail: t('items.rolesSnapshot.notCopied'),
      action: actions.onSnapshotRoles
        ? { label: t('items.rolesSnapshot.copyAction'), onClick: actions.onSnapshotRoles }
        : undefined,
    });
  } else {
    items.push({
      id: 'roles-snapshot',
      label: t('items.rolesSnapshot.label'),
      status: 'ready',
      detail: t('items.rolesSnapshot.copied', { count: state.totalRoles }),
    });

    // 4. Roles assignment check
    if (state.roleMinCountsStatus && state.roleMinCountsStatus.length > 0) {
      const minCountsMet = state.roleMinCountsStatus.every((r) => r.met);
      const someAssigned = state.rolesAssignedCount > 0;

      items.push({
        id: 'roles-assigned',
        label: t('items.rolesAssigned.label'),
        status: minCountsMet ? 'ready' : someAssigned ? 'warning' : 'pending',
        detail: minCountsMet
          ? t('items.rolesAssigned.allMinMet')
          : state.roleMinCountsStatus
              .filter((r) => !r.met)
              .map((r) => `${r.name}: ${r.assigned}/${r.min}`)
              .join(', '),
        action:
          !minCountsMet && actions.onAssignRoles
            ? { label: t('items.rolesAssigned.assignAction'), onClick: actions.onAssignRoles }
            : undefined,
      });
    } else {
      // Fallback for simpler role check
      const allAssigned =
        state.participantCount > 0 &&
        state.rolesAssignedCount >= state.participantCount;
      const someAssigned = state.rolesAssignedCount > 0;

      items.push({
        id: 'roles-assigned',
        label: t('items.rolesAssigned.label'),
        status: allAssigned ? 'ready' : someAssigned ? 'warning' : 'pending',
        detail: allAssigned
          ? t('items.rolesAssigned.allAssigned')
          : someAssigned
            ? t('items.rolesAssigned.someAssigned', { assigned: state.rolesAssignedCount, total: state.participantCount })
            : t('items.rolesAssigned.noneAssigned'),
        action:
          !allAssigned && actions.onAssignRoles
            ? { label: t('items.rolesAssigned.assignAction'), onClick: actions.onAssignRoles }
            : undefined,
      });
    }
  }

  // 5. Secrets check (if applicable)
  if (state.hasSecretInstructions) {
    const allRolesAssigned = state.rolesAssignedCount >= state.participantCount;
    const secretsRevealedCount = state.secretsRevealedCount ?? 0;

    items.push({
      id: 'secrets',
      label: t('items.secrets.label'),
      status: state.secretsUnlocked
        ? 'ready'
        : allRolesAssigned
          ? 'warning'
          : 'pending',
      detail: state.secretsUnlocked
        ? t('items.secrets.unlocked', { revealed: secretsRevealedCount, total: state.participantCount })
        : allRolesAssigned
          ? t('items.secrets.readyToUnlock')
          : t('items.secrets.assignRolesFirst'),
      action:
        !state.secretsUnlocked && allRolesAssigned && actions.onUnlockSecrets
          ? { label: t('items.secrets.unlockAction'), onClick: actions.onUnlockSecrets }
          : undefined,
    });
  }

  // 6. Artifacts check
  if (state.artifactsSnapshotted !== undefined) {
    items.push({
      id: 'artifacts',
      label: t('items.artifacts.label'),
      status: state.artifactsSnapshotted ? 'ready' : 'pending',
      detail: state.artifactsSnapshotted
        ? t('items.artifacts.ready')
        : t('items.artifacts.loading'),
    });
  }

  // 7. Triggers check
  if (state.hasTriggers) {
    items.push({
      id: 'triggers',
      label: t('items.triggers.label'),
      status: state.triggersSnapshotted ? 'ready' : 'pending',
      detail: state.triggersSnapshotted
        ? t('items.triggers.ready', { count: state.armedTriggersCount ?? 0 })
        : t('items.triggers.loading'),
    });
  }

  // 8. Signal capabilities check
  if (state.signalCapabilitiesTested !== undefined) {
    items.push({
      id: 'signals',
      label: t('items.signals.label'),
      status: state.signalCapabilitiesTested ? 'ready' : 'pending',
      detail: state.signalCapabilitiesTested
        ? t('items.signals.tested')
        : t('items.signals.notTested'),
      action:
        !state.signalCapabilitiesTested && actions.onTestSignals
          ? { label: t('items.signals.testAction'), onClick: actions.onTestSignals }
          : undefined,
    });
  }

  return items;
}
