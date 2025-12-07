'use client';

import { CheckIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Badge, Button } from "@/components/ui";
import { AchievementItem, AchievementTheme } from "../types";
import { BadgePreviewEnhanced } from "../editor/components/BadgePreviewEnhanced";

type AchievementLibraryCardProps = {
  achievement: AchievementItem;
  theme?: AchievementTheme;
  onEdit: () => void;
  isSelected?: boolean;
};

export function AchievementLibraryCard({ achievement, theme, onEdit, isSelected }: AchievementLibraryCardProps) {
  return (
    <div 
      className={`
        group relative rounded-2xl border bg-card transition-all duration-200
        ${isSelected 
          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
          : 'border-border/60 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
        }
      `}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-md z-10">
          <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-0">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {achievement.title || 'Untitled Badge'}
          </h3>
          {achievement.subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {achievement.subtitle}
            </p>
          )}
        </div>
        <Badge 
          variant={achievement.status === 'published' ? 'success' : 'secondary'} 
          size="sm"
          className="shrink-0"
        >
          {achievement.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {/* Preview Container */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 p-4">
          <BadgePreviewEnhanced
            icon={achievement.icon}
            theme={
              theme
                ? { colors: theme.colors }
                : {
                    colors: {
                      base: { color: "#8661ff" },
                      background: { color: "#00c7b0" },
                      foreground: { color: "#ffd166" },
                      symbol: { color: "#ffffff" },
                    },
                  }
            }
            size="md"
          />
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Reward Coins */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🪙</span>
            <span className="text-sm font-medium text-foreground">
              {achievement.rewardCoins ?? 0}
            </span>
          </div>
          
          {/* Theme indicator */}
          {theme && (
            <div className="flex items-center gap-1.5">
              <div 
                className="h-3 w-3 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: theme.colors.base.color }}
              />
              <span className="text-xs text-muted-foreground">{theme.name}</span>
            </div>
          )}
        </div>

        {/* Edit Button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEdit}
          className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {/* Profile Frame Sync Indicator */}
      {achievement.profileFrameSync?.enabled && (
        <div className="absolute left-3 top-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent" title="Profile frame sync enabled">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
