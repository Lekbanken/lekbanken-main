'use client';

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { AchievementItem, AchievementTheme } from "../types";
import { AchievementEditorWizard } from "./AchievementEditorWizard";

type AchievementEditorProps = {
  value: AchievementItem;
  themes: AchievementTheme[];
  onChange: (value: AchievementItem) => void | Promise<void>;
  onCancel: () => void;
};

export function AchievementEditor({ value, onChange, onCancel }: AchievementEditorProps) {
  const [draft, setDraft] = useState<AchievementItem>(value);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value);
    setSaveError(null);
  }, [value]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onChange(draft);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
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

      {saveError && (
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {saveError}
          </div>
        </div>
      )}
    </div>
  );
}
