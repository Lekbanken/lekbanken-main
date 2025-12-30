"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { PlannerBlock } from "@/types/planner";

// Inline icons
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const StickyNoteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/></svg>
);
const CircleDotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/></svg>
);
const GamepadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
);
const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
);

interface BlockDetailDrawerProps {
  block: PlannerBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: { duration_minutes?: number; notes?: string; is_optional?: boolean }) => void;
  onDelete: () => void;
  canDelete: boolean;
  isSaving?: boolean;
}

export function BlockDetailDrawer({
  block,
  open,
  onOpenChange,
  onSave,
  onDelete,
  canDelete,
  isSaving = false,
}: BlockDetailDrawerProps) {
  // Use block id to reset form state when switching blocks
  const blockId = block?.id;
  const [duration, setDuration] = useState(() => String(block?.durationMinutes ?? 15));
  const [notes, setNotes] = useState(() => block?.notes ?? "");
  const [isOptional, setIsOptional] = useState(() => block?.isOptional ?? false);

  // Reset form when block changes (using block id as key)
  useEffect(() => {
    if (block) {
      setDuration(String(block.durationMinutes ?? 15));
      setNotes(block.notes ?? "");
      setIsOptional(block.isOptional ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  const handleSave = () => {
    const parsedDuration = parseInt(duration, 10);
    const updates: { duration_minutes?: number; notes?: string; is_optional?: boolean } = {};

    if (!isNaN(parsedDuration) && parsedDuration > 0 && parsedDuration !== block?.durationMinutes) {
      updates.duration_minutes = parsedDuration;
    }

    if (notes !== (block?.notes ?? "")) {
      updates.notes = notes;
    }

    if (isOptional !== (block?.isOptional ?? false)) {
      updates.is_optional = isOptional;
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    onOpenChange(false);
  };

  const gameName = block?.game?.title ?? block?.title ?? "Block";
  const rawGameImage = block?.game?.coverUrl;

  const gameImage = (() => {
    if (!rawGameImage) return null;
    if (rawGameImage.startsWith("/")) return rawGameImage;
    if (rawGameImage.startsWith("http://") || rawGameImage.startsWith("https://")) return rawGameImage;
    if (rawGameImage.startsWith("data:")) return rawGameImage;
    return null;
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Redigera block</SheetTitle>
          <SheetDescription>
            Anpassa inställningar för detta block
          </SheetDescription>
        </SheetHeader>

        {block && (
          <div className="py-6 space-y-6">
            {/* Game Preview */}
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <div className="flex-shrink-0 w-14 h-14 rounded-md bg-muted overflow-hidden flex items-center justify-center text-muted-foreground relative">
                {gameImage ? (
                  <Image
                    src={gameImage}
                    alt={gameName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <GamepadIcon />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{gameName}</p>
                <p className="text-xs text-muted-foreground">Block #{block.position + 1}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="block-duration" className="flex items-center gap-2">
                <ClockIcon />
                Tid (minuter)
              </Label>
              <Input
                id="block-duration"
                type="number"
                min="1"
                max="999"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="15"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="block-notes" className="flex items-center gap-2">
                <StickyNoteIcon />
                Anteckningar
              </Label>
              <Textarea
                id="block-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lägg till anteckningar för detta block..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Visas vid plangenomgång och i presentationsläge
              </p>
            </div>

            {/* Optional Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CircleDotIcon />
                <div>
                  <Label htmlFor="block-optional" className="cursor-pointer">
                    Valfritt block
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Kan hoppas över vid körning
                  </p>
                </div>
              </div>
              <Switch
                id="block-optional"
                checked={isOptional}
                onCheckedChange={setIsOptional}
              />
            </div>
          </div>
        )}

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          {canDelete && (
            <Button
              variant="outline"
              onClick={() => {
                onDelete();
                onOpenChange(false);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              Ta bort
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <LoaderIcon />
                  <span className="ml-1.5">Sparar...</span>
                </>
              ) : (
                "Spara"
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
