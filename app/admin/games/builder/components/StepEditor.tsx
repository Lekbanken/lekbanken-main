'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button, Input, Textarea } from '@/components/ui';
import {
  Bars3Icon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export type StepData = {
  id: string;
  title: string;
  body: string;
  duration_seconds: number | null;
  leader_script?: string;
};

type SortableStepItemProps = {
  step: StepData;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  canRemove: boolean;
};

function SortableStepItem({ step, index, onEdit, onRemove, canRemove }: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const durationMinutes = step.duration_seconds ? Math.round(step.duration_seconds / 60) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 transition-shadow',
        isDragging && 'shadow-lg ring-2 ring-primary/20 z-10'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <h4 className="font-medium text-foreground truncate">
            {step.title || 'Namnlöst steg'}
          </h4>
          {durationMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="h-3.5 w-3.5" />
              {durationMinutes} min
            </span>
          )}
        </div>
        {step.body && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {step.body}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

type StepEditorDrawerProps = {
  step: StepData | null;
  onSave: (step: StepData) => void;
  onClose: () => void;
};

function StepEditorDrawer({ step, onSave, onClose }: StepEditorDrawerProps) {
  const [formData, setFormData] = useState<StepData>(
    step || { id: '', title: '', body: '', duration_seconds: null }
  );

  if (!step) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-foreground">Redigera steg</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Rubrik <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex. Samla gruppen"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Beskrivning
            </label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={5}
              placeholder="Vad ska deltagarna göra i detta steg?"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              💬 Ledarskript (valfritt)
            </label>
            <Textarea
              value={formData.leader_script || ''}
              onChange={(e) => setFormData({ ...formData, leader_script: e.target.value })}
              rows={3}
              placeholder="Säg till gruppen: 'Nu ska vi...'"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ordagrant vad ledaren kan säga till gruppen
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              ⏱ Beräknad tid (sekunder)
            </label>
            <Input
              type="number"
              min={0}
              value={formData.duration_seconds ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  duration_seconds: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="Ex. 120 (2 minuter)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="submit">Spara steg</Button>
        </div>
      </form>
    </div>
  );
}

type StepEditorProps = {
  steps: StepData[];
  onChange: (steps: StepData[]) => void;
};

export function StepEditor({ steps, onChange }: StepEditorProps) {
  const [editingStep, setEditingStep] = useState<StepData | null>(null);

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
        const oldIndex = steps.findIndex((s) => s.id === active.id);
        const newIndex = steps.findIndex((s) => s.id === over.id);
        onChange(arrayMove(steps, oldIndex, newIndex));
      }
    },
    [steps, onChange]
  );

  const addStep = () => {
    const newStep: StepData = {
      id: `step-${Date.now()}`,
      title: '',
      body: '',
      duration_seconds: null,
    };
    onChange([...steps, newStep]);
    setEditingStep(newStep);
  };

  const removeStep = (id: string) => {
    if (steps.length <= 1) return;
    onChange(steps.filter((s) => s.id !== id));
  };

  const updateStep = (updated: StepData) => {
    onChange(steps.map((s) => (s.id === updated.id ? updated : s)));
    setEditingStep(null);
  };

  // Ensure steps have IDs
  const stepsWithIds = steps.map((s, idx) => ({
    ...s,
    id: s.id || `step-${idx}`,
  }));

  const hasEmptySteps = stepsWithIds.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Steg-för-steg</h3>
          <p className="text-sm text-muted-foreground">
            Dra för att ändra ordning. Klicka för att redigera.
          </p>
        </div>
        <Button type="button" size="sm" onClick={addStep}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Lägg till steg
        </Button>
      </div>

      {hasEmptySteps ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <PlusIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="font-medium text-foreground mb-1">Inga steg ännu</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Lägg till steg för att guida ledaren genom leken.
          </p>
          <Button type="button" onClick={addStep}>
            + Lägg till första steget
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stepsWithIds.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {stepsWithIds.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={() => setEditingStep(step)}
                  onRemove={() => removeStep(step.id)}
                  canRemove={steps.length > 1}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Editor Drawer */}
      {editingStep && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setEditingStep(null)}
          />
          <StepEditorDrawer
            step={editingStep}
            onSave={updateStep}
            onClose={() => setEditingStep(null)}
          />
        </>
      )}
    </div>
  );
}
