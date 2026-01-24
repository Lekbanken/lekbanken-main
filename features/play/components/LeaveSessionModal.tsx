'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  ArrowLeftIcon,
  CloudArrowDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

export interface LeaveSessionModalProps {
  /** Is the modal open? */
  open: boolean;
  /** Called when user closes the modal */
  onClose: () => void;
  /** Current session status */
  status: 'draft' | 'lobby' | 'active' | 'paused' | 'locked' | 'ended';
  /** Called when user wants to go back to overview */
  onGoBack: () => void;
  /** Called when user wants to take session offline (lobby → draft) */
  onTakeOffline?: () => void;
  /** Called when user wants to end the session - navigates to sessions list after */
  onEndSession: () => void | Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

export function LeaveSessionModal({
  open,
  onClose,
  status,
  onGoBack,
  onTakeOffline,
  onEndSession,
}: LeaveSessionModalProps) {
  const t = useTranslations('play.cockpit.lobbySummary');
  const router = useRouter();

  // Show "Take Offline" for lobby, active, and paused - allows resuming later
  const canTakeOffline = (status === 'lobby' || status === 'active' || status === 'paused') && onTakeOffline;
  
  // Use different description based on status
  const takeOfflineDescription = status === 'active' || status === 'paused'
    ? t('backDialog.takeOfflineActiveDescription')
    : t('backDialog.takeOfflineDescription');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftIcon className="h-5 w-5" />
            {t('backDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('backDialog.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 mt-4">
          {/* Take Offline - show in lobby, active, paused modes */}
          {canTakeOffline && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => {
                onClose();
                onTakeOffline();
              }}
            >
              <CloudArrowDownIcon className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium">{t('backDialog.takeOffline')}</div>
                <div className="text-xs text-muted-foreground">
                  {takeOfflineDescription}
                </div>
              </div>
            </Button>
          )}

          {/* Go Back to Overview */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={() => {
              onClose();
              onGoBack();
            }}
          >
            <ArrowLeftIcon className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">{t('backDialog.goBack')}</div>
              <div className="text-xs text-muted-foreground">
                {t('backDialog.goBackDescription')}
              </div>
            </div>
          </Button>

          {/* End Session - destructive */}
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start gap-3 h-14',
              'border-destructive/50 hover:bg-destructive/10 hover:border-destructive'
            )}
            onClick={async () => {
              onClose();
              await onEndSession();
              // Navigate to sessions list after ending
              router.push('/app/play/sessions');
            }}
          >
            <XCircleIcon className="h-5 w-5 text-destructive" />
            <div className="text-left">
              <div className="font-medium text-destructive">{t('backDialog.endSession')}</div>
              <div className="text-xs text-muted-foreground">
                {t('backDialog.endSessionDescription')}
              </div>
            </div>
          </Button>
        </div>

        {/* Cancel button */}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t('backDialog.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
