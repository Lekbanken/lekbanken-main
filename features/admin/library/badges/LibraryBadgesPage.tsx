'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  SparklesIcon,
  PlusIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Select } from '@/components/ui';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from '@/components/admin/shared';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';

import { themes } from '@/features/admin/achievements/data';
import type { AchievementFilters, AchievementItem, AchievementTheme } from '@/features/admin/achievements/types';
import { normalizeIconConfig } from '@/features/admin/achievements/icon-utils';
import { extractBadgeItem, buildExportJson } from '@/features/admin/achievements/export-utils';
import { AchievementLibraryGrid } from '@/features/admin/achievements/components/AchievementLibraryGrid';
import { AchievementEditor } from '@/features/admin/achievements/editor/AchievementEditor';

type AwardBuilderExportListRow = {
  id: string;
  tenant_id: string | null;
  scope_type: 'global' | 'tenant' | string;
  schema_version: string;
  exported_at: string;
  exported_by_user_id: string | null;
  exported_by_tool: string | null;
  export?: unknown;
  created_at: string;
  updated_at: string;
};

type AwardBuilderExportRow = {
  id: string;
  tenant_id: string | null;
  scope_type: 'global' | 'tenant' | string;
  schema_version: string;
  exported_at: string;
  exported_by_user_id: string | null;
  exported_by_tool: string | null;
  export: unknown;
  created_at: string;
  updated_at: string;
};

