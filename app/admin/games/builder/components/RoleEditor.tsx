'use client';

import { useState, useCallback } from 'react';
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
import { Card, Button, Input, Textarea, Select } from '@/components/ui';
import {
  PlusIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserGroupIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import type { AssignmentStrategy } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

export type RoleData = {
  id: string;
  name: string;
  icon: string;
  color: string;
  role_order: number;
  public_description: string;
  private_instructions: string;
  private_hints: string;
  min_count: number;
  max_count: number | null;
  assignment_strategy: AssignmentStrategy;
  scaling_rules: Record<string, unknown> | null;
  conflicts_with: string[] | null;
};

type RoleEditorProps = {
  roles: RoleData[];
  onChange: (roles: RoleData[]) => void;
};

// =============================================================================
// Role Color Config
// =============================================================================

const colorOptions = [
  { value: '#EF4444', label: 'Röd' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Gul' },
  { value: '#22C55E', label: 'Grön' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#3B82F6', label: 'Blå' },
  { value: '#8B5CF6', label: 'Lila' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#6B7280', label: 'Grå' },
];

const iconOptions = [
  { value: '🎭', label: 'Mask' },
  { value: '🕵️', label: 'Spion' },
  { value: '👑', label: 'Krona' },
  { value: '⚔️', label: 'Svärd' },
  { value: '🛡️', label: 'Sköld' },
  { value: '🔮', label: 'Kristallkula' },
  { value: '🌟', label: 'Stjärna' },
  { value: '🎯', label: 'Mål' },
  { value: '💡', label: 'Idé' },
  { value: '🔑', label: 'Nyckel' },
  { value: '🎪', label: 'Cirkustält' },
  { value: '🦸', label: 'Hjälte' },
  { value: '🧙', label: 'Trollkarl' },
  { value: '🤖', label: 'Robot' },
  { value: '👤', label: 'Person' },
];

const strategyOptions: { value: AssignmentStrategy; label: string }[] = [
  { value: 'random', label: 'Slumpmässig' },
  { value: 'leader_picks', label: 'Ledaren väljer' },
  { value: 'player_picks', label: 'Spelare väljer' },
];

// =============================================================================
// Sortable Role Card
// =============================================================================

type SortableRoleCardProps = {
  role: RoleData;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function SortableRoleCard({ role, onEdit, onDelete }: SortableRoleCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasPrivate = role.private_instructions || role.private_hints;
  const countText = role.max_count
    ? `${role.min_count}–${role.max_count}`
    : role.min_count > 0
    ? `min ${role.min_count}`
    : 'Obegränsad';

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

        {/* Role icon with color */}
        <div
          className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: role.color || '#6B7280' }}
        >
          {role.icon || '👤'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">
              {role.name || 'Namnlös roll'}
            </h4>
            {hasPrivate && (
              <span className="text-muted-foreground" title="Har hemliga instruktioner">
                <EyeSlashIcon className="h-4 w-4" />
              </span>
            )}
          </div>

          {role.public_description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {role.public_description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserGroupIcon className="h-3.5 w-3.5" />
              {countText}
            </span>
            <span>
              {strategyOptions.find((s) => s.value === role.assignment_strategy)?.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(role.id)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(role.id)}
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
// Role Edit Drawer
// =============================================================================

type RoleEditDrawerProps = {
  role: RoleData | null;
  onSave: (role: RoleData) => void;
  onClose: () => void;
};

function RoleEditDrawer({ role, onSave, onClose }: RoleEditDrawerProps) {
  const [form, setForm] = useState<RoleData>(
    role || {
      id: `role-${Date.now()}`,
      name: '',
      icon: '👤',
      color: '#3B82F6',
      role_order: 0,
      public_description: '',
      private_instructions: '',
      private_hints: '',
      min_count: 0,
      max_count: null,
      assignment_strategy: 'random',
      scaling_rules: null,
      conflicts_with: null,
    }
  );

  const [activeTab, setActiveTab] = useState<'basic' | 'public' | 'private' | 'rules'>('basic');

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  const tabs = [
    { id: 'basic', label: 'Grundinfo' },
    { id: 'public', label: 'Publik info' },
    { id: 'private', label: 'Hemligt' },
    { id: 'rules', label: 'Regler' },
  ] as const;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {role ? 'Redigera roll' : 'Ny roll'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {activeTab === 'basic' && (
          <>
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Namn <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex. Detektiv"
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ikon</label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, icon: opt.value })}
                    className={`h-10 w-full flex items-center justify-center text-xl rounded-lg border transition-all ${
                      form.icon === opt.value
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    title={opt.label}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Färg</label>
              <div className="grid grid-cols-9 gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: opt.value })}
                    className={`h-8 w-full rounded-full border-2 transition-all ${
                      form.color === opt.value
                        ? 'border-foreground ring-2 ring-primary/50'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>

            {/* Assignment Strategy */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tilldelningsstrategi</label>
              <Select
                value={form.assignment_strategy}
                onChange={(e) =>
                  setForm({ ...form, assignment_strategy: e.target.value as AssignmentStrategy })
                }
                options={strategyOptions}
              />
            </div>
          </>
        )}

        {activeTab === 'public' && (
          <>
            {/* Public description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Publik beskrivning</label>
              <p className="text-xs text-muted-foreground">
                Visas för alla deltagare och på den publika tavlan.
              </p>
              <Textarea
                value={form.public_description}
                onChange={(e) => setForm({ ...form, public_description: e.target.value })}
                placeholder="Beskriv rollens synliga egenskaper..."
                rows={6}
              />
            </div>
          </>
        )}

        {activeTab === 'private' && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
              <LockClosedIcon className="h-5 w-5 flex-shrink-0" />
              <span>Denna information visas endast för deltagaren med rollen.</span>
            </div>

            {/* Private instructions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Hemliga instruktioner</label>
              <p className="text-xs text-muted-foreground">
                Rollens mål och uppgifter som endast spelaren ser.
              </p>
              <Textarea
                value={form.private_instructions}
                onChange={(e) => setForm({ ...form, private_instructions: e.target.value })}
                placeholder="Ditt hemliga uppdrag är att..."
                rows={5}
              />
            </div>

            {/* Private hints */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tips & ledtrådar</label>
              <p className="text-xs text-muted-foreground">
                Extra hjälp och strategitips för rollen.
              </p>
              <Textarea
                value={form.private_hints}
                onChange={(e) => setForm({ ...form, private_hints: e.target.value })}
                placeholder="Tips: Försök att..."
                rows={4}
              />
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <>
            {/* Min count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Minsta antal</label>
              <p className="text-xs text-muted-foreground">
                Hur många spelare som minst behöver denna roll.
              </p>
              <Input
                type="number"
                min={0}
                value={form.min_count}
                onChange={(e) => setForm({ ...form, min_count: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Max count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Högsta antal</label>
              <p className="text-xs text-muted-foreground">
                Lämna tomt för obegränsat.
              </p>
              <Input
                type="number"
                min={0}
                value={form.max_count ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_count: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                placeholder="Obegränsad"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button variant="ghost" onClick={onClose}>
          Avbryt
        </Button>
        <Button onClick={handleSave} disabled={!form.name.trim()}>
          {role ? 'Spara ändringar' : 'Lägg till roll'}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main RoleEditor Component
// =============================================================================

export function RoleEditor({ roles, onChange }: RoleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
        const oldIndex = roles.findIndex((r) => r.id === active.id);
        const newIndex = roles.findIndex((r) => r.id === over.id);
        const reordered = arrayMove(roles, oldIndex, newIndex).map((r, idx) => ({
          ...r,
          role_order: idx,
        }));
        onChange(reordered);
      }
    },
    [roles, onChange]
  );

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    const updated = roles
      .filter((r) => r.id !== id)
      .map((r, idx) => ({ ...r, role_order: idx }));
    onChange(updated);
  };

  const handleSave = (role: RoleData) => {
    if (isAdding) {
      const newRole = { ...role, role_order: roles.length };
      onChange([...roles, newRole]);
    } else {
      onChange(roles.map((r) => (r.id === role.id ? role : r)));
    }
    setEditingId(null);
    setIsAdding(false);
  };

  const handleClose = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const editingRole = editingId ? roles.find((r) => r.id === editingId) || null : null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Roller</h3>
          <p className="text-sm text-muted-foreground">
            Definiera spelarroller med hemliga instruktioner
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
        >
          <PlusIcon className="h-4 w-4 mr-1.5" />
          Lägg till roll
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <UserGroupIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Inga roller definierade ännu</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Lägg till första rollen
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={roles.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {roles.map((role) => (
                <SortableRoleCard
                  key={role.id}
                  role={role}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Drawer */}
      {(editingId || isAdding) && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={handleClose}
          />
          <RoleEditDrawer
            role={isAdding ? null : editingRole}
            onSave={handleSave}
            onClose={handleClose}
          />
        </>
      )}
    </Card>
  );
}
