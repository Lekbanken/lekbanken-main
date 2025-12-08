import {
  Bars3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  PlayIcon,
  ClockIcon,
  RectangleGroupIcon,
  PauseIcon,
  PencilSquareIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { PlannerBlock } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BlockRowProps = {
  block: PlannerBlock;
  index: number;
  total?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

const blockMeta: Record<
  PlannerBlock["blockType"],
  { label: string; Icon: typeof RectangleGroupIcon; tone: string }
> = {
  game: { label: "Lek", Icon: RectangleGroupIcon, tone: "text-primary" },
  pause: { label: "Paus", Icon: PauseIcon, tone: "text-amber-600" },
  preparation: { label: "Förberedelse", Icon: PencilSquareIcon, tone: "text-sky-600" },
  custom: { label: "Notis", Icon: PencilSquareIcon, tone: "text-emerald-600" },
};

export function BlockRow({ block, index, total = 999, onMoveUp, onMoveDown, onRemove }: BlockRowProps) {
  const meta = blockMeta[block.blockType];
  const duration = block.durationMinutes ?? block.game?.durationMinutes ?? null;

  return (
    <div className="group flex items-center gap-2 rounded-xl border border-border/50 bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-border">
      <div className="flex cursor-grab touch-none flex-col items-center text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
        <Bars3Icon className="h-5 w-5" />
      </div>
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <meta.Icon className={`h-4 w-4 ${meta.tone}`} />
          <h3 className="truncate text-sm font-semibold text-foreground">
            {block.blockType === "game"
              ? block.game?.title ?? "Lek"
              : block.title ?? meta.label}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {meta.label}
          </span>
          {duration ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <ClockIcon className="h-3 w-3" />
              {duration} min
            </span>
          ) : null}
          {block.blockType === "game" && block.game ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <PlayIcon className="h-3 w-3" />
              {block.game.shortDescription ?? ""}
            </span>
          ) : null}
        </div>
      </div>
      {duration ? (
        <div className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground sm:block">
          {duration} min
        </div>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
            aria-label="Fler alternativ"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onMoveUp} disabled={index === 0}>
            <ChevronUpIcon className="mr-2 h-4 w-4" />
            Flytta upp
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMoveDown} disabled={index >= total - 1}>
            <ChevronDownIcon className="mr-2 h-4 w-4" />
            Flytta ner
          </DropdownMenuItem>
          {block.blockType === "game" && block.game ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/app/play/${block.game.id}`}>
                  <PlayIcon className="mr-2 h-4 w-4" />
                  Spela
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
            <TrashIcon className="mr-2 h-4 w-4" />
            Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
