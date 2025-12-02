import { PlusIcon, FolderIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import type { Session } from "../types";

type SessionListProps = {
  sessions: Session[];
  onCreate: () => void;
  activeId?: string;
  onSelect?: (id: string) => void;
};

export function SessionList({ sessions, onCreate, activeId, onSelect }: SessionListProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Mina sessioner</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {sessions.length}
        </span>
      </div>

      {/* Session cards */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
          <FolderIcon className="mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Inga sessioner ännu</p>
          <p className="mb-4 text-xs text-muted-foreground/70">
            Skapa din första session för att planera dina lekar.
          </p>
          <Button size="sm" onClick={onCreate}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Skapa session
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect?.(session.id)}
              className={`group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all duration-200 ${
                activeId === session.id
                  ? "border-primary/30 bg-primary/5 shadow-sm"
                  : "border-border/50 bg-card hover:border-border hover:shadow-md hover:-translate-y-0.5"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{session.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                    {session.games.length} {session.games.length === 1 ? "lek" : "lekar"}
                  </span>
                  <span>·</span>
                  <span>Uppdaterad {session.updatedAt ?? "nyss"}</span>
                </div>
              </div>
              <ChevronRightIcon className="ml-2 h-5 w-5 flex-shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}

          {/* New session button */}
          <button
            type="button"
            onClick={onCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Ny session</span>
          </button>
        </div>
      )}
    </div>
  );
}
