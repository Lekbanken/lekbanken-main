'use client';

import { AchievementItem } from "../../types";

type MetadataFormEnhancedProps = {
  value: AchievementItem;
  onChange: (next: Partial<AchievementItem>) => void;
};

export function MetadataFormEnhanced({ value, onChange }: MetadataFormEnhancedProps) {
  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-title">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="achv-title"
            type="text"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Badge title"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                       placeholder:text-muted-foreground/60 transition-colors
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="achv-subtitle">
            Subtitle
          </label>
          <input
            id="achv-subtitle"
            type="text"
            value={value.subtitle ?? ""}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Short subtitle"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                       placeholder:text-muted-foreground/60 transition-colors
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="achv-description">
          Description
        </label>
        <textarea
          id="achv-description"
          value={value.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe how to earn this achievement..."
          rows={3}
          className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                     placeholder:text-muted-foreground/60 transition-colors
                     focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Reward Coins */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="achv-reward">
          Reward Coins
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xl">🪙</span>
          <input
            id="achv-reward"
            type="number"
            min={0}
            value={value.rewardCoins ?? 0}
            onChange={(e) => onChange({ rewardCoins: Number(e.target.value) || 0 })}
            className="w-24 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm 
                       transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm text-muted-foreground">coins</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Coins awarded when this achievement is earned
        </p>
      </div>
    </div>
  );
}
