'use client';

import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import type { AchievementItem, AchievementTheme } from "../types";
import { BadgePreview } from "../editor/components/BadgePreview";

type AchievementCardProps = {
  achievement: AchievementItem;
  theme?: AchievementTheme;
  onEdit: () => void;
};

export function AchievementCard({ achievement, theme, onEdit }: AchievementCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
        <div className="space-y-1">
          <CardTitle className="text-base">{achievement.title}</CardTitle>
          <p className="text-xs text-muted-foreground line-clamp-2">{achievement.subtitle}</p>
        </div>
        <Badge variant="secondary" size="sm">
          {achievement.rewardCoins ?? 0} coins
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-3">
          <BadgePreview
            icon={achievement.icon}
            colors={{
              base: achievement.icon.customColors?.base || theme?.colors.base.color || "#8661ff",
              background: achievement.icon.customColors?.background || theme?.colors.background.color || "#00c7b0",
              foreground: achievement.icon.customColors?.foreground || theme?.colors.foreground.color || "#ffd166",
              symbol: achievement.icon.customColors?.symbol || theme?.colors.symbol.color || "#ffffff",
            }}
          />
        </div>
        {theme && <p className="text-xs text-muted-foreground">Theme: {theme.name}</p>}
        <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
          Edit
        </Button>
      </CardContent>
    </Card>
  );
}
