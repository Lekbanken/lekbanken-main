'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ExclamationTriangleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ArchiveBoxIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import type { OrganisationDetail } from "../../types";
import { anonymizeTenant, restoreTenant, purgeTenantNow } from "../../anonymization.server";

type OrganisationDangerZoneProps = {
  organisation: OrganisationDetail;
  onSuspend: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onRefresh: () => void;
};

export function OrganisationDangerZone({
  organisation,
  onSuspend,
  onReactivate,
  onArchive,
  onRefresh,
}: OrganisationDangerZoneProps) {
  const t = useTranslations('admin.organisations.dangerZone');
  const { success, error: toastError } = useToast();

  // Archive dialog
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Anonymize dialog
  const [isAnonymizeDialogOpen, setIsAnonymizeDialogOpen] = useState(false);
  const [anonymizeConfirm, setAnonymizeConfirm] = useState('');
  const [anonymizeReason, setAnonymizeReason] = useState('');
  const [isAnonymizing, setIsAnonymizing] = useState(false);

  // Restore dialog
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Purge dialog
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  const isSuspended = organisation.status === 'suspended';
  const isArchived = organisation.status === 'archived';
  const isAnonymized = organisation.status === 'anonymized';

  // Calculate days remaining until auto-purge
  const daysUntilPurge = organisation.purgeAfter
    ? Math.max(0, Math.ceil((new Date(organisation.purgeAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await onArchive();
      setIsArchiveDialogOpen(false);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAnonymize = async () => {
    if (anonymizeConfirm.trim() !== 'ANONYMIZE') return;
    setIsAnonymizing(true);
    try {
      const result = await anonymizeTenant(organisation.id, anonymizeReason || undefined);
      if (!result.success) {
        toastError(result.error ?? t('anonymizeFailed'));
        return;
      }
      success(t('anonymizeSuccess'));
      setIsAnonymizeDialogOpen(false);
      setAnonymizeConfirm('');
      setAnonymizeReason('');
      onRefresh();
    } catch {
      toastError(t('anonymizeFailed'));
    } finally {
      setIsAnonymizing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restoreTenant(organisation.id);
      if (!result.success) {
        toastError(result.error ?? t('restoreFailed'));
        return;
      }
      success(t('restoreSuccess'));
      setIsRestoreDialogOpen(false);
      onRefresh();
    } catch {
      toastError(t('restoreFailed'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePurge = async () => {
    if (purgeConfirm.trim() !== 'DELETE=TRUE') return;
    setIsPurging(true);
    try {
      const result = await purgeTenantNow(organisation.id);
      if (!result.success) {
        toastError(result.error ?? t('purgeFailed'));
        return;
      }
      success(t('purgeSuccess'));
      setIsPurgeDialogOpen(false);
      // Navigate away — org is gone
      window.location.href = '/admin/organisations';
    } catch {
      toastError(t('purgeFailed'));
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <CardTitle className="text-base font-semibold text-red-600">{t('title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ── Normal state actions (not anonymized) ── */}
        {!isAnonymized && (
          <>
            {/* Suspend / Reactivate */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
              <div>
                <h4 className="text-sm font-medium">
                  {isSuspended ? t('reactivateOrg') : t('suspendOrg')}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isSuspended ? t('reactivateDescription') : t('suspendDescription')}
                </p>
              </div>
              {isSuspended ? (
                <Button variant="outline" onClick={onReactivate}>
                  <PlayCircleIcon className="h-4 w-4 mr-2" />
                  {t('reactivate')}
                </Button>
              ) : (
                <Button variant="outline" onClick={onSuspend} disabled={isArchived}>
                  <PauseCircleIcon className="h-4 w-4 mr-2" />
                  {t('suspend')}
                </Button>
              )}
            </div>

            {/* Archive */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
              <div>
                <h4 className="text-sm font-medium">{t('archiveOrg')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{t('archiveDescription')}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsArchiveDialogOpen(true)}
                disabled={isArchived}
              >
                <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                {t('archive')}
              </Button>
            </div>

            {/* Anonymize */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
              <div>
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                  {t('anonymizeOrg')}
                </h4>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  {t('anonymizeDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsAnonymizeDialogOpen(true)}
              >
                <ShieldExclamationIcon className="h-4 w-4 mr-2" />
                {t('anonymize')}
              </Button>
            </div>
          </>
        )}

        {/* ── Anonymized state actions ── */}
        {isAnonymized && (
          <>
            {/* Status banner */}
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('anonymizedBanner')}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {daysUntilPurge !== null && daysUntilPurge > 0
                  ? t('purgeCountdown', { days: daysUntilPurge })
                  : t('purgeOverdue')}
              </p>
            </div>

            {/* Restore */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
              <div>
                <h4 className="text-sm font-medium">{t('restoreOrg')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{t('restoreDescription')}</p>
              </div>
              <Button variant="outline" onClick={() => setIsRestoreDialogOpen(true)}>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {t('restore')}
              </Button>
            </div>

            {/* Hard delete now */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
              <div>
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                  {t('purgeNow')}
                </h4>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  {t('purgeDescription')}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsPurgeDialogOpen(true)}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {t('purge')}
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* ── Archive Confirmation Dialog ── */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('archiveDialog.title')}</DialogTitle>
            <DialogDescription>
              <strong>{organisation.name}</strong> {t('archiveDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? t('archiving') : t('archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Anonymize Confirmation Dialog ── */}
      <Dialog open={isAnonymizeDialogOpen} onOpenChange={(open) => {
        setIsAnonymizeDialogOpen(open);
        if (!open) { setAnonymizeConfirm(''); setAnonymizeReason(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('anonymizeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('anonymizeDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">
                {t('anonymizeDialog.warning')}
              </p>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>{t('anonymizeDialog.willDo')}</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>{t('anonymizeDialog.scrubPii')}</li>
                <li>{t('anonymizeDialog.revokeMemberships')}</li>
                <li>{t('anonymizeDialog.backupVault')}</li>
                <li>{t('anonymizeDialog.autoPurge')}</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium">{t('anonymizeDialog.reasonLabel')}</label>
              <Input
                value={anonymizeReason}
                onChange={(e) => setAnonymizeReason(e.target.value)}
                placeholder={t('anonymizeDialog.reasonPlaceholder')}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('anonymizeDialog.confirmLabel')}</label>
              <Input
                value={anonymizeConfirm}
                onChange={(e) => setAnonymizeConfirm(e.target.value)}
                placeholder="ANONYMIZE"
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnonymizeDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnonymize}
              disabled={isAnonymizing || anonymizeConfirm.trim() !== 'ANONYMIZE'}
            >
              {isAnonymizing ? t('anonymizing') : t('anonymize')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Confirmation Dialog ── */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('restoreDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('restoreDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            <p>{t('restoreDialog.info')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? t('restoring') : t('restore')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purge (Hard Delete) Confirmation Dialog ── */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={(open) => {
        setIsPurgeDialogOpen(open);
        if (!open) setPurgeConfirm('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('purgeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('purgeDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {t('purgeDialog.warning')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">{t('purgeDialog.confirmLabel')}</label>
              <Input
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                placeholder="DELETE=TRUE"
                className="mt-1 font-mono"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPurgeDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={isPurging || purgeConfirm.trim() !== 'DELETE=TRUE'}
            >
              {isPurging ? t('purging') : t('purge')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
