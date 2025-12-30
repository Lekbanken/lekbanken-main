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
  confirmLabel = "Bekräfta",
  cancelLabel = "Avbryt",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
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
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            variant={destructive ? "destructive" : "default"}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
