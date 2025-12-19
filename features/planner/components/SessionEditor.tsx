import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PlayIcon,
  ClockIcon,
  Squares2X2Icon,
  BookmarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddGameButton } from "./AddGameButton";
import { BlockRow } from "./GameRow";
import type { PlannerBlock, PlannerPlan, PlannerVisibility } from "../types";
import clsx from "clsx";

type SessionEditorProps = {
  plan: PlannerPlan;
  onPlanChange: (planId: string, updates: { name?: string; description?: string | null }) => Promise<void>;
  onAddBlock: (
    type: PlannerBlock["blockType"],
    extras?: Partial<PlannerBlock> & { game_id?: string | null }
  ) => Promise<void>;
  onUpdateBlock: (blockId: string, updates: Partial<PlannerBlock> & { position?: number }) => Promise<void>;
  onDeleteBlock: (blockId: string) => Promise<void>;
  onSavePrivateNote: (content: string) => Promise<void>;
  onSaveTenantNote?: (content: string) => Promise<void>;
  onVisibilityChange: (visibility: PlannerVisibility) => Promise<void>;
  onReorderBlocks: (blockIds: string[]) => Promise<void>;
  canSetPublicVisibility?: boolean;
};

type GameSearchResult = {
  id: string;
  name: string;
  time_estimate_min?: number | null;
  translations?: { locale: string; title: string; short_description: string }[];
};

function getGameTitle(game: GameSearchResult) {
  const order = ["sv", "no", "en"];
  const translation = order
    .map((l) => game.translations?.find((t) => t.locale === l))
    .find(Boolean) || game.translations?.[0];
  return translation?.title || game.name;
}

