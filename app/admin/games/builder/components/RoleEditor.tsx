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
  { value: '#EF4444', labelKey: 'role.colors.red' },
  { value: '#F97316', labelKey: 'role.colors.orange' },
  { value: '#EAB308', labelKey: 'role.colors.yellow' },
  { value: '#22C55E', labelKey: 'role.colors.green' },
  { value: '#06B6D4', labelKey: 'role.colors.cyan' },
  { value: '#3B82F6', labelKey: 'role.colors.blue' },
  { value: '#8B5CF6', labelKey: 'role.colors.purple' },
  { value: '#EC4899', labelKey: 'role.colors.pink' },
  { value: '#6B7280', labelKey: 'role.colors.gray' },
];

const iconOptions = [
  { value: '🎭', labelKey: 'role.icons.mask' },
  { value: '🕵️', labelKey: 'role.icons.spy' },
  { value: '👑', labelKey: 'role.icons.crown' },
  { value: '⚔️', labelKey: 'role.icons.sword' },
  { value: '🛡️', labelKey: 'role.icons.shield' },
  { value: '🔮', labelKey: 'role.icons.crystal' },
  { value: '🌟', labelKey: 'role.icons.star' },
  { value: '🎯', labelKey: 'role.icons.target' },
  { value: '💡', labelKey: 'role.icons.idea' },
  { value: '🔑', labelKey: 'role.icons.key' },
  { value: '🎪', labelKey: 'role.icons.circus' },
  { value: '🦸', labelKey: 'role.icons.hero' },
  { value: '🧙', labelKey: 'role.icons.wizard' },
  { value: '🤖', labelKey: 'role.icons.robot' },
  { value: '👤', labelKey: 'role.icons.person' },
];

const strategyOptions: { value: AssignmentStrategy; labelKey: string }[] = [
  { value: 'random', labelKey: 'role.strategies.random' },
  { value: 'leader_picks', labelKey: 'role.strategies.leader_picks' },
  { value: 'player_picks', labelKey: 'role.strategies.player_picks' },
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
  const t = useTranslations('admin.games.builder');
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
    ? t('role.range', { min: role.min_count, max: role.max_count })
    : role.min_count > 0
    ? t('role.min', { count: role.min_count })
    : t('role.unlimited');

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
              {role.name || t('role.unnamed')}
            </h4>
            {hasPrivate && (
              <span className="text-muted-foreground" title={t('role.hasPrivate')}>
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
              {t(strategyOptions.find((s) => s.value === role.assignment_strategy)?.labelKey || 'role.strategies.random')}
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
  const t = useTranslations('admin.games.builder');
  const generatedId = useId();
  const initialForm = useMemo<RoleData>(
    () =>
      role || {
        id: `role-${generatedId}`,
        name: '',
        icon: '??',
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
      },
    [role, generatedId]
  );
  const [form, setForm] = useState<RoleData>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const [activeTab, setActiveTab] = useState<'basic' | 'public' | 'private' | 'rules'>('basic');

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  const tabs = [
    { id: 'basic', labelKey: 'role.tabs.basic' },
    { id: 'public', labelKey: 'role.tabs.public' },
    { id: 'private', labelKey: 'role.tabs.private' },
    { id: 'rules', labelKey: 'role.tabs.rules' },
  ] as const;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {role ? t('role.editRole') : t('role.newRole')}
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
            {t(tab.labelKey)}
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
                {t('role.fields.name')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('role.namePlaceholder')}
              />
            </div>

            {/* Icon */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.icon')}</label>
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
                    title={t(opt.labelKey)}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.color')}</label>
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
                    title={t(opt.labelKey)}
                  />
                ))}
              </div>
            </div>

            {/* Assignment Strategy */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.strategy')}</label>
              <Select
                value={form.assignment_strategy}
                onChange={(e) =>
                  setForm({ ...form, assignment_strategy: e.target.value as AssignmentStrategy })
                }
                options={strategyOptions.map(o => ({ value: o.value, label: t(o.labelKey) }))}
              />
            </div>
          </>
        )}

        {activeTab === 'public' && (
          <>
            {/* Public description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.publicDescription')}</label>
              <p className="text-xs text-muted-foreground">
                {t('role.publicDescriptionHelp')}
              </p>
              <Textarea
                value={form.public_description}
                onChange={(e) => setForm({ ...form, public_description: e.target.value })}
                placeholder={t('role.publicDescriptionPlaceholder')}
                rows={6}
              />
            </div>
          </>
        )}

        {activeTab === 'private' && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
              <LockClosedIcon className="h-5 w-5 flex-shrink-0" />
              <span>{t('role.privateInfoWarning')}</span>
            </div>

            {/* Private instructions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.privateInstructions')}</label>
              <p className="text-xs text-muted-foreground">
                {t('role.privateInstructionsHelp')}
              </p>
              <Textarea
                value={form.private_instructions}
                onChange={(e) => setForm({ ...form, private_instructions: e.target.value })}
                placeholder={t('role.privateInstructionsPlaceholder')}
                rows={5}
              />
            </div>

            {/* Private hints */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.privateHints')}</label>
              <p className="text-xs text-muted-foreground">
                {t('role.privateHintsHelp')}
              </p>
              <Textarea
                value={form.private_hints}
                onChange={(e) => setForm({ ...form, private_hints: e.target.value })}
                placeholder={t('role.privateHintsPlaceholder')}
                rows={4}
              />
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <>
            {/* Min count */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('role.fields.minCount')}</label>
              <p className="text-xs text-muted-foreground">
                {t('role.minCountHelp')}
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
              <label className="text-sm font-medium text-foreground">{t('role.fields.maxCount')}</label>
              <p className="text-xs text-muted-foreground">
                {t('role.maxCountHelp')}
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
                placeholder={t('role.unlimited')}
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
        <Button variant="ghost" onClick={onClose}>
          {t('role.cancel')}
        </Button>
        <Button onClick={handleSave} disabled={!form.name.trim()}>
          {role ? t('role.saveChanges') : t('role.addRole')}
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Main RoleEditor Component
// =============================================================================

export function RoleEditor({ roles, onChange }: RoleEditorProps) {
  const t = useTranslations('admin.games.builder');
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
          <h3 className="text-lg font-semibold text-foreground">{t('role.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('role.subtitle')}
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
          {t('role.addRole')}
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <UserGroupIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{t('role.noRolesYet')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            {t('role.addFirstRole')}
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
