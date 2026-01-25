"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PlannerPlan, PlannerBlock } from "@/types/planner";

type PreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlannerPlan;
};

function getBlockTypeLabel(type: PlannerBlock["blockType"]): string {
  switch (type) {
    case "game":
      return "Lek";
    case "pause":
      return "Paus";
    case "preparation":
      return "Förberedelse";
    case "custom":
      return "Notis";
    default:
      return "Block";
  }
}

function getBlockTypeIcon(type: PlannerBlock["blockType"]) {
  switch (type) {
    case "game":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "pause":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "preparation":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
          />
        </svg>
      );
  }
}

function getBlockColor(type: PlannerBlock["blockType"]): string {
  switch (type) {
    case "game":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "pause":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "preparation":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "custom":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

export function PreviewDialog({ open, onOpenChange, plan }: PreviewDialogProps) {
  const t = useTranslations('planner');
  const totalDuration = plan.blocks.reduce(
    (sum, block) => sum + (block.durationMinutes ?? 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {t('preview.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-6">
            <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            {plan.description && (
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            )}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {totalDuration} min
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
                  />
                </svg>
                {plan.blocks.length} block
              </span>
            </div>
          </div>

          {plan.blocks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Inga block i planen
            </div>
          ) : (
            <div className="space-y-3">
              {plan.blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`rounded-xl border p-4 ${getBlockColor(block.blockType)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-background/50 text-sm font-bold">
                      {index + 1}
                    </div>

                    {block.blockType === "game" &&
                      (block.game?.coverUrl?.startsWith("/") ||
                        block.game?.coverUrl?.startsWith("http://") ||
                        block.game?.coverUrl?.startsWith("https://") ||
                        block.game?.coverUrl?.startsWith("data:")) && (
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={block.game.coverUrl}
                          alt={block.game?.title ?? ""}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {block.blockType !== "game" && (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-background/50">
                        {getBlockTypeIcon(block.blockType)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider opacity-70">
                          {getBlockTypeLabel(block.blockType)}
                        </span>
                        {block.isOptional && (
                          <span className="rounded-full bg-background/50 px-2 py-0.5 text-xs">
                            Valfri
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-semibold">
                        {block.blockType === "game"
                          ? block.game?.title ?? "Okänd lek"
                          : block.title ?? getBlockTypeLabel(block.blockType)}
                      </h3>
                      {block.notes && (
                        <p className="mt-1 text-sm opacity-80">{block.notes}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <span className="text-lg font-bold">
                        {block.durationMinutes ?? 0}
                      </span>
                      <span className="ml-1 text-xs opacity-70">min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end border-t border-border/50 pt-4">
            <Button variant="outline" onClick={() => window.print()}>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Skriv ut
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
