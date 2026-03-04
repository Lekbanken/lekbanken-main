"use client";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  /** The trigger element that opens the dialog */
  trigger: ReactNode;
  /** Dialog title */
  title: string;
  /** Dialog description text */
  description: string;
  /** Text for the confirm button */
  confirmLabel?: string;
  /** Text for the cancel button */
  cancelLabel?: string;
  /** Whether the confirm action is destructive (shows red button) */
  destructive?: boolean;
  /** Callback when user confirms */
  onConfirm: () => void | Promise<void>;
};

/**
 * A reusable confirmation dialog for destructive actions.
 * Wraps AlertDialog with a simpler API.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations('planner');
  const resolvedConfirmLabel = confirmLabel ?? t('confirm.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('confirm.cancel');
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{resolvedCancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            variant={destructive ? "destructive" : "default"}
          >
            {resolvedConfirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