export function SessionEditor({
  plan,
  onPlanChange,
  onAddBlock,
   
  onUpdateBlock: _onUpdateBlock,
  onDeleteBlock,
  onSavePrivateNote,
  onSaveTenantNote,
  onVisibilityChange,
  onReorderBlocks,
  canSetPublicVisibility = false,
}: SessionEditorProps) {
  const [localPlan, setLocalPlan] = useState<PlannerPlan>(plan);
  const [noteContent, setNoteContent] = useState<string>(plan.notes?.privateNote?.content ?? "");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [tenantNoteContent, setTenantNoteContent] = useState<string>(plan.notes?.tenantNote?.content ?? "");
  const [isSavingTenantNote, setIsSavingTenantNote] = useState(false);
  const [gameQuery, setGameQuery] = useState("");
  const [gameResults, setGameResults] = useState<GameSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showGameSearch, setShowGameSearch] = useState(false);
  const [isTypingTitle, setIsTypingTitle] = useState(false);
  const [isTypingDesc, setIsTypingDesc] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const titleUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const descUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const titleTypingReset = useRef<NodeJS.Timeout | null>(null);
  const descTypingReset = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const shouldSyncTitle = !isTypingTitle || localPlan.id !== plan.id;
    const shouldSyncDesc = !isTypingDesc || localPlan.id !== plan.id;
    setLocalPlan((prev) => ({
      ...plan,
      name: shouldSyncTitle ? plan.name : prev.name,
      description: shouldSyncDesc ? plan.description : prev.description,
    }));
    setNoteContent(plan.notes?.privateNote?.content ?? "");
    setTenantNoteContent(plan.notes?.tenantNote?.content ?? "");
  }, [plan, isTypingTitle, isTypingDesc, localPlan.id]);

  const totalDuration = useMemo(
    () =>
      localPlan.blocks.reduce((sum, block) => {
        const duration = block.durationMinutes ?? block.game?.durationMinutes ?? 0;
        return sum + (duration || 0);
      }, 0),
    [localPlan.blocks]
  );

  const handleTitleChange = (value: string) => {
    setIsTypingTitle(true);
    if (titleTypingReset.current) clearTimeout(titleTypingReset.current);
    titleTypingReset.current = setTimeout(() => setIsTypingTitle(false), 600);
    setLocalPlan((prev) => ({ ...prev, name: value }));
    if (titleUpdateTimer.current) clearTimeout(titleUpdateTimer.current);
    titleUpdateTimer.current = setTimeout(() => {
      void onPlanChange(plan.id, { name: value });
    }, 300);
  };

  const handleNotesChange = (value: string) => {
    setIsTypingDesc(true);
    if (descTypingReset.current) clearTimeout(descTypingReset.current);
    descTypingReset.current = setTimeout(() => setIsTypingDesc(false), 600);
    setLocalPlan((prev) => ({ ...prev, description: value }));
    if (descUpdateTimer.current) clearTimeout(descUpdateTimer.current);
    descUpdateTimer.current = setTimeout(() => {
      void onPlanChange(plan.id, { description: value });
    }, 300);
  };

  const reorderLocal = (blocks: PlannerBlock[], from: number, to: number) => {
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next.map((b, idx) => ({ ...b, position: idx }));
  };

  const moveBlock = async (block: PlannerBlock, direction: -1 | 1) => {
    const currentIndex = localPlan.blocks.findIndex((b) => b.id === block.id);
    const target = currentIndex + direction;
    if (target < 0 || target >= localPlan.blocks.length) return;
    const reordered = reorderLocal(localPlan.blocks, currentIndex, target);
    setLocalPlan((prev) => ({ ...prev, blocks: reordered }));
    await onReorderBlocks(reordered.map((b) => b.id));
  };

  const handleDropReorder = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const from = localPlan.blocks.findIndex((b) => b.id === draggingId);
    const to = localPlan.blocks.findIndex((b) => b.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = reorderLocal(localPlan.blocks, from, to);
    setLocalPlan((prev) => ({ ...prev, blocks: reordered }));
    setIsReordering(true);
    try {
      await onReorderBlocks(reordered.map((b) => b.id));
    } finally {
      setIsReordering(false);
      setDraggingId(null);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    await onDeleteBlock(blockId);
  };

  const handleAddBlock = async (type: PlannerBlock["blockType"], gameId?: string | null, duration?: number | null) => {
    await onAddBlock(type, { game_id: gameId, durationMinutes: duration ?? null });
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await onSavePrivateNote(noteContent);
    setIsSavingNote(false);
  };

  const handleSaveTenantNote = async () => {
    if (!onSaveTenantNote) return;
    setIsSavingTenantNote(true);
    try {
      await onSaveTenantNote(tenantNoteContent);
    } finally {
      setIsSavingTenantNote(false);
    }
  };

  const searchGames = async () => {
    setIsSearching(true);
    try {
      const res = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: gameQuery, page: 1, pageSize: 10 }),
      });
      const data = (await res.json()) as { games: GameSearchResult[] };
      setGameResults(data.games || []);
    } catch (err) {
      console.error("Game search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={localPlan.name}
              onChange={(e) => void handleTitleChange(e.target.value)}
              placeholder="Plantitel..."
              className="border-0 border-b-2 border-transparent bg-transparent px-0 text-xl font-semibold placeholder:text-muted-foreground/50 focus:border-primary focus:ring-0 focus-visible:ring-0"
            />
            <VisibilitySwitcher
              value={localPlan.visibility}
              canSetPublic={canSetPublicVisibility}
              onChange={(next) => void onVisibilityChange(next)}
            />
          </div>
          <div>
            <Textarea
              value={localPlan.description ?? ""}
              onChange={(e) => void handleNotesChange(e.target.value)}
              rows={2}
              placeholder="Anteckningar: syfte, material..."
              className="min-h-[60px] resize-none rounded-xl border-0 bg-muted/30 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {localPlan.visibility !== "private" && localPlan.ownerTenantId ? (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tenant-anteckningar</h3>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={isSavingTenantNote || !onSaveTenantNote}
              onClick={() => void handleSaveTenantNote()}
            >
              {isSavingTenantNote ? "Sparar..." : "Spara"}
            </Button>
          </div>
          <Textarea
            value={tenantNoteContent}
            onChange={(e) => setTenantNoteContent(e.target.value)}
            rows={3}
            className="mt-3"
            placeholder="Anteckningar som delas inom din tenant."
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Squares2X2Icon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Block i planen</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <ClockIcon className="h-3.5 w-3.5" />
              {totalDuration} min
            </div>
          </div>
        </div>

        {localPlan.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
            <Squares2X2Icon className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Inga block ännu</p>
            <p className="mb-4 text-xs text-muted-foreground/70">
              Lägg till block för att bygga din plan.
            </p>
            <Link
              href="/app/browse"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Bläddra i lekbiblioteket
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {localPlan.blocks.map((block, index) => (
              <div
                key={block.id}
                data-block-id={block.id}
                draggable
                onDragStart={() => setDraggingId(block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const targetId = (e.currentTarget as HTMLElement).dataset.blockId;
                  if (targetId) void handleDropReorder(targetId);
                }}
                className={clsx(
                  "rounded-2xl border border-transparent transition",
                  draggingId === block.id ? "opacity-80 ring-2 ring-primary/40" : ""
                )}
              >
                <BlockRow
                  block={block}
                  index={index}
                  total={localPlan.blocks.length}
                  onMoveUp={() => void moveBlock(block, -1)}
                  onMoveDown={() => void moveBlock(block, 1)}
                  onRemove={() => void handleRemoveBlock(block.id)}
                />
              </div>
            ))}
            {isReordering ? (
              <p className="text-xs text-muted-foreground">Uppdaterar ordning...</p>
            ) : null}
          </div>
        )}

        <AddGameButton
          onAdd={(type) => {
            if (type === "game") {
              setShowGameSearch(true);
            } else {
              void handleAddBlock(
                type,
                null,
                type === "pause" ? 5 : type === "preparation" ? 3 : 2
              );
            }
          }}
        />

        {showGameSearch ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Input
                value={gameQuery}
                onChange={(e) => setGameQuery(e.target.value)}
                placeholder="Sök lek..."
                className="flex-1"
              />
              <Button size="sm" onClick={() => void searchGames()} disabled={isSearching}>
                {isSearching ? "Söker..." : "Sök"}
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {gameResults.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    void handleAddBlock("game", game.id, game.time_estimate_min ?? null);
                    setShowGameSearch(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 p-3 text-left hover:border-primary/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{getGameTitle(game)}</p>
                    <p className="text-xs text-muted-foreground">{game.translations?.[0]?.short_description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{game.time_estimate_min ?? 0} min</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Privata anteckningar</h3>
          </div>
          <Button size="sm" variant="ghost" disabled={isSavingNote} onClick={() => void handleSaveNote()}>
            {isSavingNote ? "Sparar..." : "Spara"}
          </Button>
        </div>
        <Textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          rows={3}
          className="mt-3"
          placeholder="Anteckningar som bara du ser."
        />
      </div>

      <div className="sticky bottom-20 z-10 rounded-2xl border border-border/50 bg-background/80 p-3 shadow-xl backdrop-blur-xl">
        <div className="flex gap-2">
          <Button
            href={localPlan.blocks.length > 0 ? `/app/play/plan/${localPlan.id}` : undefined}
            className="h-12 flex-1 gap-2 bg-gradient-to-br from-primary to-primary/80 text-base font-semibold"
            disabled={!localPlan.blocks[0]}
          >
            <PlayIcon className="h-5 w-5" />
            Starta plan
            {totalDuration > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-sm">
                {totalDuration} min
              </span>
            )}
          </Button>
          <Button variant="outline" className="h-12 gap-2">
            <BookmarkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Spara</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function VisibilitySwitcher({
  value,
  onChange,
  canSetPublic = false,
}: {
  value: PlannerVisibility;
  onChange: (v: PlannerVisibility) => void;
  canSetPublic?: boolean;
}) {
  const options: { label: string; value: PlannerVisibility; disabled?: boolean; tooltip?: string }[] = [
    { label: "Privat", value: "private" },
    { label: "Tenant", value: "tenant" },
    { label: "Public", value: "public", disabled: !canSetPublic, tooltip: "Endast systemadmin kan göra planer publika" },
  ];

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            if (opt.disabled) return;
            onChange(opt.value);
          }}
          aria-disabled={opt.disabled}
          title={opt.disabled ? opt.tooltip : undefined}
          className={clsx(
            "rounded-full px-3 py-1 transition",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : opt.disabled
                ? "cursor-not-allowed opacity-60"
                : "hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
