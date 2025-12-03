import Image from "next/image";
import { PencilIcon } from "@heroicons/react/24/outline";
import type { UserSummary } from "../types";

type ProfileHeaderProps = {
  user: UserSummary;
};

export function ProfileHeader({ user }: ProfileHeaderProps) {
  // Get initials for fallback
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex flex-col items-center py-6 text-center">
      {/* Avatar with edit badge */}
      <div className="relative">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            width={96}
            height={96}
            className="h-24 w-24 rounded-3xl object-cover ring-4 ring-background shadow-lg transition-transform hover:scale-105"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-3xl font-bold text-white ring-4 ring-background shadow-lg transition-transform hover:scale-105">
            {initials}
          </div>
        )}
        {/* Edit badge */}
        <button
          type="button"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border shadow-sm transition-colors hover:bg-muted"
          aria-label="Redigera profilbild"
        >
          <PencilIcon className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Name & Email */}
      <p className="mt-4 text-xl font-bold text-foreground">{user.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>

      {/* Stats pills */}
      {(typeof user.coins === "number" || typeof user.achievements === "number") && (
        <div className="mt-4 flex gap-3">
          {typeof user.coins === "number" && (
            <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-2">
              <span className="text-lg">🪙</span>
              <div>
                <p className="text-sm font-bold text-foreground">{user.coins.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Mynt</p>
              </div>
            </div>
          )}
          {typeof user.achievements === "number" && (
            <div className="flex items-center gap-2 rounded-2xl bg-muted/50 px-4 py-2">
              <span className="text-lg">🏆</span>
              <div>
                <p className="text-sm font-bold text-foreground">{user.achievements}</p>
                <p className="text-[10px] text-muted-foreground">Badges</p>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
