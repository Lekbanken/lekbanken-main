'use client';

import { CheckIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { useTranslations } from 'next-intl';
import type { AchievementTheme } from "../../types";
import { Badge } from "@/components/ui";

type ThemeSelectorEnhancedProps = {
  themes: AchievementTheme[];
  value?: string;
  mode: "theme" | "custom";
  onModeChange: (mode: "theme" | "custom") => void;
  onChange: (themeId: string) => void;
};

export function ThemeSelectorEnhanced({ themes, value, mode, onModeChange, onChange }: ThemeSelectorEnhancedProps) {
  const t = useTranslations('admin.achievements.editor');
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SwatchIcon className="h-4 w-4 text-primary" />
          {t('themePresetsMode')}
        </div>
        <div className="flex rounded-lg border border-border/50 bg-muted/40 p-1 text-xs font-medium">
          {(["theme", "custom"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onModeChange(opt)}
              className={`rounded-md px-2 py-1 transition ${
                mode === opt ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt === "theme" ? "Theme" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {mode === "theme" ? (
        <div className="grid grid-cols-3 gap-3">
          {themes.map((theme) => {
            const isActive = theme.id === value;
            return (
              <button
                key={theme.id}
                onClick={() => onChange(theme.id)}
                className={`
                  group relative flex flex-col items-center gap-2.5 rounded-xl p-3 transition-all duration-200
                  border-2 hover:scale-[1.02] hover:shadow-md
                  ${isActive
                    ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                    : "border-border/60 bg-card hover:border-primary/40"
                  }
                `}
                title={theme.name}
              >
                <div className="flex gap-1.5">
                  <div
                    className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: theme.colors.base.color }}
                  />
                  <div
                    className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: theme.colors.background.color }}
                  />
                  <div
                    className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: theme.colors.foreground.color }}
                  />
                </div>
                
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {theme.name}
                </span>

                {isActive && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <Badge variant="secondary" size="sm">
          {t('customModeActive')}
        </Badge>
      )}
    </div>
  );
}
