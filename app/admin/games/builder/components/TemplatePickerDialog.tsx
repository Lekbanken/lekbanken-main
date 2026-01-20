'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import {
  TEMPLATE_CATEGORIES,
  TRIGGER_TEMPLATES,
  getTemplatesByCategory,
  instantiateTemplate,
  type TriggerTemplate,
  type TemplateCategory,
} from '@/features/admin/games/utils/trigger-templates';
import type { TriggerFormData } from '@/types/games';

type TemplatePickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (triggers: TriggerFormData[]) => void;
};

export function TemplatePickerDialog({
  isOpen,
  onClose,
  onSelect,
}: TemplatePickerDialogProps) {
  const t = useTranslations('admin.games.builder.templatePickerDialog');
  const tActions = useTranslations('common.actions');

  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TriggerTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    if (!selectedCategory) return TRIGGER_TEMPLATES;
    return getTemplatesByCategory(selectedCategory);
  }, [selectedCategory]);

  const handleAddTemplate = () => {
    if (!selectedTemplate) return;
    const triggers = instantiateTemplate(selectedTemplate);
    onSelect(triggers);
    onClose();
    setSelectedTemplate(null);
    setSelectedCategory(null);
  };

  const handleClose = () => {
    onClose();
    setSelectedTemplate(null);
    setSelectedCategory(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[85vh] bg-background rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('title')}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Category Sidebar */}
          <div className="w-48 border-r p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`w-full text-left px-3 py-2 rounded text-sm ${
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-surface-secondary'
              }`}
            >
              {t('allTemplates')}
            </button>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-surface-secondary'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Template List */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid gap-3">
              {filteredTemplates.map((template) => {
                const category = TEMPLATE_CATEGORIES.find((c) => c.id === template.category);
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-surface-secondary'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline" size="sm">
                            {category?.icon} {category?.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground-secondary">
                          {template.description}
                        </p>
                        <p className="text-xs text-foreground-tertiary mt-1">
                          {t('triggersCount', { count: template.triggers.length })}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <Badge variant="default" size="sm">{t('selectedBadge')}</Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-surface-secondary/50">
          <p className="text-sm text-foreground-secondary">
            {selectedTemplate
              ? t('footerSelectedTemplate', {
                  name: selectedTemplate.name,
                  triggers: t('triggersCount', { count: selectedTemplate.triggers.length }),
                })
              : t('footerNoSelection')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {tActions('cancel')}
            </Button>
            <Button
              variant="default"
              onClick={handleAddTemplate}
              disabled={!selectedTemplate}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {tActions('add')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
