"use client";

import { usePreferences } from "@/lib/context/PreferencesContext";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme, showThemeToggleInHeader } = usePreferences();
  const isDark = resolvedTheme === "dark";

  if (!showThemeToggleInHeader) return null;

  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-border/70 px-3 py-2 text-sm font-medium transition hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-foreground",
          isDark ? "bg-muted" : "bg-primary/10 text-primary",
        )}
      >
        {isDark ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2m0 18v2m11-11h-2M3 12H1m17.657-7.657-1.414 1.414M6.757 17.243l-1.414 1.414m13.314 0-1.414-1.414M6.757 6.757 5.343 5.343" />
          </svg>
        )}
      </span>
      <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
