'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  TagIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  useToast,
} from '@/components/ui';
import type { CategoryAdminRow, SyncBundleResult } from './types';
import { CategoryCreateDialog } from './CategoryCreateDialog';

// ============================================================================
// EDIT ROW COMPONENT
// ============================================================================

type EditableFields = Pick<
  CategoryAdminRow,
  'name' | 'description_short' | 'icon_key' | 'sort_order' | 'is_public' | 'bundle_product_id'
>;

function CategoryEditRow({
  category,
  onSave,
  onCancel,
  t,
}: {
  category: CategoryAdminRow;
  onSave: (id: string, updates: Partial<EditableFields>) => Promise<void>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [fields, setFields] = useState<EditableFields>({
    name: category.name,
    description_short: category.description_short,
    icon_key: category.icon_key,
    sort_order: category.sort_order,
    is_public: category.is_public,
    bundle_product_id: category.bundle_product_id,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(category.id, fields);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-accent/30">
      <td className="px-4 py-2 text-sm font-mono text-muted-foreground">{category.slug}</td>
      <td className="px-4 py-2">
        <Input
          value={fields.name}
          onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
          className="h-8 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          value={fields.description_short ?? ''}
          onChange={(e) =>
            setFields((f) => ({ ...f, description_short: e.target.value || null }))
          }
          className="h-8 text-sm"
          placeholder="—"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          value={fields.icon_key ?? ''}
          onChange={(e) => setFields((f) => ({ ...f, icon_key: e.target.value || null }))}
          className="h-8 text-sm w-36"
          placeholder="TrophyIcon"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          type="number"
          value={fields.sort_order}
          onChange={(e) => {
            const n = Number(e.target.value);
            setFields((f) => ({ ...f, sort_order: Number.isFinite(n) ? n : 0 }));
          }}
          className="h-8 text-sm w-16"
        />
      </td>
      <td className="px-4 py-2 text-center">
        <button
          type="button"
          onClick={() => setFields((f) => ({ ...f, is_public: !f.is_public }))}
          className="inline-flex items-center justify-center"
          title={fields.is_public ? t('visible') : t('hidden')}
        >
          {fields.is_public ? (
            <EyeIcon className="h-5 w-5 text-emerald-600" />
          ) : (
            <EyeSlashIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">{category.product_count}</td>
      <td className="px-4 py-2">
        <Input
          value={fields.bundle_product_id ?? ''}
          onChange={(e) =>
            setFields((f) => ({ ...f, bundle_product_id: e.target.value || null }))
          }
          className="h-8 text-sm w-36 font-mono"
          placeholder="—"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={handleSave} disabled={saving}>
            <CheckIcon className="h-4 w-4 text-emerald-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
            <XMarkIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function CategoriesAdminPage() {
  const t = useTranslations('admin.categories');
  const toast = useToast();

  const [categories, setCategories] = useState<CategoryAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Fetch categories ──────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCategories(json.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // ── Save category ─────────────────────────────────────────────────────────
  const handleSave = async (id: string, updates: Partial<EditableFields>) => {
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error ?? 'Update failed');
      }
      toast.success(t('savedDescription'), t('saved'));
      setEditingId(null);
      void fetchCategories();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unknown error',
        t('saveError'),
      );
    }
  };

  // ── Sync bundle ───────────────────────────────────────────────────────────
  const handleSyncBundle = async (slug: string) => {
    setSyncingSlug(slug);
    try {
      const res = await fetch('/api/admin/categories/sync-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errBody.error ?? 'Sync failed');
      }
      const { result } = (await res.json()) as { result: SyncBundleResult };
      toast.success(
        t('syncDescription', {
          added: result.added_count,
          removed: result.removed_count,
          total: result.total_count,
        }),
        t('syncSuccess'),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unknown error',
        t('syncError'),
      );
    } finally {
      setSyncingSlug(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const publicCount = categories.filter((c) => c.is_public).length;
  const hiddenCount = categories.length - publicCount;
  const totalProducts = categories.reduce((sum, c) => sum + c.product_count, 0);

  // ── Breadcrumbs ───────────────────────────────────────────────────────────
  const crumbs = [
    { label: 'Admin', href: '/admin' },
    { label: t('title') },
  ];

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState title={t('loadError')} description={error} onRetry={fetchCategories} />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={crumbs} />

      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<TagIcon className="h-6 w-6" />}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            {t('createButton')}
          </Button>
        }
      />

      <AdminStatGrid>
        <AdminStatCard label={t('statTotal')} value={categories.length} />
        <AdminStatCard label={t('statPublic')} value={publicCount} />
        <AdminStatCard label={t('statHidden')} value={hiddenCount} />
        <AdminStatCard label={t('statProducts')} value={totalProducts} />
      </AdminStatGrid>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <AdminEmptyState title={t('noCategories')} description={t('noCategoriesDescription')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colSlug')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colName')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colDescription')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colIcon')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colOrder')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('colPublic')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colProducts')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colBundle')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((cat) =>
                    editingId === cat.id ? (
                      <CategoryEditRow
                        key={cat.id}
                        category={cat}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                        t={t}
                      />
                    ) : (
                      <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {cat.slug}
                        </td>
                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                          {cat.description_short ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                          {cat.icon_key ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{cat.sort_order}</td>
                        <td className="px-4 py-3 text-center">
                          {cat.is_public ? (
                            <Badge variant="success">{t('visible')}</Badge>
                          ) : (
                            <Badge variant="secondary">{t('hidden')}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{cat.product_count}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                          {cat.bundle_product_id
                            ? cat.bundle_product_id.slice(0, 8) + '…'
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(cat.id)}
                              title={t('edit')}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                            {cat.bundle_product_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSyncBundle(cat.slug)}
                                disabled={syncingSlug === cat.slug}
                                title={t('syncBundle')}
                              >
                                <ArrowPathIcon
                                  className={`h-4 w-4 ${syncingSlug === cat.slug ? 'animate-spin' : ''}`}
                                />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchCategories}
      />
    </AdminPageLayout>
  );
}

