import { useTranslations } from "next-intl";
import { PlusIcon, PauseIcon, PencilSquareIcon, RectangleGroupIcon } from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AddBlockButtonProps = {
  onAdd: (type: "game" | "pause" | "preparation" | "custom") => void;
};

export function AddGameButton({ onAdd }: AddBlockButtonProps) {
  const t = useTranslations('planner');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
            <PlusIcon className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{t('addBlock.title')}</p>
            <p className="text-xs opacity-70">{t('addBlock.subtitle')}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onAdd("game")}>
          <RectangleGroupIcon className="mr-2 h-4 w-4" />
          {t('addBlock.game')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("pause")}>
          <PauseIcon className="mr-2 h-4 w-4" />
          {t('addBlock.pause')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("preparation")}>
          <PencilSquareIcon className="mr-2 h-4 w-4" />
          {t('addBlock.preparation')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAdd("custom")}>
          <PencilSquareIcon className="mr-2 h-4 w-4" />
          {t('addBlock.custom')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
