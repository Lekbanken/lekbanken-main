'use client';

import type { AchievementTheme } from "../../types";

type ThemeSelectorProps = {
  themes: AchievementTheme[];
  value?: string;
  onChange: (themeId: string) => void;
};

export function ThemeSelector({ themes, value, onChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Themes</p>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:border-primary/50 ${
              value === theme.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/30 text-foreground"
            }`}
          >
            <div>
              <p className="font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground">Base {theme.colors.base.color}</p>
            </div>
            <div className="flex h-7 w-16 overflow-hidden rounded border border-border">
              <span className="flex-1" style={{ backgroundColor: theme.colors.base.color }} />
              <span className="flex-1" style={{ backgroundColor: theme.colors.background.color }} />
              <span className="flex-1" style={{ backgroundColor: theme.colors.foreground.color }} />
              <span className="flex-1" style={{ backgroundColor: theme.colors.symbol.color }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
