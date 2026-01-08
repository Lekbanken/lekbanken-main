"use client";

import { useState, useEffect } from "react";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

type Version = {
  id: string;
  versionNumber: number;
  publishedAt: string | null;
  isCurrent?: boolean;
};

type VersionTimelineProps = {
  planId: string;
  currentVersionNumber?: number;
  maxVisible?: number;
  onVersionClick?: (version: Version) => void;
  onShowAll?: () => void;
};

function formatShortDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("sv-SE", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function VersionTimeline({
  planId,
  currentVersionNumber = 1,
  maxVisible = 5,
  onVersionClick,
  onShowAll,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!planId) return;

    let cancelled = false;

    const loadVersions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/plans/${planId}/versions`);
        if (!response.ok) throw new Error("Failed to load versions");
        const data = await response.json();
        if (!cancelled) {
          setVersions(data.versions ?? []);
        }
      } catch (err) {
        console.error("Failed to load versions for timeline", err);
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
  }, [planId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Ej publicerad
      </span>
    );
  }

  // Show limited versions in timeline
  const displayVersions = versions.slice(0, maxVisible);
  const hiddenCount = versions.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {displayVersions.map((version) => {
          const isCurrent = version.versionNumber === currentVersionNumber;
          const tooltipContent = (
            <div>
              <p className="font-medium">Version {version.versionNumber}</p>
              {version.publishedAt && (
                <p className="text-muted-foreground">
                  {formatShortDate(version.publishedAt)}
                </p>
              )}
              {isCurrent && (
                <p className="text-primary">Aktuell version</p>
              )}
            </div>
          );
          
          return (
            <Tooltip key={version.id} content={tooltipContent} position="bottom">
              <button
                onClick={() => onVersionClick?.(version)}
                className={`
                  flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                  transition-colors hover:ring-2 hover:ring-primary/30
                  ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }
                `}
                aria-label={`Version ${version.versionNumber}`}
              >
                {version.versionNumber}
              </button>
            </Tooltip>
          );
        })}

        {hiddenCount > 0 && onShowAll && (
          <Tooltip content={`Visa alla ${versions.length} versioner`} position="bottom">
            <button
              onClick={onShowAll}
              className="flex h-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground hover:bg-muted/80"
              aria-label={`Visa alla ${versions.length} versioner`}
            >
              +{hiddenCount}
            </button>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
