'use client';

import { AchievementItem, AchievementTheme } from "../types";
import { AchievementEditorPanelV2 } from "./AchievementEditorPanelV2";

type AchievementEditorProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

export function AchievementEditor(props: AchievementEditorProps) {
  return <AchievementEditorPanelV2 {...props} />;
}
