import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type AddGameButtonProps = {
  onAdd: () => void;
};

export function AddGameButton({ onAdd }: AddGameButtonProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 p-4 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
        <PlusIcon className="h-4 w-4" />
      </div>
      <div className="text-left">
        <p className="text-sm font-medium">Lägg till lek</p>
        <p className="text-xs opacity-70">Från lekbiblioteket</p>
      </div>
      <MagnifyingGlassIcon className="ml-auto h-4 w-4 opacity-50" />
    </button>
  );
}
