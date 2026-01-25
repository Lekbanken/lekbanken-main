'use client';

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ExclamationTriangleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  ArchiveBoxIcon,
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
import type { OrganisationDetail } from "../../types";

type OrganisationDangerZoneProps = {
  organisation: OrganisationDetail;
  onSuspend: () => Promise<void>;
  onReactivate: () => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
};

export function OrganisationDangerZone({
  organisation,
  onSuspend,
  onReactivate,
  onArchive,
  onDelete,
}: OrganisationDangerZoneProps) {
  const t = useTranslations('admin.organisations.dangerZone');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const isSuspended = organisation.status === 'suspended';
  const isArchived = organisation.status === 'archived';
  const confirmSlug = organisation.slug || organisation.id.slice(0, 8);

  const handleDelete = async () => {
    if (deleteConfirmation !== confirmSlug) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await onArchive();
      setIsArchiveDialogOpen(false);
    } finally {
      setIsArchiving(false);
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
        {/* Suspend / Reactivate */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
          <div>
            <h4 className="text-sm font-medium">
              {isSuspended ? t('reactivateOrg') : t('suspendOrg')}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuspended
                ? t('reactivateDescription')
                : t('suspendDescription')}
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
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('archiveDescription')}
            </p>
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

        {/* Delete */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div>
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
              {t('deleteOrgPermanently')}
            </h4>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              {t('deleteWarning')}
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {t('delete')}
          </Button>
        </div>
      </CardContent>

      {/* Archive Confirmation Dialog */}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: organisation.name })}
              <br /><br />
              {t('deleteDialog.willRemove')}
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('deleteDialog.removeMemberships')}</li>
                <li>{t('deleteDialog.removeConfig')}</li>
                <li>{t('deleteDialog.removeDomains')}</li>
                <li>{t('deleteDialog.removeAudit')}</li>
              </ul>
              <br />
              <strong className="text-red-600">{t('deleteDialog.cannotBeUndone')}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium">
              {t('deleteDialog.confirmPrompt', { slug: confirmSlug })}
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={confirmSlug}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmation !== confirmSlug}
            >
              {isDeleting ? t('deleting') : t('deletePermanently')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
