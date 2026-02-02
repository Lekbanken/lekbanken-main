'use client';

/**
 * GameTemplatePicker
 *
 * Displays available game templates and applies them via wizard actions.
 * Templates generate standard reducer actions - NO shadow state.
 *
 * @see lib/builder/wizard/templates.ts
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  BoltIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import {
  TEMPLATE_METADATA,
  applyTemplate,
  getAvailableTemplates,
  type TemplateId,
} from '@/lib/builder/wizard';
import type { BuilderAction, CoreForm } from '@/types/game-builder-state';

// =============================================================================
// Types
// =============================================================================

export interface GameTemplatePickerProps {
  /** Dispatch function from useGameBuilder */
  dispatch: React.Dispatch<BuilderAction>;
  /** Optional core overrides when applying template */
  coreOverrides?: Partial<CoreForm>;
  /** Callback when template is applied */
  onTemplateApplied?: (templateId: TemplateId) => void;
  /** Show as inline cards or dialog */
  variant?: 'cards' | 'compact';
}

// =============================================================================
// Helpers
// =============================================================================

function getTemplateIcon(templateId: TemplateId) {
  switch (templateId) {
    case 'blank':
      return <SparklesIcon className="h-5 w-5" />;
    case 'basic-activity':
      return <BoltIcon className="h-5 w-5" />;
    case 'facilitated-phases':
      return <UserGroupIcon className="h-5 w-5" />;
    case 'escape-room-lite':
      return <PuzzlePieceIcon className="h-5 w-5" />;
    default:
      return <SparklesIcon className="h-5 w-5" />;
  }
}

// =============================================================================
// Component
// =============================================================================

export function GameTemplatePicker({
  dispatch,
  coreOverrides,
  onTemplateApplied,
  variant = 'cards',
}: GameTemplatePickerProps) {
  const t = useTranslations('admin.games.builder.wizard');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const templates = useMemo(() => getAvailableTemplates(), []);

  const handleApplyTemplate = (templateId: TemplateId) => {
    setIsApplying(true);
    try {
      // Get actions from template
      const actions = applyTemplate(templateId, coreOverrides);

      // Dispatch all actions in order
      for (const action of actions) {
        dispatch(action);
      }

      setSelectedTemplate(templateId);
      onTemplateApplied?.(templateId);
    } finally {
      setIsApplying(false);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {templates.map((meta) => (
          <Button
            key={meta.id}
            variant={selectedTemplate === meta.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleApplyTemplate(meta.id)}
            disabled={isApplying}
            className="gap-2"
          >
            {getTemplateIcon(meta.id)}
            {meta.name}
            {selectedTemplate === meta.id && (
              <CheckIcon className="h-4 w-4 ml-1" />
            )}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {templates.map((meta) => {
        const isSelected = selectedTemplate === meta.id;

        return (
          <Card
            key={meta.id}
            className={`p-4 cursor-pointer transition-all ${
              isSelected
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-surface-secondary hover:border-primary/50'
            }`}
            onClick={() => handleApplyTemplate(meta.id)}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {getTemplateIcon(meta.id)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{meta.name}</span>
                  <Badge variant={meta.mode === 'advanced' ? 'secondary' : 'outline'} size="sm">
                    {meta.mode === 'advanced'
                      ? t('mode.advanced', { defaultValue: 'Avancerad' })
                      : t('mode.simple', { defaultValue: 'Enkel' })}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {meta.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {meta.features.phases && (
                    <Badge variant="outline" size="sm">
                      {t('features.phases', { defaultValue: 'Faser' })}
                    </Badge>
                  )}
                  {meta.features.roles && (
                    <Badge variant="outline" size="sm">
                      {t('features.roles', { defaultValue: 'Roller' })}
                    </Badge>
                  )}
                  {meta.features.artifacts && (
                    <Badge variant="outline" size="sm">
                      {t('features.artifacts', { defaultValue: 'Artefakter' })}
                    </Badge>
                  )}
                  {meta.features.triggers && (
                    <Badge variant="outline" size="sm">
                      {t('features.triggers', { defaultValue: 'Triggers' })}
                    </Badge>
                  )}
                  {meta.stepCount > 0 && (
                    <Badge variant="outline" size="sm">
                      {t('features.stepCount', {
                        count: meta.stepCount,
                        defaultValue: `${meta.stepCount} steg`,
                      })}
                    </Badge>
                  )}
                </div>
              </div>
              {isSelected && (
                <CheckIcon className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
