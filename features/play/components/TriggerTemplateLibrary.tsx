/**
 * TriggerTemplateLibrary Component
 * 
 * UI for browsing and selecting trigger templates.
 * Makes it easy to add pre-configured triggers to a game.
 * 
 * Backlog B.6: Trigger template library
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Tabs, TabPanel } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BoltIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  TRIGGER_TEMPLATES,
  TEMPLATE_CATEGORY_ICONS,
  searchTemplates,
  applyTemplateVariables,
  type TriggerTemplate,
  type TriggerTemplateCategory,
  type TriggerTemplateVariable,
} from '@/lib/trigger-templates';
import type { TriggerCondition, TriggerAction } from '@/types/trigger';

// =============================================================================
// Types
// =============================================================================

export interface TriggerTemplateLibraryProps {
  /** Called when a template is selected and configured */
  onSelect: (config: {
    name: string;
    when: TriggerCondition;
    then: TriggerAction[];
    executeOnce?: boolean;
    delaySeconds?: number;
  }) => void;
  /** Available steps for variable selection */
  steps?: Array<{ id: string; name: string }>;
  /** Available phases for variable selection */
  phases?: Array<{ id: string; name: string }>;
  /** Available artifacts for variable selection */
  artifacts?: Array<{ id: string; name: string; type: string }>;
  /** Available signal channels */
  channels?: string[];
  /** Whether the library is in a dialog */
  asDialog?: boolean;
  /** Dialog open state (when asDialog=true) */
  open?: boolean;
  /** Dialog open change callback */
  onOpenChange?: (open: boolean) => void;
  /** Optional className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const COMPLEXITY_LABELS = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
} as const;

const COMPLEXITY_COLORS = {
  beginner: 'bg-green-500/10 text-green-600 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  advanced: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const CATEGORY_ORDER: TriggerTemplateCategory[] = [
  'navigation',
  'puzzle',
  'reveal',
  'timing',
  'feedback',
  'advanced',
];

// =============================================================================
// Sub-Component: TemplateCard
// =============================================================================

interface TemplateCardProps {
  template: TriggerTemplate;
  onSelect: () => void;
  t: ReturnType<typeof useTranslations<'play.triggerTemplateLibrary'>>;
}

function TemplateCard({ template, onSelect, t }: TemplateCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {TEMPLATE_CATEGORY_ICONS[template.category]}
            </span>
            <CardTitle className="text-sm font-medium">
              {template.name}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={COMPLEXITY_COLORS[template.complexity]}
          >
            {t(`complexity.${COMPLEXITY_LABELS[template.complexity]}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <CardDescription className="text-xs line-clamp-2">
          {template.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="pt-0 pb-3">
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="default" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="default" className="text-xs">
              {t('tags.more', { count: template.tags.length - 3 })}
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// =============================================================================
// Sub-Component: VariableInput
// =============================================================================

interface VariableInputProps {
  variable: TriggerTemplateVariable;
  value: unknown;
  onChange: (value: unknown) => void;
  steps?: Array<{ id: string; name: string }>;
  phases?: Array<{ id: string; name: string }>;
  artifacts?: Array<{ id: string; name: string; type: string }>;
  channels?: string[];
  t: ReturnType<typeof useTranslations<'play.triggerTemplateLibrary'>>;
}

function VariableInput({
  variable,
  value,
  onChange,
  steps = [],
  phases = [],
  artifacts = [],
  channels = [],
  t,
}: VariableInputProps) {
  switch (variable.type) {
    case 'step':
      return (
        <Select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: t('variableInput.selectStep') },
            ...steps.map((step) => ({ value: step.id, label: step.name })),
          ]}
        />
      );

    case 'phase':
      return (
        <Select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: t('variableInput.selectPhase') },
            ...phases.map((phase) => ({ value: phase.id, label: phase.name })),
          ]}
        />
      );

    case 'artifact':
      return (
        <Select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: t('variableInput.selectArtifact') },
            ...artifacts.map((artifact) => ({
              value: artifact.id,
              label: `${artifact.name} (${artifact.type})`,
            })),
          ]}
        />
      );

    case 'channel':
      return (
        <Select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          options={[
            { value: '', label: t('variableInput.selectChannel') },
            ...channels.map((channel) => ({ value: channel, label: channel })),
            { value: 'success', label: t('channels.success') },
            { value: 'warning', label: t('channels.warning') },
            { value: 'attention', label: t('channels.attention') },
          ]}
        />
      );

    case 'number':
    case 'duration':
      return (
        <Input
          type="number"
          value={value as number}
          onChange={(e) => onChange(Number(e.target.value))}
          min={0}
        />
      );

    case 'string':
    default:
      return (
        <Input
          type="text"
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={variable.description}
        />
      );
  }
}

// =============================================================================
// Sub-Component: ConfigureTemplateDialog
// =============================================================================

interface ConfigureTemplateDialogProps {
  template: TriggerTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (values: Record<string, unknown>) => void;
  steps?: Array<{ id: string; name: string }>;
  phases?: Array<{ id: string; name: string }>;
  artifacts?: Array<{ id: string; name: string; type: string }>;
  channels?: string[];
  t: ReturnType<typeof useTranslations<'play.triggerTemplateLibrary'>>;
}

function ConfigureTemplateDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
  steps,
  phases,
  artifacts,
  channels,
  t,
}: ConfigureTemplateDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Initialize with defaults when template changes
  React.useEffect(() => {
    if (template) {
      const defaults: Record<string, unknown> = {};
      for (const variable of template.variables) {
        if (variable.defaultValue !== undefined) {
          defaults[variable.name] = variable.defaultValue;
        }
      }
      setValues(defaults);
    }
  }, [template]);

  if (!template) return null;

  const handleValueChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const canConfirm = template.variables
    .filter((v) => v.required)
    .every((v) => values[v.name] !== undefined && values[v.name] !== '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">
              {TEMPLATE_CATEGORY_ICONS[template.category]}
            </span>
            {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {template.variables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('configDialog.noConfiguration')}
            </p>
          ) : (
            template.variables.map((variable) => (
              <div key={variable.name} className="space-y-2">
                <Label className="flex items-center gap-1">
                  {variable.label}
                  {variable.required && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                {variable.description && (
                  <p className="text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                )}
                <VariableInput
                  variable={variable}
                  value={values[variable.name]}
                  onChange={(v) => handleValueChange(variable.name, v)}
                  steps={steps}
                  phases={phases}
                  artifacts={artifacts}
                  channels={channels}
                  t={t}
                />
              </div>
            ))
          )}

          {template.examples && template.examples.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">{t('configDialog.examples')}:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {template.examples.map((example, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRightIcon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button onClick={() => onConfirm(values)} disabled={!canConfirm}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('buttons.addTrigger')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TriggerTemplateLibrary({
  onSelect,
  steps = [],
  phases = [],
  artifacts = [],
  channels = [],
  asDialog = false,
  open,
  onOpenChange,
  className,
}: TriggerTemplateLibraryProps) {
  const t = useTranslations('play.triggerTemplateLibrary');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TriggerTemplateCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<TriggerTemplate | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = TRIGGER_TEMPLATES;

    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  // Handle template selection
  const handleSelectTemplate = (template: TriggerTemplate) => {
    setSelectedTemplate(template);
    setConfigDialogOpen(true);
  };

  // Handle configuration confirm
  const handleConfirm = (values: Record<string, unknown>) => {
    if (!selectedTemplate) return;

    const { when, then } = applyTemplateVariables(selectedTemplate, values);

    onSelect({
      name: selectedTemplate.name,
      when,
      then,
      executeOnce: selectedTemplate.executeOnce,
      delaySeconds: selectedTemplate.delaySeconds,
    });

    setConfigDialogOpen(false);
    setSelectedTemplate(null);
    onOpenChange?.(false);
  };

  // Tab configuration
  const tabs = [
    { id: 'browse', label: t('tabs.browse') },
    { id: 'search', label: t('tabs.search') },
  ];

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Tabs for browse/search */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel id="browse" activeTab={activeTab}>
        {/* Category filter */}
        <div className="mb-4">
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TriggerTemplateCategory | 'all')}
            options={[
              { value: 'all', label: t('categories.all') },
              ...CATEGORY_ORDER.map((cat) => ({
                value: cat,
                label: `${TEMPLATE_CATEGORY_ICONS[cat]} ${t(`categories.${cat}` as Parameters<typeof t>[0])}`,
              })),
            ]}
          />
        </div>

        {/* Templates grid */}
        <ScrollArea maxHeight="400px">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpenIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('empty.noTemplates')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pr-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleSelectTemplate(template)}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabPanel>

      <TabPanel id="search" activeTab={activeTab}>
        {/* Search input */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="pl-9"
          />
        </div>

        {/* Search results */}
        <ScrollArea maxHeight="400px">
          {searchQuery.trim() === '' ? (
            <div className="text-center py-8 text-muted-foreground">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('search.enterKeyword')}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpenIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('search.noMatches')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pr-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleSelectTemplate(template)}
                  t={t}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </TabPanel>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>{t('stats.templatesCount', { count: filteredTemplates.length })}</span>
        <div className="flex items-center gap-3">
          <span className={COMPLEXITY_COLORS.beginner}>
            {t('stats.simple', { count: TRIGGER_TEMPLATES.filter((tpl) => tpl.complexity === 'beginner').length })}
          </span>
          <span className={COMPLEXITY_COLORS.intermediate}>
            {t('stats.medium', { count: TRIGGER_TEMPLATES.filter((tpl) => tpl.complexity === 'intermediate').length })}
          </span>
          <span className={COMPLEXITY_COLORS.advanced}>
            {t('stats.advanced', { count: TRIGGER_TEMPLATES.filter((tpl) => tpl.complexity === 'advanced').length })}
          </span>
        </div>
      </div>

      {/* Configuration dialog */}
      <ConfigureTemplateDialog
        template={selectedTemplate}
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onConfirm={handleConfirm}
        steps={steps}
        phases={phases}
        artifacts={artifacts}
        channels={channels}
        t={t}
      />
    </div>
  );

  if (asDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoltIcon className="h-5 w-5" />
              {t('dialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
}