export function LibraryBadgesPage() {
  const t = useTranslations('admin.library.badges');
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useAuth();

  const { can, isSystemAdmin } = useRbac();
  const { currentTenant, isLoadingTenants } = useTenant();

  const canView = can('admin.achievements.list');
  const canCreate = can('admin.achievements.create');
  const canEdit = can('admin.achievements.edit');

  const tenantId = currentTenant?.id ?? null;

  const scopeTypeParam = searchParams.get('scopeType');
  const requestedScopeType = scopeTypeParam === 'global' ? 'global' : 'tenant';
  const scopeType: 'tenant' | 'global' = isSystemAdmin ? requestedScopeType : 'tenant';

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [_rows, setRows] = useState<AwardBuilderExportListRow[]>([]);
  const [badges, setBadges] = useState<AchievementItem[]>([]);
  const [filters, setFilters] = useState<AchievementFilters>({
    search: '',
    theme: 'all',
    status: 'all',
    sort: 'recent',
  });

  const exportId = searchParams.get('exportId');
  const [editing, setEditing] = useState<AchievementItem | null>(null);

  const themeMap = useMemo<Record<string, AchievementTheme>>(
    () => Object.fromEntries(themes.map((t) => [t.id, t])),
    [],
  );

  const refreshList = useCallback(async () => {
    if (scopeType === 'tenant' && !tenantId) {
      setLoadError('No active tenant');
      setRows([]);
      setBadges([]);
      return;
    }

    if (scopeType === 'global' && !isSystemAdmin) {
      setLoadError('Forbidden');
      setRows([]);
      setBadges([]);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const url =
        scopeType === 'global'
          ? '/api/admin/award-builder/exports?scopeType=global'
          : `/api/admin/award-builder/exports?scopeType=tenant&tenantId=${tenantId}`;
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to load badges';
        throw new Error(msg);
      }

      const nextRows = (json?.exports ?? []) as AwardBuilderExportListRow[];
      setRows(nextRows);

      const nextBadges: AchievementItem[] = [];
      for (const r of nextRows) {
        try {
          nextBadges.push(extractBadgeItem(r.id, r.export));
        } catch (e) {
          // Strict mode: schema violations are surfaced to the user.
          const msg = e instanceof Error ? e.message : 'Export JSON invalid'
          throw new Error(msg)
        }
      }

      setBadges(nextBadges);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load badges';
      setLoadError(message);
      setRows([]);
      setBadges([]);
    } finally {
      setIsLoading(false);
    }
  }, [isSystemAdmin, scopeType, tenantId]);

  const loadOneIfNeeded = useCallback(
    async (targetId: string) => {
      // If already in list, just select it.
      const existing = badges.find((b) => b.id === targetId);
      if (existing) {
        setEditing(existing);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(`/api/admin/award-builder/exports/${targetId}`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          const msg = typeof json?.error === 'string' ? json.error : 'Failed to load badge';
          throw new Error(msg);
        }

        const row = json?.export as AwardBuilderExportRow | undefined;
        const item = extractBadgeItem(row?.id ?? targetId, row?.export);

        setBadges((prev) => {
          if (prev.some((p) => p.id === item.id)) return prev;
          return [item, ...prev];
        });
        setRows((prev) => {
          if (!row) return prev;
          if (prev.some((p) => p.id === row.id)) return prev;
          return [row as AwardBuilderExportListRow, ...prev];
        });
        setEditing(item);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load badge';
        setLoadError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [badges],
  );

  useEffect(() => {
    if (scopeType === 'tenant' && !tenantId) return;
    if (scopeType === 'global' && !isSystemAdmin) return;
    refreshList();
  }, [isSystemAdmin, scopeType, tenantId, refreshList]);

  useEffect(() => {
    if (!exportId) {
      setEditing(null);
      return;
    }
    void loadOneIfNeeded(exportId);
  }, [exportId, loadOneIfNeeded]);

  const filtered = useMemo(() => {
    const query = filters.search.toLowerCase();
    const bySearch = badges.filter((ach) =>
      [
        ach.title,
        ach.subtitle ?? '',
        ach.icon.symbol?.id ?? '',
        ...(ach.icon.backgrounds?.map((b) => b.id) ?? []),
        ...(ach.icon.foregrounds?.map((f) => f.id) ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
    const byTheme =
      filters.theme === 'all' ? bySearch : bySearch.filter((ach) => ach.icon.themeId === filters.theme);
    const byStatus =
      filters.status === 'all'
        ? byTheme
        : byTheme.filter((ach) => (ach.status ?? 'draft') === filters.status);

    const sorted = [...byStatus].sort((a, b) => {
      if (filters.sort === 'name') return a.title.localeCompare(b.title);
      return (b.rewardCoins ?? 0) - (a.rewardCoins ?? 0);
    });

    return sorted;
  }, [badges, filters]);

  const setExportId = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('exportId', next);
      else params.delete('exportId');
      const qs = params.toString();
      router.replace(qs ? `/admin/library/badges?${qs}` : '/admin/library/badges');
    },
    [router, searchParams],
  );

  const setScope = useCallback(
    (next: 'tenant' | 'global') => {
      const params = new URLSearchParams(searchParams.toString());

      // Switching scope invalidates the current editor context.
      params.delete('exportId');
      params.set('scopeType', next);

      const qs = params.toString();
      router.replace(qs ? `/admin/library/badges?${qs}` : '/admin/library/badges');
    },
    [router, searchParams],
  );

  const handleCreate = useCallback(async () => {
    if (scopeType === 'tenant' && !tenantId) throw new Error('No active tenant');
    if (scopeType === 'global' && !isSystemAdmin) throw new Error('Forbidden');
    if (!user?.id) throw new Error('Unauthorized');

    const resolvedTenantId = scopeType === 'tenant' ? tenantId : null;
    const scope =
      scopeType === 'global'
        ? ({ type: 'global' } as const)
        : ({ type: 'tenant', tenantId: resolvedTenantId as string } as const);

    // Use a temporary ID that will be replaced server-side
    const tempId = `temp-${Date.now()}`;
    const draft: AchievementItem = {
      id: tempId,
      title: '',
      subtitle: '',
      rewardCoins: 0,
      icon: normalizeIconConfig({
        mode: 'theme',
        themeId: themes[0]?.id ?? 'gold',
        size: 'lg',
        base: { id: 'base_circle' },
        symbol: null,
        backgrounds: [],
        foregrounds: [],
      }),
      profileFrameSync: { enabled: false },
      publishedRoles: [],
      status: 'draft',
      version: 1,
    };

    const res = await fetch('/api/admin/award-builder/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scopeType,
        tenantId: resolvedTenantId,
        schemaVersion: '1.0',
        exportedByTool: 'admin-library-badges',
        export: buildExportJson({
          scope,
          actorUserId: user.id,
          tool: 'admin-library-badges',
          nowIso: new Date().toISOString(),
          exportId: tempId,
          badge: draft,
        }),
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof json?.error === 'string' ? json.error : 'Failed to create badge';
      throw new Error(msg);
    }

    const id = String(json?.id ?? '');
    if (!id) throw new Error('Failed to create badge (missing id)');

    // Server now returns the updated export with correct ID - use it directly
    const serverExport = json?.export;
    const created: AchievementItem = { ...draft, id };

    setBadges((prev) => [created, ...prev]);
    setRows((prev) => [{
      id,
      tenant_id: resolvedTenantId,
      scope_type: scopeType,
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by_user_id: user.id,
      exported_by_tool: 'admin-library-badges',
      export: serverExport ?? buildExportJson({
        scope,
        actorUserId: user.id,
        tool: 'admin-library-badges',
        nowIso: new Date().toISOString(),
        exportId: id,
        badge: created,
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, ...prev]);
    setExportId(id);
  }, [isSystemAdmin, scopeType, setExportId, tenantId, user?.id]);

  const handleEdit = useCallback(
    (item: AchievementItem) => {
      setExportId(item.id);
    },
    [setExportId],
  );

  const handleCancel = useCallback(() => {
    setExportId(null);
  }, [setExportId]);

  const handleSave = useCallback(
    async (item: AchievementItem) => {
      if (scopeType === 'tenant' && !tenantId) throw new Error('No active tenant');
      if (scopeType === 'global' && !isSystemAdmin) throw new Error('Forbidden');
      if (!canEdit) throw new Error('Forbidden');
      if (!user?.id) throw new Error('Unauthorized');

      const resolvedTenantId = scopeType === 'tenant' ? tenantId : null;
      const scope =
        scopeType === 'global'
          ? ({ type: 'global' } as const)
          : ({ type: 'tenant', tenantId: resolvedTenantId as string } as const);

      const current = badges.find((b) => b.id === item.id);
      const nextVersion = (current?.version ?? item.version ?? 1) + 1;
      const nextItem: AchievementItem = { ...item, version: nextVersion };

      const exportJson = buildExportJson({
        scope,
        actorUserId: user.id,
        tool: 'admin-library-badges',
        nowIso: new Date().toISOString(),
        exportId: nextItem.id,
        badge: nextItem,
      });

      const res = await fetch(`/api/admin/award-builder/exports/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schemaVersion: '1.0',
          exportedAt: new Date().toISOString(),
          exportedByTool: 'admin-library-badges',
          export: exportJson,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to save badge';
        throw new Error(msg);
      }

      setBadges((prev) => prev.map((b) => (b.id === nextItem.id ? nextItem : b)));
      setRows((prev) =>
        prev.map((r) => (r.id === nextItem.id ? { ...r, export: exportJson, updated_at: new Date().toISOString() } : r)),
      );
      setEditing(nextItem);
    },
    [badges, canEdit, isSystemAdmin, scopeType, tenantId, user?.id],
  );

  const publishedCount = badges.filter((b) => b.status === 'published').length;
  const draftCount = badges.filter((b) => (b.status ?? 'draft') === 'draft').length;

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/admin' },
          { label: t('breadcrumbs.library') },
          { label: t('breadcrumbs.badges') },
        ]}
      />

      <AdminPageHeader
        icon={<SparklesIcon className="h-6 w-6" />}
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {isSystemAdmin && (
              <div className="w-44">
                <Select
                  aria-label="Scope"
                  value={scopeType}
                  onChange={(e) => setScope((e.target.value as 'tenant' | 'global') || 'tenant')}
                  options={[
                    { value: 'tenant', label: t('scopeTenant') },
                    { value: 'global', label: t('scopeGlobal') },
                  ]}
                />
              </div>
            )}

            {canCreate && (
              <Button
                onClick={() => {
                  void handleCreate().catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to create'));
                }}
                className="gap-2 shadow-sm"
                disabled={(scopeType === 'tenant' && (!tenantId || isLoadingTenants)) || (scopeType === 'global' && !isSystemAdmin)}
              >
                <PlusIcon className="h-4 w-4" />
                {t('createBadge')}
              </Button>
            )}
          </>
        }
      />

      {!canView && (
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
          {t('noPermission')}
        </div>
      )}

      {canView && (
        <>
          {loadError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {scopeType === 'tenant' && !tenantId && !isLoadingTenants && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              {t('selectTenant')}
            </div>
          )}

          {/* Badge Library Section */}
          <section>
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Squares2X2Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{t('badgesTitle')}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isLoading ? t('loading') : (filtered.length === 1 ? t('badgeCount', { count: filtered.length }) : t('badgeCountPlural', { count: filtered.length }))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {publishedCount} {t('published')}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {draftCount} {t('drafts')}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <AchievementLibraryGrid
                  achievements={filtered}
                  themes={themeMap}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onEdit={handleEdit}
                  onCreate={() => {
                    void handleCreate().catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to create'));
                  }}
                  selectedId={editing?.id}
                />
              </CardContent>
            </Card>
          </section>

          {/* Builder Section */}
          <section>
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <SparklesIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {editing ? t('editBadge') : t('badgeBuilder')}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {editing ? t('editing', { title: editing.title || t('untitled') }) : t('selectFromLibrary')}
                      </p>
                    </div>
                  </div>
                  {editing && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={editing.status === 'published' ? 'success' : 'secondary'}
                        size="sm"
                        dot
                      >
                        {editing.status === 'published' ? t('published') : t('drafts')}
                      </Badge>
                      {editing.version && (
                        <Badge variant="outline" size="sm">
                          v{editing.version}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {editing ? (
                  <AchievementEditor
                    value={editing}
                    themes={themes}
                    onChange={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                      <SparklesIcon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('selectOrCreate')}</h3>
                    <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                      {t('selectOrCreateDescription')}
                    </p>
                    {canCreate && (
                      <Button
                        onClick={() => {
                          void handleCreate().catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to create'));
                        }}
                        className="mt-6 gap-2"
                        disabled={(scopeType === 'tenant' && !tenantId) || (scopeType === 'global' && !isSystemAdmin)}
                      >
                        <PlusIcon className="h-4 w-4" />
                        {t('createBadge')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </AdminPageLayout>
  );
}
