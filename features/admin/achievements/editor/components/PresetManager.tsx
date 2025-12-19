'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui';
import {
  BookmarkIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { AchievementIconConfig } from '../../types';
import { BadgePreviewEnhanced } from './BadgePreviewEnhanced';

export type BadgePreset = {
  id: string;
  name: string;
  icon: AchievementIconConfig;
  createdAt: string;
};

type PresetManagerProps = {
  currentIcon: AchievementIconConfig;
  onLoadPreset: (icon: AchievementIconConfig) => void;
  currentTheme?: { colors: Record<string, { color: string }> };
};

const PRESETS_STORAGE_KEY = 'lekbanken_badge_presets';

function loadPresetsFromStorage(): BadgePreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePresetsToStorage(presets: BadgePreset[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

/**
 * Component for managing badge presets - save, load, duplicate, delete.
 * Stores presets in localStorage for persistence.
 */
export function PresetManager({ currentIcon, onLoadPreset, currentTheme }: PresetManagerProps) {
  const [presets, setPresets] = useState<BadgePreset[]>(() => loadPresetsFromStorage());
  const [isNaming, setIsNaming] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: BadgePreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      icon: { ...currentIcon },
      createdAt: new Date().toISOString(),
    };

    const updated = [newPreset, ...presets];
    setPresets(updated);
    savePresetsToStorage(updated);
    setNewPresetName('');
    setIsNaming(false);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresetsToStorage(updated);
    if (selectedPresetId === id) setSelectedPresetId(null);
  };

  const handleDuplicatePreset = useCallback((preset: BadgePreset) => {
    const timestamp = Date.now();
    const duplicated: BadgePreset = {
      ...preset,
      id: `preset-${timestamp}`,
      name: `${preset.name} (kopia)`,
      createdAt: new Date(timestamp).toISOString(),
    };
    setPresets((prev) => {
      const updated = [duplicated, ...prev];
      savePresetsToStorage(updated);
      return updated;
    });
  }, []);

  const handleLoadPreset = (preset: BadgePreset) => {
    onLoadPreset(preset.icon);
    setSelectedPresetId(preset.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BookmarkIcon className="h-4 w-4 text-primary" />
          Mina Presets
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsNaming(!isNaming)}
          className="h-7 text-xs gap-1"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Spara som preset
        </Button>
      </div>

      {/* Save new preset form */}
      {isNaming && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/20">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Ge din preset ett namn..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSavePreset();
              if (e.key === 'Escape') setIsNaming(false);
            }}
          />
          <Button size="sm" onClick={handleSavePreset} disabled={!newPresetName.trim()} className="h-7">
            Spara
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsNaming(false)} className="h-7">
            Avbryt
          </Button>
        </div>
      )}

      {/* Presets grid */}
      {presets.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <BookmarkIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Inga sparade presets ännu</p>
          <p className="text-xs">Spara din nuvarande badge som en preset för att återanvända den</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`
                  relative group rounded-xl border-2 p-3 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary/5 shadow-md' 
                    : 'border-border/60 bg-muted/20 hover:border-primary/40 hover:shadow-md'
                  }
                `}
                onClick={() => handleLoadPreset(preset)}
              >
                {/* Preview */}
                <div className="flex justify-center mb-2">
                  <div className="scale-75">
                    <BadgePreviewEnhanced icon={preset.icon} theme={currentTheme} size="sm" showGlow={false} />
                  </div>
                </div>

                {/* Name */}
                <p className="text-xs font-medium text-center truncate">{preset.name}</p>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-md">
                    <CheckIcon className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}

                {/* Action buttons (visible on hover) */}
                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicatePreset(preset);
                    }}
                    className="p-1 rounded bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Duplicera"
                  >
                    <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                    className="p-1 rounded bg-muted/80 hover:bg-red-500/20 text-muted-foreground hover:text-red-600 transition-colors"
                    title="Ta bort"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
