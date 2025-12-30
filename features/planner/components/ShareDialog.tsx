"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  visibility: "private" | "tenant" | "public";
};

export function ShareDialog({
  open,
  onOpenChange,
  planId,
  planName: _planName,
  visibility,
}: ShareDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/app/planner/${planId}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const isShareable = visibility !== "private";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dela plan</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {!isShareable ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-50 p-4 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Privat plan
                  </p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Den här planen är privat och kan inte delas. Ändra synlighet
                    till &quot;Organisation&quot; eller &quot;Publik&quot; för att dela den.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Delningslänk
                </label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="flex-1 text-sm" />
                  <Button onClick={() => void handleCopy()} variant="outline">
                    {copied ? (
                      <>
                        <svg
                          className="mr-1.5 h-4 w-4 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Kopierad!
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Kopiera
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Synlighet:</span>{" "}
                  {visibility === "tenant" ? "Organisation" : "Publik"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {visibility === "tenant"
                    ? "Bara medlemmar i din organisation kan se denna plan."
                    : "Alla med länken kan se denna plan."}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
