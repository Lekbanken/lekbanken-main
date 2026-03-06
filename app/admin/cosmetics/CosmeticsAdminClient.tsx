'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from '@/components/admin/shared';
import { Badge, Button, Card, CardContent, Input, Select } from '@/components/ui';
import { CosmeticEditorDrawer } from './CosmeticEditorDrawer';
import { CosmeticGrantDialog } from './CosmeticGrantDialog';
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
  created_at: string;
  cosmetic_unlock_rules: { id: string; unlock_type: string; unlock_config: Record<string, unknown>; priority: number }[];
}

type FilterFaction = 'all' | 'forest' | 'sea' | 'desert' | 'void' | 'universal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS: CosmeticSlot[] = ['avatar_frame', 'scene_background', 'particles', 'xp_bar', 'section_divider'];
const RARITY_OPTIONS: CosmeticRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
const FACTION_OPTIONS: FilterFaction[] = ['all', 'forest', 'sea', 'desert', 'void', 'universal'];

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-zinc-200 text-zinc-800',
  uncommon: 'bg-green-100 text-green-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-amber-100 text-amber-800',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CosmeticsAdminClient() {
  const t = useTranslations('admin.gamification.cosmetics');

  const [cosmetics, setCosmetics] = useState<CosmeticRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [factionFilter, setFactionFilter] = useState<FilterFaction>('all');
  const [rarityFilter, setRarityFilter] = useState('all');

  // Editor drawer
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCosmetic, setEditingCosmetic] = useState<CosmeticRow | null>(null);

  // Grant dialog
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantCosmeticId, setGrantCosmeticId] = useState<string | null>(null);

  // Fetch cosmetics
  const fetchCosmetics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (factionFilter === 'universal') {
        // handled client-side
      } else if (factionFilter !== 'all') {
        params.set('factionId', factionFilter);
      }
      if (rarityFilter !== 'all') params.set('rarity', rarityFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/cosmetics?${params.toString()}`);
      if (!res.ok) throw new Error('Fetch failed');
      const json = await res.json();
      let items: CosmeticRow[] = json.cosmetics ?? [];

      // Client-side filter for "universal" (faction_id = null)
      if (factionFilter === 'universal') {
        items = items.filter((c) => c.faction_id === null);
      }

      setCosmetics(items);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, factionFilter, rarityFilter, search]);

  useEffect(() => {
    fetchCosmetics();
  }, [fetchCosmetics]);

  // Toggle active state
  async function toggleActive(cosmetic: CosmeticRow) {
    const newState = !cosmetic.is_active;
    const res = newState
      ? await fetch(`/api/admin/cosmetics/${cosmetic.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true }),
        })
      : await fetch(`/api/admin/cosmetics/${cosmetic.id}`, {
          method: 'DELETE',
        });

    if (res.ok) {
      fetchCosmetics();
    }
  }

  function openEditor(cosmetic?: CosmeticRow) {
    setEditingCosmetic(cosmetic ?? null);
    setEditorOpen(true);
  }

  function openGrant(cosmeticId: string) {
    setGrantCosmeticId(cosmeticId);
    setGrantOpen(true);
  }

  function factionLabel(factionId: string | null): string {
    if (!factionId) return t('factions.universal');
    return t(`factions.${factionId}` as Parameters<typeof t>[0]);
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.admin'), href: '/admin' },
          { label: t('breadcrumbs.cosmetics') },
        ]}
      />

      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
      />

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('filters.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          placeholder={t('filters.category')}
          className="w-44"
          options={[
            { value: 'all', label: t('filters.all') },
            ...CATEGORY_OPTIONS.map((c) => ({
              value: c,
              label: t(`categories.${c}` as Parameters<typeof t>[0]),
            })),
          ]}
        />

        <Select
          value={factionFilter}
          onChange={(e) => setFactionFilter(e.target.value as FilterFaction)}
          placeholder={t('filters.faction')}
          className="w-36"
          options={FACTION_OPTIONS.map((f) => ({
            value: f,
            label: f === 'all' ? t('filters.all') : t(`factions.${f}` as Parameters<typeof t>[0]),
          }))}
        />

        <Select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          placeholder={t('filters.rarity')}
          className="w-36"
          options={[
            { value: 'all', label: t('filters.all') },
            ...RARITY_OPTIONS.map((r) => ({
              value: r,
              label: t(`rarities.${r}` as Parameters<typeof t>[0]),
            })),
          ]}
        />

        <div className="ml-auto">
          <Button onClick={() => openEditor()}>
            {t('actions.create')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Loading…</p>
      ) : cosmetics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-semibold">{t('empty.title')}</p>
            <p className="text-muted-foreground mt-1">{t('empty.description')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('columns.key')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.category')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.faction')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.rarity')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.renderType')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.rules')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('columns.status')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cosmetics.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{c.key}</td>
                  <td className="px-4 py-3">{t(`categories.${c.category}` as Parameters<typeof t>[0])}</td>
                  <td className="px-4 py-3">{factionLabel(c.faction_id)}</td>
                  <td className="px-4 py-3">
                    <Badge className={RARITY_COLORS[c.rarity] ?? ''}>
                      {t(`rarities.${c.rarity}` as Parameters<typeof t>[0])}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.render_type}</td>
                  <td className="px-4 py-3 text-center">{c.cosmetic_unlock_rules?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.is_active ? 'default' : 'secondary'}>
                      {c.is_active ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditor(c)}>
                        {t('actions.edit')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleActive(c)}>
                        {c.is_active ? t('actions.deactivate') : t('actions.activate')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openGrant(c.id)}>
                        {t('actions.grant')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Drawer */}
      <CosmeticEditorDrawer
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingCosmetic(null); }}
        cosmetic={editingCosmetic}
        onSaved={fetchCosmetics}
      />

      {/* Grant Dialog */}
      <CosmeticGrantDialog
        open={grantOpen}
        onClose={() => { setGrantOpen(false); setGrantCosmeticId(null); }}
        cosmeticId={grantCosmeticId}
      />
    </AdminPageLayout>
  );
}
