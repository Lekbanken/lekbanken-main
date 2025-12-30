import Image from "next/image";
import Link from "next/link";
import { BoltIcon, ClockIcon, HomeIcon, SunIcon, UsersIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Game } from "../types";

type GameCardProps = {
  game: Game;
  layout?: "grid" | "list";
};

const energyConfig: Record<Game["energyLevel"], { label: string; color: string; bgColor: string }> = {
  low: { label: "Låg", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-950/50" },
  medium: { label: "Medel", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/50" },
  high: { label: "Hög", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/50" },
};

const groupLabel: Record<Game["groupSize"], string> = {
  small: "2-6",
  medium: "6-14",
  large: "15+",
};

const environmentConfig: Record<Game["environment"], { label: string; icon: typeof HomeIcon }> = {
  indoor: { label: "Inne", icon: HomeIcon },
  outdoor: { label: "Ute", icon: SunIcon },
  both: { label: "Inne/Ute", icon: HomeIcon },
};

const playModeConfig: Record<
  NonNullable<Game["playMode"]>,
  { label: string; cardClass: string; badgeClass: string }
> = {
  basic: { label: "Enkel lek", cardClass: "", badgeClass: "" },
  facilitated: {
    label: "Ledd aktivitet",
    cardClass: "bg-primary/20 border-primary/30 hover:border-primary/50",
    badgeClass: "bg-primary/30 text-primary ring-1 ring-primary/40",
  },
  participants: {
    label: "Deltagarlek",
    cardClass: "bg-yellow/20 border-yellow/40 hover:border-yellow/60",
    badgeClass: "bg-yellow text-foreground ring-1 ring-yellow/40",
  },
};

export function GameCard({ game, layout = "grid" }: GameCardProps) {
  const energy = energyConfig[game.energyLevel];
  const EnvIcon = environmentConfig[game.environment].icon;
  const isList = layout === "list";
  const playMode = game.playMode ? playModeConfig[game.playMode] : null;

  return (
    <Link href={`/app/games/${game.id}`} className="block">
      <article
        className={cn(
          "group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-border",
          playMode?.cardClass,
          isList && "flex gap-4"
        )}
      >
        {game.imageUrl && (
          <div
            className={cn(
              "overflow-hidden rounded-xl bg-muted",
              isList ? "relative h-28 w-40 shrink-0" : "mb-3"
            )}
          >
            <div className={cn("relative", isList ? "h-full w-full" : "aspect-[16/9]")}>
              <Image
                src={game.imageUrl}
                alt={game.title}
                fill
                className="object-cover"
                sizes={isList ? "160px" : "100vw"}
              />
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {game.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {game.productName && <span>Produkt: {game.productName}</span>}
                {game.purpose && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {game.purpose}
                  </span>
                )}
                {playMode && playMode.label !== "Enkel lek" && (
                  <Badge size="sm" className={cn("border-0", playMode.badgeClass)}>
                    {playMode.label}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                {game.description}
              </p>
            </div>
          </header>

          <dl className="mt-4 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5" aria-hidden />
              <dd className="font-medium">{game.durationMinutes} min</dd>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1.5 text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" aria-hidden />
              <dd className="font-medium">{groupLabel[game.groupSize]}</dd>
            </div>
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${energy.bgColor} ${energy.color}`}>
              <BoltIcon className="h-3.5 w-3.5" aria-hidden />
              <dd className="font-medium">{energy.label}</dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {game.ageRange} år
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-muted-foreground">
              <EnvIcon className="h-3 w-3" aria-hidden />
              {environmentConfig[game.environment].label}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
