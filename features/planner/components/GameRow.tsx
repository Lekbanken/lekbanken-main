import Link from "next/link";
import {
  Bars3Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon,
  PlayIcon,
  ClockIcon,
  HomeIcon,
  SunIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import type { GameItem } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type GameRowProps = {
  game: GameItem;
  index: number;
  total?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

const energyConfig = {
  high: { label: "Hög", color: "text-emerald-600", bg: "bg-emerald-500" },
  medium: { label: "Medium", color: "text-amber-600", bg: "bg-amber-500" },
  low: { label: "Lugn", color: "text-sky-600", bg: "bg-sky-500" },
} as const;

const environmentConfig = {
  indoor: { label: "Inomhus", Icon: HomeIcon },
  outdoor: { label: "Utomhus", Icon: SunIcon },
  either: { label: "Var som helst", Icon: HomeIcon },
} as const;

export function GameRow({ game, index, total = 999, onMoveUp, onMoveDown, onRemove }: GameRowProps) {
  const energy = game.energy ? energyConfig[game.energy] : null;
  const environment = game.environment ? environmentConfig[game.environment] : null;

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
          <h3 className="truncate text-sm font-semibold text-foreground">{game.title}</h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ClockIcon className="h-3 w-3" />
            {game.durationMinutes} min
          </span>
          {energy && (
            <span className={`flex items-center gap-1 ${energy.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${energy.bg}`} />
              {energy.label}
            </span>
          )}
          {environment && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <environment.Icon className="h-3 w-3" />
              {environment.label}
            </span>
          )}
        </div>
      </div>
      <div className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground sm:block">
        {game.durationMinutes} min
      </div>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/app/play/${game.id}`}>
              <PlayIcon className="mr-2 h-4 w-4" />
              Spela direkt
            </Link>
          </DropdownMenuItem>
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
