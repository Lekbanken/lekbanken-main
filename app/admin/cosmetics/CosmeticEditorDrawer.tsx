'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Select } from '@/components/ui';
import type { CosmeticSlot, CosmeticRarity } from '@/features/journey/cosmetic-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CosmeticRow {
  id: string;
  key: string;
  category: string;
  faction_id: string | null;
  rarity: string;
  render_type: string;
  render_config: Record<string, unknown>;
  name_key: string;
  description_key: string;
  sort_order: number;
  is_active: boolean;
  cosmetic_unlock_rules?: { id: string; unlock_type: string; unlock_config: Record<string, unknown>; priority: number }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  cosmetic: CosmeticRow | null;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: CosmeticSlot[] = ['avatar_frame', 'scene_background', 'particles', 'xp_bar', 'section_divider', 'title'];
const RARITIES: CosmeticRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const FACTIONS = ['forest', 'sea', 'desert', 'void'] as const;

const CATEGORY_RENDER_TYPES: Record<string, string> = {
  avatar_frame: 'svg_frame',
  scene_background: 'css_background',
  particles: 'css_particles',
  xp_bar: 'xp_skin',
  section_divider: 'css_divider',
  title: 'title',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CosmeticEditorDrawer({ open, onClose, cosmetic, onSaved }: Props) {
  const t = useTranslations('admin.gamification.cosmetics');
  const isEdit = !!cosmetic;

  // Form state
  const [key, setKey] = useState('');
  const [category, setCategory] = useState<string>('avatar_frame');
  const [factionId, setFactionId] = useState<string>('');
  const [rarity, setRarity] = useState<string>('common');
  const [nameKey, setNameKey] = useState('');
  const [descriptionKey, setDescriptionKey] = useState('');
  const [renderType, setRenderType] = useState('svg_frame');
  const [renderConfigJson, setRenderConfigJson] = useState('{}');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync render_type when category changes (for new cosmetics)
  useEffect(() => {
    if (!isEdit) {
      setRenderType(CATEGORY_RENDER_TYPES[category] ?? 'svg_frame');
    }
  }, [category, isEdit]);

  // Populate form when editing
  useEffect(() => {
    if (cosmetic) {
      setKey(cosmetic.key);
      setCategory(cosmetic.category);
      setFactionId(cosmetic.faction_id ?? '');
      setRarity(cosmetic.rarity);
      setNameKey(cosmetic.name_key);
      setDescriptionKey(cosmetic.description_key);
      setRenderType(cosmetic.render_type);
      setRenderConfigJson(JSON.stringify(cosmetic.render_config, null, 2));
      setSortOrder(cosmetic.sort_order);
      setIsActive(cosmetic.is_active);
      // Extract required_level from level-type unlock rule
      const levelRule = cosmetic.cosmetic_unlock_rules?.find(r => r.unlock_type === 'level');
      setRequiredLevel(
        levelRule?.unlock_config?.required_level != null
          ? Number(levelRule.unlock_config.required_level)
          : null
      );
    } else {
      setKey('');
      setCategory('avatar_frame');
      setFactionId('');
      setRarity('common');
      setNameKey('');
      setDescriptionKey('');
      setRenderType('svg_frame');
      setRenderConfigJson('{}');
      setSortOrder(0);
      setIsActive(true);
      setRequiredLevel(null);
    }
    setError(null);
  }, [cosmetic]);

  async function handleSave() {
    setError(null);
    setSaving(true);

    let renderConfig: Record<string, unknown>;
    try {
      renderConfig = JSON.parse(renderConfigJson);
    } catch {
      setError('Invalid JSON in render config');
      setSaving(false);
      return;
    }

    const payload = {
      key,
      category,
      factionId: factionId || null,
      rarity,
      nameKey,
      descriptionKey,
      renderType,
      renderConfig,
      sortOrder,
      isActive,
      requiredLevel,
    };

    try {
      const url = isEdit
        ? `/api/admin/cosmetics/${cosmetic!.id}`
        : '/api/admin/cosmetics';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Save failed');
        return;
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />

      {/* Drawer */}
      <div className="relative z-10 flex w-full max-w-lg flex-col overflow-y-auto bg-background shadow-xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? t('breadcrumbs.edit') : t('breadcrumbs.create')}
          </h2>
        </div>

        <div className="flex-1 space-y-4 px-6 py-4">
          {/* Key */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.key')}</label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder={t('form.keyPlaceholder')} />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.category')}</label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: t(`categories.${c}` as Parameters<typeof t>[0]),
              }))}
            />
          </div>

          {/* Faction */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.faction')}</label>
            <Select
              value={factionId || '__none__'}
              onChange={(e) => setFactionId(e.target.value === '__none__' ? '' : e.target.value)}
              options={[
                { value: '__none__', label: t('form.factionNone') },
                ...FACTIONS.map((f) => ({
                  value: f,
                  label: t(`factions.${f}` as Parameters<typeof t>[0]),
                })),
              ]}
            />
          </div>

          {/* Rarity */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.rarity')}</label>
            <Select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              options={RARITIES.map((r) => ({
                value: r,
                label: t(`rarities.${r}` as Parameters<typeof t>[0]),
              }))}
            />
          </div>

          {/* Name key */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.nameKey')}</label>
            <Input value={nameKey} onChange={(e) => setNameKey(e.target.value)} placeholder={t('form.nameKeyPlaceholder')} />
          </div>

          {/* Description key */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.descriptionKey')}</label>
            <Input value={descriptionKey} onChange={(e) => setDescriptionKey(e.target.value)} placeholder={t('form.descriptionKeyPlaceholder')} />
          </div>

          {/* Render type */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.renderType')}</label>
            <Input value={renderType} readOnly className="bg-muted" />
            <p className="mt-1 text-xs text-muted-foreground">
              Auto-assigned by category
            </p>
          </div>

          {/* Render config */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.renderConfig')}</label>
            <textarea
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
              value={renderConfigJson}
              onChange={(e) => setRenderConfigJson(e.target.value)}
            />
          </div>

          {/* Sort order */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.sortOrder')}</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>

          {/* Required level */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('form.requiredLevel')}</label>
            <Input
              type="number"
              min={1}
              value={requiredLevel ?? ''}
              onChange={(e) => setRequiredLevel(e.target.value ? Number(e.target.value) : null)}
              placeholder={t('form.requiredLevelPlaceholder')}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('form.requiredLevelHint')}
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
              id="is-active-toggle"
            />
            <label htmlFor="is-active-toggle" className="text-sm font-medium">{t('form.isActive')}</label>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('actions.saving') : t('actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
