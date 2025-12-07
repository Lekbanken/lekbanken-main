'use client';

import { AchievementItem, AchievementTheme } from "../types";
import { AchievementEditorPanel } from "./AchievementEditorPanel";

type AchievementEditorProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

export function AchievementEditor(props: AchievementEditorProps) {
  return <AchievementEditorPanel {...props} />;
}
