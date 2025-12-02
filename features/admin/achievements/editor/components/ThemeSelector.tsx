'use client';

import { AchievementTheme } from "../../types";

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
              <p className="text-xs text-muted-foreground">Base {theme.baseColor}</p>
            </div>
            <div className="flex h-7 w-16 overflow-hidden rounded border border-border">
              <span className="flex-1" style={{ backgroundColor: theme.baseColor }} />
              <span className="flex-1" style={{ backgroundColor: theme.backgroundColor }} />
              <span className="flex-1" style={{ backgroundColor: theme.foregroundColor }} />
              <span className="flex-1" style={{ backgroundColor: theme.symbolColor }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
