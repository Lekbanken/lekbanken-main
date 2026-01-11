/**
 * TriggerKillSwitch Component
 * 
 * Emergency button to disable all triggers at once.
 * Also shows re-arm button when triggers are disabled.
 * 
 * Backlog B.3: Kill-switch for all triggers
 */

'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShieldExclamationIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import type { Trigger } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerKillSwitchProps {
  /** All triggers in the session */
  triggers: Trigger[];
  /** Callback when disabling all triggers */
  onDisableAll: () => Promise<void>;
  /** Callback when re-arming all triggers */
  onRearmAll: () => Promise<void>;
  /** Display variant */
  variant?: 'button' | 'card' | 'inline';
  /** Optional className */
  className?: string;
}

// =============================================================================
// Main Component
// =============================================================================

export function TriggerKillSwitch({
  triggers,
  onDisableAll,
  onRearmAll,
  variant = 'button',
  className,
}: TriggerKillSwitchProps) {
  const t = useTranslations('play.killSwitch');
  const tc = useTranslations('play.common');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);
  const [showConfirmRearm, setShowConfirmRearm] = useState(false);

  // Count trigger states
  const armedCount = triggers.filter((t) => t.status === 'armed' && t.enabled).length;
  const disabledCount = triggers.filter((t) => !t.enabled || t.status === 'disabled').length;
  const totalCount = triggers.length;

  // Kill switch is active when any triggers are disabled
  const isActive = disabledCount > 0;

  const handleDisableAll = async () => {
    setIsLoading(true);
    try {
      await onDisableAll();
    } finally {
      setIsLoading(false);
      setShowConfirmDisable(false);
    }
  };

  const handleRearmAll = async () => {
    setIsLoading(true);
    try {
      await onRearmAll();
    } finally {
      setIsLoading(false);
      setShowConfirmRearm(false);
    }
  };

  // Inline variant - minimal display
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isActive ? (
          <>
            <Tooltip content={t('tooltips.emergencyStopActive')}>
              <div className="flex items-center gap-1 text-destructive">
                <ShieldExclamationIcon className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {disabledCount}/{totalCount}
                </span>
              </div>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmRearm(true)}
              disabled={isLoading}
              className="h-6 px-2 text-xs"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
              ) : (
                t('reactivate')
              )}
            </Button>
          </>
        ) : (
          <>
            <Tooltip content={t('tooltips.activeTriggersCount', { count: armedCount })}>
              <div className="flex items-center gap-1 text-green-500">
                <ShieldCheckIcon className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {armedCount}/{totalCount}
                </span>
              </div>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDisable(true)}
              disabled={isLoading || armedCount === 0}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              {isLoading ? (
                <ArrowPathIcon className="h-3 w-3 animate-spin" />
              ) : (
                <BoltIcon className="h-3 w-3" />
              )}
            </Button>
          </>
        )}

        {/* Confirmation dialogs */}
        <AlertDialog open={showConfirmDisable} onOpenChange={setShowConfirmDisable}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
                {t('dialogs.activateEmergencyStop.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialogs.activateEmergencyStop.description', { count: armedCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>{tc('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisableAll}
                disabled={isLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                )}
                {t('dialogs.activateEmergencyStop.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showConfirmRearm} onOpenChange={setShowConfirmRearm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                {t('dialogs.reactivateAll.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialogs.reactivateAll.descriptionFromEmergency', { count: disabledCount })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>{tc('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRearmAll}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                )}
                {t('dialogs.reactivateAll.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Button variant
  if (variant === 'button') {
    return (
      <div className={className}>
        {isActive ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="gap-2 border-destructive text-destructive"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="h-4 w-4" />
                )}
                {t('reactivateTriggers')}
                <Badge variant="default" className="ml-1">
                  {disabledCount}
                </Badge>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                  {t('dialogs.reactivateAll.title')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dialogs.reactivateAll.description', { count: disabledCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRearmAll}>
                  {t('dialogs.reactivateAll.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Tooltip
            content={armedCount === 0
              ? t('tooltips.noActiveTriggers')
              : t('tooltips.disableAllTriggers', { count: armedCount })}
          >
            <span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isLoading || armedCount === 0}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldExclamationIcon className="h-4 w-4" />
                    )}
                    {t('emergencyStop')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
                      {t('dialogs.activateEmergencyStop.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialogs.activateEmergencyStop.description', { count: armedCount })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisableAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('dialogs.activateEmergencyStop.confirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </span>
          </Tooltip>
        )}
      </div>
    );
  }

  // Card variant
  return (
    <div
      className={`
        p-4 rounded-lg border
        ${isActive ? 'bg-destructive/10 border-destructive/50' : 'bg-card'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isActive ? (
            <ShieldExclamationIcon className="h-6 w-6 text-destructive" />
          ) : (
            <ShieldCheckIcon className="h-6 w-6 text-green-500" />
          )}
          <div>
            <div className="font-medium">
              {isActive ? t('emergencyStopActive') : t('triggersActive')}
            </div>
            <div className="text-sm text-muted-foreground">
              {isActive
                ? t('status.disabledOfTotal', { disabled: disabledCount, total: totalCount })
                : t('status.readyOfTotal', { armed: armedCount, total: totalCount })}
            </div>
          </div>
        </div>

        {isActive ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isLoading}>
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                )}
                {t('reactivate')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dialogs.reactivateAll.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dialogs.reactivateAll.descriptionShort', { count: disabledCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRearmAll}>
                  {t('dialogs.reactivateAll.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isLoading || armedCount === 0}
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                )}
                {t('emergencyStop')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
                  {t('dialogs.activateEmergencyStop.title')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dialogs.activateEmergencyStop.descriptionShort', { count: armedCount })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisableAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('dialogs.activateEmergencyStop.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Warning when active */}
      {isActive && (
        <div className="mt-3 flex items-start gap-2 p-2 rounded bg-destructive/20 text-destructive text-sm">
          <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            {t('warning')}
          </span>
        </div>
      )}
    </div>
  );
}
