'use client';

import { useState, useCallback, useMemo, useId, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Button, Input, Textarea, Select, HelpText } from '@/components/ui';
import {
  PlusIcon,
  ClockIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { PhaseType, TimerStyle } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

export type PhaseData = {
  id: string;
  name: string;
  phase_type: PhaseType;
  phase_order: number;
  duration_seconds: number | null;
  timer_visible: boolean;
  timer_style: TimerStyle;
  description: string;
  board_message: string;
  auto_advance: boolean;
};

type PhaseEditorProps = {
  phases: PhaseData[];
  onChange: (phases: PhaseData[]) => void;
};

// =============================================================================
// Phase Type Config
// =============================================================================

const phaseTypeConfig: Record<PhaseType, { labelKey: string; emoji: string; color: string }> = {
  intro: { labelKey: 'phase.types.intro', emoji: '👋', color: 'bg-blue-500' },
  round: { labelKey: 'phase.types.round', emoji: '🎯', color: 'bg-emerald-500' },
  finale: { labelKey: 'phase.types.finale', emoji: '🏆', color: 'bg-amber-500' },
  break: { labelKey: 'phase.types.break', emoji: '☕', color: 'bg-gray-400' },
};

const timerStyleOptions = [
  { value: 'countdown', labelKey: 'phase.timerStyles.countdown' },
  { value: 'elapsed', labelKey: 'phase.timerStyles.elapsed' },
  { value: 'trafficlight', labelKey: 'phase.timerStyles.trafficlight' },
];

const phaseTypeOptions: { value: PhaseType; labelKey: string }[] = [
  { value: 'intro', labelKey: 'phase.types.intro' },
  { value: 'round', labelKey: 'phase.types.round' },
  { value: 'finale', labelKey: 'phase.types.finale' },
  { value: 'break', labelKey: 'phase.types.break' },
];

// =============================================================================
// Sortable Phase Item
// =============================================================================

type SortablePhaseItemProps = {
  phase: PhaseData;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function SortablePhaseItem({ phase, onEdit, onDelete }: SortablePhaseItemProps) {
  const t = useTranslations('admin.games.builder');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = phaseTypeConfig[phase.phase_type] ?? phaseTypeConfig.round;
  const durationMin = phase.duration_seconds ? Math.round(phase.duration_seconds / 60) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-card transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50 z-10' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {/* Phase type badge */}
        <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${config.color} text-white text-sm`}>
          {config.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">{phase.name || t('phase.unnamed')}</h4>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
              {t(config.labelKey)}
            </span>
          </div>
          
          {phase.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {phase.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {durationMin !== null && (
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                {t('phase.duration', { min: durationMin })}
              </span>
            )}
            {phase.timer_visible && phase.duration_seconds && (
              <span>{t('phase.timerLabel')}: {t(timerStyleOptions.find(o => o.value === phase.timer_style)?.labelKey || 'phase.timerStyles.countdown')}</span>
            )}
            {phase.auto_advance && (
              <span className="text-blue-600">{t('phase.fields.autoAdvance')}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(phase.id)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(phase.id)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Phase Edit Drawer
// =============================================================================

type PhaseEditDrawerProps = {
  phase: PhaseData | null;
  onSave: (phase: PhaseData) => void;
  onClose: () => void;
};

function PhaseEditDrawer({ phase, onSave, onClose }: PhaseEditDrawerProps) {
  const t = useTranslations('admin.games.builder');
  const generatedId = useId();
  const initialForm = useMemo<PhaseData>(
    () =>
      phase || {
        id: `phase-${generatedId}`,
        name: '',
        phase_type: 'round',
        phase_order: 0,
        duration_seconds: null,
        timer_visible: true,
        timer_style: 'countdown',
        description: '',
        board_message: '',
        auto_advance: false,
      },
    [phase, generatedId]
  );
  const [form, setForm] = useState<PhaseData>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  const durationMinutes = form.duration_seconds ? Math.round(form.duration_seconds / 60) : '';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {phase ? t('phase.editPhase') : t('phase.addPhase')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('phase.fields.name')} <span className="text-destructive">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('phase.namePlaceholder')}
          />
        </div>

        {/* Phase Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('phase.fields.type')}</label>
          <Select
            value={form.phase_type}
            onChange={(e) => setForm({ ...form, phase_type: e.target.value as PhaseType })}
            options={phaseTypeOptions.map(o => ({ ...o, label: t(o.labelKey) }))}
          />
          <HelpText>{t('phase.typeHelpText')}</HelpText>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('phase.fields.description')}</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder={t('phase.descriptionPlaceholder')}
          />
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('phase.fields.durationMinutes')}</label>
          <Input
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setForm({ 
              ...form, 
              duration_seconds: e.target.value ? Number(e.target.value) * 60 : null 
            })}
            placeholder={t('phase.durationPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('phase.durationHelpText')}
          </p>
        </div>

        {/* Timer Settings */}
        {form.duration_seconds && (
          <Card className="p-4 space-y-4 bg-muted/30">
            <h4 className="text-sm font-medium text-foreground">{t('phase.timerSettings')}</h4>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="timer_visible"
                checked={form.timer_visible}
                onChange={(e) => setForm({ ...form, timer_visible: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="timer_visible" className="text-sm text-foreground">
                {t('phase.fields.timerVisible')}
              </label>
            </div>

            {form.timer_visible && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('phase.fields.timerStyle')}</label>
                <Select
                  value={form.timer_style}
                  onChange={(e) => setForm({ ...form, timer_style: e.target.value as TimerStyle })}
                  options={timerStyleOptions.map(o => ({ value: o.value, label: t(o.labelKey) }))}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto_advance"
                checked={form.auto_advance}
                onChange={(e) => setForm({ ...form, auto_advance: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="auto_advance" className="text-sm text-foreground">
                {t('phase.fields.autoAdvanceLabel')}
              </label>
            </div>
          </Card>
        )}

        {/* Board Message */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('phase.fields.boardMessage')}</label>
          <Textarea
            value={form.board_message}
            onChange={(e) => setForm({ ...form, board_message: e.target.value })}
            rows={2}
            placeholder={t('phase.boardMessagePlaceholder')}
          />
          <HelpText>{t('phase.boardMessageHelpText')}</HelpText>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('phase.cancel')}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!form.name.trim()}
        >
          {phase ? t('phase.save') : t('phase.add')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Phase Editor
// =============================================================================

export function PhaseEditor({ phases, onChange }: PhaseEditorProps) {
  const t = useTranslations('admin.games.builder');
  const [editingPhase, setEditingPhase] = useState<PhaseData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = phases.findIndex((p) => p.id === active.id);
        const newIndex = phases.findIndex((p) => p.id === over.id);
        const reordered = arrayMove(phases, oldIndex, newIndex).map((p, idx) => ({
          ...p,
          phase_order: idx,
        }));
        onChange(reordered);
      }
    },
    [phases, onChange]
  );

  const handleAddPhase = useCallback(() => {
    setEditingPhase(null);
    setIsCreating(true);
  }, []);

  const handleEditPhase = useCallback(
    (id: string) => {
      const phase = phases.find((p) => p.id === id);
      if (phase) {
        setEditingPhase(phase);
        setIsCreating(true);
      }
    },
    [phases]
  );

  const handleDeletePhase = useCallback(
    (id: string) => {
      onChange(phases.filter((p) => p.id !== id).map((p, idx) => ({ ...p, phase_order: idx })));
    },
    [phases, onChange]
  );

  const handleSavePhase = useCallback(
    (phase: PhaseData) => {
      if (editingPhase) {
        // Update existing
        onChange(phases.map((p) => (p.id === phase.id ? phase : p)));
      } else {
        // Add new
        onChange([...phases, { ...phase, phase_order: phases.length }]);
      }
      setIsCreating(false);
      setEditingPhase(null);
    },
    [phases, onChange, editingPhase]
  );

  const handleCloseDrawer = useCallback(() => {
    setIsCreating(false);
    setEditingPhase(null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">{t('phase.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('phase.subtitle')}
        </p>
      </div>

      {/* Phase Timeline Preview */}
      {phases.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {phases.map((phase, idx) => {
            const config = phaseTypeConfig[phase.phase_type] ?? phaseTypeConfig.round;
            return (
              <div key={phase.id} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color} text-white whitespace-nowrap`}
                >
                  {config.emoji} {phase.name || t(config.labelKey)}
                </div>
                {idx < phases.length - 1 && (
                  <span className="text-muted-foreground">→</span>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleAddPhase}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground transition-colors whitespace-nowrap"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('phase.newPhase')}
          </button>
        </div>
      )}

      {/* Phase List */}
      {phases.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ClockIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-1">{t('phase.noPhasesYet')}</h4>
          <p className="text-sm text-muted-foreground mb-4">
            {t('phase.subtitle')}
          </p>
          <Button type="button" onClick={handleAddPhase}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            {t('phase.addFirstPhase')}
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={phases.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {phases.map((phase) => (
                <SortablePhaseItem
                  key={phase.id}
                  phase={phase}
                  onEdit={handleEditPhase}
                  onDelete={handleDeletePhase}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Phase Button */}
      {phases.length > 0 && (
        <Button type="button" variant="outline" onClick={handleAddPhase}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          {t('phase.addPhase')}
        </Button>
      )}

      {/* Edit Drawer */}
      {isCreating && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={handleCloseDrawer}
          />
          <PhaseEditDrawer
            phase={editingPhase}
            onSave={handleSavePhase}
            onClose={handleCloseDrawer}
          />
        </>
      )}
    </div>
  );
}
