'use client';

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AchievementItem, AchievementTheme } from "../types";
import { AchievementEditorWizard } from "./AchievementEditorWizard";

type AchievementEditorProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void;
  onCancel: () => void;
};

export function AchievementEditor({ value, onChange, onCancel }: AchievementEditorProps) {
  const [draft, setDraft] = useState<AchievementItem>(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save delay for UX feedback
    setTimeout(() => {
      onChange(draft);
      setIsSaving(false);
    }, 300);
  };

  return (
    <div className="relative">
      {/* Cancel button in top right */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        title="Avbryt"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
      
      <AchievementEditorWizard
        draft={draft}
        onDraftChange={setDraft}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
