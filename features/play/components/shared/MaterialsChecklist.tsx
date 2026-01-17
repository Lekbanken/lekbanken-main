'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MaterialItem {
  id: string;
  name: string;
  quantity?: number;
  optional?: boolean;
}

export interface MaterialsChecklistProps {
  materials: MaterialItem[] | string[];
  checkedIds?: string[];
  onToggle?: (id: string, checked: boolean) => void;
  collapsed?: boolean;
  readonly?: boolean;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeMaterials(materials: MaterialItem[] | string[]): MaterialItem[] {
  return materials.map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `material-${index}`,
        name: item,
      };
    }
    return item;
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialsChecklist({
  materials: rawMaterials,
  checkedIds = [],
  onToggle,
  collapsed: initialCollapsed = false,
  readonly = false,
  className,
}: MaterialsChecklistProps) {
  const t = useTranslations('play.materialsChecklist');
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const materials = normalizeMaterials(rawMaterials);

  if (materials.length === 0) {
    return null;
  }

  const checkedCount = checkedIds.length;
  const totalCount = materials.length;
  const allChecked = checkedCount === totalCount;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="py-3">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between text-left"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🎲</span>
            {t('title')}
            {!readonly && (
              <span
                className={cn(
                  'text-sm font-normal',
                  allChecked ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                ({checkedCount}/{totalCount})
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
            {isCollapsed ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </Button>
        </button>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {materials.map((material) => {
              const isChecked = checkedIds.includes(material.id);

              return (
                <li key={material.id}>
                  <button
                    type="button"
                    disabled={readonly}
                    onClick={() => onToggle?.(material.id, !isChecked)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all',
                      readonly
                        ? 'cursor-default border-border/60 bg-muted/30'
                        : 'cursor-pointer hover:border-primary/40 hover:bg-muted/50',
                      isChecked && 'border-primary/30 bg-primary/5'
                    )}
                  >
                    {/* Checkbox */}
                    {!readonly && (
                      <div
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                          isChecked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 bg-background'
                        )}
                      >
                        {isChecked && <CheckIcon className="h-3 w-3" />}
                      </div>
                    )}

                    {/* Material info */}
                    <span
                      className={cn(
                        'flex-1',
                        isChecked && 'text-muted-foreground line-through'
                      )}
                    >
                      {material.name}
                      {material.quantity && material.quantity > 1 && (
                        <span className="ml-1 text-muted-foreground">
                          × {material.quantity}
                        </span>
                      )}
                    </span>

                    {/* Optional badge */}
                    {material.optional && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Valfritt
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
