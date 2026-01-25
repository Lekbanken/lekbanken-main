'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button, Input, Textarea } from '@/components/ui';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { MaterialsForm } from '@/types/game-builder-state';

// Common material suggestions grouped by category
const MATERIAL_SUGGESTIONS = {
  bollar: ['Fotboll', 'Basketboll', 'Handboll', 'Tennisboll', 'Mjukboll', 'Balansboll'],
  markeringar: ['Koner', 'Markeringshattar', 'Tejp', 'Krita', 'Ribbor', 'Rockringar'],
  utrustning: ['Västar', 'Pannband', 'Visselpipa', 'Stoppur', 'Måltavla', 'Nät'],
  ljud: ['Högtalare', 'Musik (Spotify-spellista)', 'Mikrofon', 'Ljudsignal'],
  övrigt: ['Papper', 'Pennor', 'Poängkort', 'Priser', 'Vattenflaskor', 'Första hjälpen-kit'],
} as const;

type MaterialEditorProps = {
  materials: MaterialsForm;
  onChange: (update: Partial<MaterialsForm>) => void;
};

export function MaterialEditor({ materials, onChange }: MaterialEditorProps) {
  const t = useTranslations('admin.games.builder');
  const [newItem, setNewItem] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Add a new material item
  const addItem = useCallback((item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    
    // Don't add duplicates (case-insensitive check)
    const exists = materials.items.some(
      existing => existing.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;
    
    onChange({ items: [...materials.items, trimmed] });
    setNewItem('');
  }, [materials.items, onChange]);

  // Remove a material item by index
  const removeItem = useCallback((index: number) => {
    const newItems = materials.items.filter((_, i) => i !== index);
    onChange({ items: newItems });
  }, [materials.items, onChange]);

  // Update a material item
  const updateItem = useCallback((index: number, value: string) => {
    const newItems = [...materials.items];
    newItems[index] = value;
    onChange({ items: newItems });
  }, [materials.items, onChange]);

  // Move item up/down
  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    const newItems = [...materials.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    onChange({ items: newItems });
  }, [materials.items, onChange]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(newItem);
    }
  }, [addItem, newItem]);

  // Filter out already added suggestions
  const availableSuggestions = useMemo(() => {
    const result: Record<string, string[]> = {};
    const addedLower = new Set(materials.items.map(i => i.toLowerCase()));
    
    for (const [category, items] of Object.entries(MATERIAL_SUGGESTIONS)) {
      const available = items.filter(item => !addedLower.has(item.toLowerCase()));
      if (available.length > 0) {
        result[category] = available;
      }
    }
    return result;
  }, [materials.items]);

  const hasSuggestions = Object.keys(availableSuggestions).length > 0;

  return (
    <div className="space-y-6">
      {/* Material List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            {t('materials.itemsLabel')}
          </label>
          <span className="text-xs text-muted-foreground">
            {t('materials.itemsCount', { count: materials.items.length })}
          </span>
        </div>

        {/* Existing items */}
        {materials.items.length > 0 && (
          <ul className="space-y-2">
            {materials.items.map((item, index) => (
              <li key={index} className="flex items-center gap-2 group">
                <span className="text-sm text-muted-foreground w-5 text-right shrink-0">
                  {index + 1}.
                </span>
                <Input
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                    title="Flytta upp"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === materials.items.length - 1}
                    className="h-8 w-8 p-0"
                    title="Flytta ner"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Ta bort"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Add new item */}
        <div className="flex items-center gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('materials.addItemPlaceholder')}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addItem(newItem)}
            disabled={!newItem.trim()}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('materials.addItem')}
          </Button>
        </div>

        {/* Quick suggestions */}
        {hasSuggestions && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {showSuggestions ? t('materials.hideSuggestions') : t('materials.showSuggestions')}
            </button>
            
            {showSuggestions && (
              <div className="mt-3 space-y-3">
                {Object.entries(availableSuggestions).map(([category, items]) => (
                  <div key={category}>
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {category}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {items.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => addItem(item)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md',
                            'bg-muted hover:bg-muted/80 text-foreground',
                            'transition-colors'
                          )}
                        >
                          <PlusIcon className="h-3 w-3" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {materials.items.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            {t('materials.noItems')}
          </p>
        )}
      </div>

      {/* Preparation */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('materials.preparationLabel')}
        </label>
        <Textarea
          value={materials.preparation}
          onChange={(e) => onChange({ preparation: e.target.value })}
          rows={3}
          placeholder={t('materials.preparationPlaceholder')}
        />
      </div>
    </div>
  );
}
