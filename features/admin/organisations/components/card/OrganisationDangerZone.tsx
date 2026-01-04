'use client';

import { useState } from "react";
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
          <CardTitle className="text-base font-semibold text-red-600">Danger Zone</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suspend / Reactivate */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
          <div>
            <h4 className="text-sm font-medium">
              {isSuspended ? 'Återaktivera organisation' : 'Stäng av organisation'}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuspended
                ? 'Återställ åtkomst för alla medlemmar.'
                : 'Tillfälligt inaktivera åtkomst för alla medlemmar.'}
            </p>
          </div>
          {isSuspended ? (
            <Button variant="outline" onClick={onReactivate}>
              <PlayCircleIcon className="h-4 w-4 mr-2" />
              Återaktivera
            </Button>
          ) : (
            <Button variant="outline" onClick={onSuspend} disabled={isArchived}>
              <PauseCircleIcon className="h-4 w-4 mr-2" />
              Stäng av
            </Button>
          )}
        </div>

        {/* Archive */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/40">
          <div>
            <h4 className="text-sm font-medium">Arkivera organisation</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Markera som arkiverad. Medlemmar förlorar åtkomst men data bevaras.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsArchiveDialogOpen(true)}
            disabled={isArchived}
          >
            <ArchiveBoxIcon className="h-4 w-4 mr-2" />
            Arkivera
          </Button>
        </div>

        {/* Delete */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
          <div>
            <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
              Radera organisation permanent
            </h4>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Denna åtgärd kan inte ångras. All data kommer att raderas.
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Radera
          </Button>
        </div>
      </CardContent>

      {/* Archive Confirmation Dialog */}
      <Dialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arkivera organisation?</DialogTitle>
            <DialogDescription>
              <strong>{organisation.name}</strong> kommer att arkiveras. Alla medlemmar förlorar 
              åtkomst men data bevaras. Du kan återaktivera organisationen senare.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArchiveDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? 'Arkiverar...' : 'Arkivera'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Radera organisation permanent</DialogTitle>
            <DialogDescription>
              Du håller på att permanent radera <strong>{organisation.name}</strong>.
              <br /><br />
              Detta kommer att:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Ta bort alla medlemskap</li>
                <li>Ta bort all konfiguration</li>
                <li>Ta bort alla domäner</li>
                <li>Ta bort all audit-historik</li>
              </ul>
              <br />
              <strong className="text-red-600">Denna åtgärd kan inte ångras.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium">
              Skriv <code className="bg-muted px-1 rounded">{confirmSlug}</code> för att bekräfta:
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
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmation !== confirmSlug}
            >
              {isDeleting ? 'Raderar...' : 'Radera permanent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
