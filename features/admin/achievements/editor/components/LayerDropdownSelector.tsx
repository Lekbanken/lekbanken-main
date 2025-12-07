'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { AchievementAsset, AchievementAssetType, AchievementLayerStackItem } from '../../types';

type LayerDropdownSelectorProps = {
  label: string;
  description?: string;
  type: AchievementAssetType;
  assets: AchievementAsset[];
  // For single select (base, symbol)
  selectedId?: string;
  onSelect?: (id: string) => void;
  // For multi select (backgrounds, foregrounds)
  multiSelect?: boolean;
  selectedItems?: AchievementLayerStackItem[];
  onMultiSelect?: (items: AchievementLayerStackItem[]) => void;
};

/**
 * Dropdown selector for badge layers.
 * Supports both single-select (base, symbol) and multi-select (decorations).
 */
export function LayerDropdownSelector({
  label,
  description,
  type,
  assets,
  selectedId,
  onSelect,
  multiSelect = false,
  selectedItems = [],
  onMultiSelect,
}: LayerDropdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAssets = assets.filter((a) => a.type === type);
  const selectedAsset = filteredAssets.find((a) => a.id === selectedId);
  const selectedItemIds = new Set(selectedItems.map((i) => i.id));

  const handleSingleSelect = (id: string) => {
    onSelect?.(id);
    setIsOpen(false);
  };

  const handleMultiToggle = (asset: AchievementAsset) => {
    if (selectedItemIds.has(asset.id)) {
      onMultiSelect?.(selectedItems.filter((i) => i.id !== asset.id));
    } else {
      onMultiSelect?.([...selectedItems, { id: asset.id, order: selectedItems.length }]);
    }
  };

  const handleRemoveItem = (id: string) => {
    onMultiSelect?.(selectedItems.filter((i) => i.id !== id));
  };

  const getDisplayValue = () => {
    if (multiSelect) {
      if (selectedItems.length === 0) return 'Välj...';
      return `${selectedItems.length} valda`;
    }
    return selectedAsset?.label || 'Välj...';
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Label */}
      <div className="mb-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5
          transition-all duration-200
          ${isOpen 
            ? 'border-primary ring-2 ring-primary/20' 
            : 'border-border hover:border-primary/40'
          }
          bg-background
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!multiSelect && selectedAsset && (
            <Image
              src={selectedAsset.sizes.sm}
              alt={selectedAsset.label}
              width={24}
              height={24}
              className="rounded"
              unoptimized
            />
          )}
          <span className={`text-sm truncate ${selectedAsset || selectedItems.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {getDisplayValue()}
          </span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Multi-select chips */}
      {multiSelect && selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedItems.map((item) => {
            const asset = filteredAssets.find((a) => a.id === item.id);
            return (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {asset && (
                  <Image
                    src={asset.sizes.sm}
                    alt={asset.label}
                    width={16}
                    height={16}
                    className="rounded-sm"
                    unoptimized
                  />
                )}
                {asset?.label || item.id}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="ml-0.5 hover:text-primary/70"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-background shadow-lg max-h-64 overflow-auto">
          {/* None option for single select */}
          {!multiSelect && (
            <button
              type="button"
              onClick={() => handleSingleSelect('')}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors
                ${!selectedId ? 'bg-primary/5 text-primary' : 'text-foreground'}
              `}
            >
              <span className="flex h-6 w-6 items-center justify-center text-muted-foreground">—</span>
              <span className="text-sm">Ingen</span>
              {!selectedId && <CheckIcon className="ml-auto h-4 w-4 text-primary" />}
            </button>
          )}

          {/* Asset options */}
          {filteredAssets.map((asset) => {
            const isSelected = multiSelect 
              ? selectedItemIds.has(asset.id) 
              : selectedId === asset.id;

            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => multiSelect ? handleMultiToggle(asset) : handleSingleSelect(asset.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors
                  ${isSelected ? 'bg-primary/5' : ''}
                `}
              >
                <Image
                  src={asset.sizes.sm}
                  alt={asset.label}
                  width={28}
                  height={28}
                  className="rounded"
                  unoptimized
                />
                <span className={`text-sm flex-1 ${isSelected ? 'text-primary font-medium' : 'text-foreground'}`}>
                  {asset.label}
                </span>
                {isSelected && <CheckIcon className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
