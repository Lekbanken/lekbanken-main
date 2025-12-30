"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "./StatusBadge";
import type { PlannerPlan, PlannerVisibility } from "@/types/planner";

// Inline icons to avoid lucide-react dependency issues
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>
);
const HistoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);
const Trash2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);
const MoreVerticalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
);
const Share2Icon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
);

interface ExtendedCapabilities {
  canDelete: boolean;
  canPublish: boolean;
  canSetVisibility: boolean;
  canViewHistory: boolean;
  canShare: boolean;
  canExport: boolean;
}

interface PlanHeaderBarProps {
  plan: PlannerPlan;
  capabilities: ExtendedCapabilities;
  totalDuration: number;
  blockCount: number;
  hasBlocks: boolean;
  isPlanPublished: boolean;
  onPublish: () => void;
  onChangeVisibility: (visibility: PlannerVisibility) => void;
  onOpenVersions: () => void;
  onPreview: () => void;
  onShare: () => void;
  onExport: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
  isSaving?: boolean;
}

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Privat" },
  { value: "tenant", label: "Organisation" },
  { value: "public", label: "Publik" },
];

const visibilityLabels: Record<PlannerVisibility, string> = {
  private: "Privat",
  tenant: "Organisation",
  public: "Publik",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function PlanHeaderBar({
  plan,
  capabilities,
  totalDuration,
  blockCount,
  hasBlocks,
  isPlanPublished,
  onPublish,
  onChangeVisibility,
  onOpenVersions,
  onPreview,
  onShare,
  onExport,
  onDelete,
  isPublishing = false,
  isSaving = false,
}: PlanHeaderBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const showPublishButton =
    capabilities.canPublish && (plan.status === "draft" || plan.status === "modified");

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={plan.status} size="sm" />

        {capabilities.canSetVisibility ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {visibilityLabels[plan.visibility]}
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {VISIBILITY_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onChangeVisibility(option.value as PlannerVisibility)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Badge variant="outline" size="sm">
            {visibilityLabels[plan.visibility]}
          </Badge>
        )}

        <span className="text-sm text-muted-foreground">
          {blockCount} block &middot; {formatDuration(totalDuration)}
        </span>

        {isSaving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LoaderIcon />
            Sparar...
          </span>
        )}
      </div>

      <div className="hidden flex-wrap gap-2 md:flex">
        {capabilities.canViewHistory && (
          <Button variant="outline" size="sm" onClick={onOpenVersions}>
            <HistoryIcon />
            <span className="ml-1.5">Versioner</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onPreview} disabled={!hasBlocks}>
          <EyeIcon />
          <span className="ml-1.5">Förhandsgranska</span>
        </Button>
        {capabilities.canShare && (
          <Button variant="outline" size="sm" onClick={onShare} disabled={!isPlanPublished}>
            <Share2Icon />
            <span className="ml-1.5">Dela</span>
          </Button>
        )}
        {capabilities.canExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={!hasBlocks}>
            <DownloadIcon />
            <span className="ml-1.5">Exportera</span>
          </Button>
        )}
        {showPublishButton && (
          <Button onClick={onPublish} disabled={isPublishing} size="sm" className="gap-1.5">
            {isPublishing ? (
              <>
                <LoaderIcon />
                Publicerar...
              </>
            ) : (
              <>
                <SendIcon />
                Publicera
              </>
            )}
          </Button>
        )}
        {capabilities.canDelete && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <span className="sr-only">Fler alternativ</span>
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon />
                <span className="ml-2">Ta bort plan</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap gap-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Åtgärder
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {capabilities.canViewHistory && (
              <DropdownMenuItem onClick={onOpenVersions}>
                <HistoryIcon />
                Versioner
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onPreview} disabled={!hasBlocks}>
              <EyeIcon />
              Förhandsgranska
            </DropdownMenuItem>
            {capabilities.canShare && (
              <DropdownMenuItem onClick={onShare} disabled={!isPlanPublished}>
                <Share2Icon />
                Dela
              </DropdownMenuItem>
            )}
            {capabilities.canExport && (
              <DropdownMenuItem onClick={onExport} disabled={!hasBlocks}>
                <DownloadIcon />
                Exportera
              </DropdownMenuItem>
            )}
            {capabilities.canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2Icon />
                  Ta bort plan
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {showPublishButton && (
          <Button onClick={onPublish} disabled={isPublishing} size="sm" className="gap-1.5">
            {isPublishing ? (
              <>
                <LoaderIcon />
                Publicerar...
              </>
            ) : (
              <>
                <SendIcon />
                Publicera
              </>
            )}
          </Button>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort &quot;{plan.name}&quot;? Denna åtgärd kan inte
              ångras och all data inklusive versioner kommer att raderas permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
