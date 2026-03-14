"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchPlanVersions, type VersionWithCurrent } from "../api";

type VersionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  versionsOverride?: VersionWithCurrent[];
};

const BCP47_MAP: Record<string, string> = { sv: 'sv-SE', no: 'nb-NO', en: 'en-US' };

function formatDate(dateString: string | null, locale: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const bcp47 = BCP47_MAP[locale] ?? locale;
  return new Intl.DateTimeFormat(bcp47, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function VersionsDialog({
  open,
  onOpenChange,
  planId,
  versionsOverride,
}: VersionsDialogProps) {
  const t = useTranslations('planner');
  const locale = useLocale();
  const [versions, setVersions] = React.useState<VersionWithCurrent[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !planId) return;

    if (versionsOverride) {
      setVersions(versionsOverride);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadVersions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchPlanVersions(planId);
        if (!cancelled) {
          setVersions(result.versions);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load versions", err);
          setError(t('versions.loadError'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadVersions();

    return () => {
      cancelled = true;
    };
  }, [open, planId, versionsOverride, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('versions.title')}</DialogTitle>
        </DialogHeader>

        <div className="mt-4 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg
                className="h-5 w-5 animate-spin text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
          )}

          {error && (
            <p className="py-8 text-center text-sm text-red-500">{error}</p>
          )}

          {!isLoading && !error && versions.length === 0 && (
            <div className="py-8 text-center">
              <svg
                className="mx-auto h-10 w-10 text-muted-foreground/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('versions.noPublishedVersionsYet')}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {t('versions.publishToCreateVersion')}
              </p>
            </div>
          )}

          {!isLoading && !error && versions.length > 0 && (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`rounded-xl border p-4 transition ${
                    version.isCurrent
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        v{version.versionNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {t('versions.versionNumber', { number: version.versionNumber })}
                          {version.isCurrent && (
                            <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                              {t('versions.current')}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(version.publishedAt, locale)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      {t('versions.totalTime', { minutes: version.totalTimeMinutes })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
