"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";

// Inline icons to avoid lucide-react dependency issues
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
);
const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);

interface ActionBarProps {
  canRun: boolean;
  hasBlocks: boolean;
  isPlanPublished: boolean;
  onPreview: () => void;
  onStartRun: () => void;
  isStartingRun?: boolean;
}

export function ActionBar({
  canRun,
  hasBlocks,
  isPlanPublished,
  onPreview,
  onStartRun,
  isStartingRun = false,
}: ActionBarProps) {
  const isReady = canRun && hasBlocks && isPlanPublished;

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PlayIcon />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Redo att köra planen?</p>
            <p className="font-semibold text-foreground">Starta plan i Play</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip content={hasBlocks ? "Visa planen i presentationsläge" : "Lägg till block först"}>
            <Button
              variant="outline"
              onClick={onPreview}
              disabled={!hasBlocks}
              className="gap-1.5"
            >
              <EyeIcon />
              Förhandsgranska
            </Button>
          </Tooltip>
          <Tooltip
            content={
              !hasBlocks
                ? "Lägg till block först"
                : !isPlanPublished
                ? "Publicera planen för att köra"
                : "Starta körning av planen"
            }
            disabled={isReady}
          >
            <Button onClick={onStartRun} disabled={!isReady || isStartingRun} className="gap-2">
              {isStartingRun ? (
                <>
                  <LoaderIcon />
                  Startar...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Starta plan
                </>
              )}
            </Button>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
