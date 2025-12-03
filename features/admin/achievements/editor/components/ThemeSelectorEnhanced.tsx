'use client';

import { CheckIcon } from "@heroicons/react/24/outline";
import { AchievementTheme } from "../../types";

type ThemeSelectorEnhancedProps = {
  themes: AchievementTheme[];
  value?: string;
  onChange: (themeId: string) => void;
};

export function ThemeSelectorEnhanced({ themes, value, onChange }: ThemeSelectorEnhancedProps) {
  return (
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
                ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                : 'border-border/60 bg-card hover:border-primary/40'
              }
            `}
            title={theme.name}
          >
            {/* Color preview swatches */}
            <div className="flex gap-1.5">
              <div
                className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                style={{ backgroundColor: theme.baseColor }}
              />
              <div
                className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                style={{ backgroundColor: theme.backgroundColor }}
              />
              <div
                className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                style={{ backgroundColor: theme.foregroundColor }}
              />
            </div>
            
            {/* Label */}
            <span
              className={`text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              }`}
            >
              {theme.name}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                <CheckIcon className="h-3 w-3" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
