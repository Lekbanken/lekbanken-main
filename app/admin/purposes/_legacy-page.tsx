'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useTranslations } from 'next-intl';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import {
  AdminBreadcrumbs,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { AdminExportButton } from '@/components/admin/shared/AdminExportButton';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SkeletonList,
  useToast,
} from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { ChevronDownIcon, ChevronRightIcon, ClipboardIcon, FolderIcon } from '@heroicons/react/24/outline';

type PurposeRow = Database['public']['Tables']['purposes']['Row'];
type Purpose = PurposeRow & { tenant_id?: string | null; is_standard?: boolean };
type Tenant = { id: string; name: string | null };

export default function PurposesPage() {
  const t = useTranslations('admin.purposes.legacy');
  const toast = useToast();
  const { can } = useRbac();
  const canView = can('admin.games.list') || can('admin.products.list');
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'standard' | 'global' | 'tenant'>('standard');
  const [query, setQuery] = useState('');
  const [collapsedMainIds, setCollapsedMainIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Purpose | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'detach'>('delete');
  const [confirmTarget, setConfirmTarget] = useState<Purpose | null>(null);
  const [confirmUsage, setConfirmUsage] = useState<{
    gamesMain: number;
    gamesSecondary: number;
    products: number;
    media: number;
    childSubs?: number;
  } | null>(null);
  const [form, setForm] = useState<{ name: string; purpose_key: string; type: 'main' | 'sub'; parent_id: string | null }>(
    {
      name: '',
      purpose_key: '',
      type: 'main',
      parent_id: null,
    }
  );

  const isMainCollapsed = (id: string) => collapsedMainIds.includes(id);

  const toggleMainCollapsed = (id: string) => {
    setCollapsedMainIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const collapseAll = (ids: string[]) => {
    setCollapsedMainIds(Array.from(new Set(ids)));
  };

  const expandAll = () => {
    setCollapsedMainIds([]);
  };

  const standardPurposes = useMemo(() => purposes.filter((p) => p.is_standard), [purposes]);
  const globalCustom = useMemo(() => purposes.filter((p) => !p.is_standard && !p.tenant_id), [purposes]);
  const tenantCustom = useMemo(
    () => purposes.filter((p) => !p.is_standard && p.tenant_id === (selectedTenantId || null)),
    [purposes, selectedTenantId]
  );

  const buildTree = (list: Purpose[]) => {
    const mains = list.filter((p) => p.type === 'main');
    const subs = list.filter((p) => p.type === 'sub');
    return mains.map((main) => ({
      main,
      children: subs.filter((s) => s.parent_id === main.id),
    }));
  };

  const treeStandard = useMemo(() => buildTree(standardPurposes), [standardPurposes]);
  const treeGlobal = useMemo(() => buildTree(globalCustom), [globalCustom]);
  const treeTenant = useMemo(() => buildTree(tenantCustom), [tenantCustom]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/purposes');
        const json = (await res.json().catch(() => ({}))) as { purposes?: Purpose[]; error?: string };
        if (!res.ok) throw new Error(json.error || t('errors.loadPurposes'));
        if (!cancelled) {
          setPurposes(json.purposes || []);
        }
      } catch (err) {
        console.error('[admin/purposes] load error', err);
        if (!cancelled) setError(t('errors.loadPurposesNow'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView, t]);

  useEffect(() => {
    if (!canView) return;
    void (async () => {
      try {
        const res = await fetch('/api/tenants');
        if (!res.ok) return;
        const json = (await res.json().catch(() => ({}))) as { tenants?: Tenant[] };
        setTenants(json.tenants || []);
      } catch {
        // ignore
      }
    })();
  }, [canView]);

  const openCreate = () => {
    if (activeTab === 'tenant' && !selectedTenantId) {
      setError(t('errors.selectTenantFirst'));
      return;
    }
    setEditing(null);
    setForm({ name: '', purpose_key: '', type: 'main', parent_id: null });
    setDialogOpen(true);
  };

  const openEdit = (p: Purpose) => {
    if (p.is_standard) return; // read-only
    setEditing(p);
    setForm({
      name: p.name ?? '',
      purpose_key: p.purpose_key ?? '',
      type: p.type as 'main' | 'sub',
      parent_id: p.parent_id ?? null,
    });
    setDialogOpen(true);
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('ui.copied'));
    } catch {
      toast.error(t('ui.copyFailed'));
    }
  };

  const openConfirm = async (p: Purpose, mode: 'delete' | 'detach') => {
    if (p.is_standard) return;
    setError(null);
    setConfirmMode(mode);
    setConfirmTarget(p);
    setConfirmUsage(null);
    setConfirmOpen(true);

    try {
      const usageRes = await fetch(`/api/purposes/${p.id}`);
      if (!usageRes.ok) return;
      const usageJson = (await usageRes.json().catch(() => ({}))) as {
        usage?: { gamesMain: number; gamesSecondary: number; products: number; media: number; childSubs?: number };
      };
      setConfirmUsage(usageJson.usage || null);
    } catch {
      // ignore usage loading errors
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const scopeTenantId = activeTab === 'tenant' ? selectedTenantId || null : null;
    if (activeTab === 'tenant' && !scopeTenantId) {
      setError(t('errors.selectTenantForPurpose'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      purpose_key: form.purpose_key.trim(),
      type: form.type,
      parent_id: form.type === 'sub' ? form.parent_id : null,
      tenant_id: scopeTenantId,
    };
    try {
      const res = await fetch(editing ? `/api/purposes/${editing.id}` : '/api/purposes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { purpose?: Purpose; error?: string };
      if (!res.ok) throw new Error(json.error || t('errors.savePurpose'));
      if (!json.purpose) return;
      setPurposes((prev) => {
        if (editing) return prev.map((p) => (p.id === editing.id ? json.purpose! : p));
        return [json.purpose!, ...prev];
      });
      toast.success(editing ? t('ui.toastUpdated') : t('ui.toastCreated'));
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      console.error('[admin/purposes] save error', err);
      setError(t('errors.savePurpose'));
      toast.error(t('errors.savePurpose'));
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const target = purposes.find((p) => p.id === id);
    if (target?.is_standard) return;
    try {
      const res = await fetch(`/api/purposes/${id}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string; missing?: boolean };
      if (json.missing) {
        setPurposes((prev) => prev.filter((p) => p.id !== id));
        toast.success(t('ui.toastDeleted'));
        return;
      }
      if (!res.ok) throw new Error(json.error || t('errors.deletePurpose'));
      setPurposes((prev) => prev.filter((p) => p.id !== id));
      toast.success(t('ui.toastDeleted'));
    } catch (err) {
      console.error('[admin/purposes] delete error', err);
      setError(t('errors.deletePurpose'));
      toast.error(t('errors.deletePurpose'));
    }
  };

  const handleDetachAndDelete = async (id: string) => {
    setError(null);
    const target = purposes.find((p) => p.id === id);
    if (target?.is_standard) {
      setError(t('errors.standardCannotDelete'));
      toast.error(t('errors.standardCannotDelete'));
      return;
    }
    try {
      const res = await fetch(`/api/purposes/${id}?detach=true`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string; missing?: boolean };
      if (json.missing) {
        setPurposes((prev) => prev.filter((p) => p.id !== id));
        toast.success(t('ui.toastDeleted'));
        return;
      }
      if (!res.ok) {
        setError(json.error || t('errors.detachDeleteFailed'));
        toast.error(json.error || t('errors.detachDeleteFailed'));
        return;
      }
      setPurposes((prev) => prev.filter((p) => p.id !== id));
      toast.success(t('ui.toastDeleted'));
    } catch (err) {
      console.error('[admin/purposes] detach/delete error', err);
      setError(t('errors.detachDeletePurpose'));
      toast.error(t('errors.detachDeletePurpose'));
    }
  };

  if (!canView) {
    return (
      <SystemAdminClientGuard>
        <AdminPageLayout>
          <AdminEmptyState title={t('empty.noAccess')} description={t('empty.noAccessDescription')} />
        </AdminPageLayout>
      </SystemAdminClientGuard>
    );
  }

  const currentTree =
    activeTab === 'standard' ? treeStandard : activeTab === 'global' ? treeGlobal : treeTenant;
  const currentMains =
    activeTab === 'standard'
      ? standardPurposes.filter((p) => p.type === 'main')
      : activeTab === 'global'
      ? globalCustom.filter((p) => p.type === 'main')
      : tenantCustom.filter((p) => p.type === 'main');

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTree = normalizedQuery
    ? currentTree
        .map(({ main, children }) => {
          const mainMatches = `${main.name ?? ''} ${main.purpose_key ?? ''}`.toLowerCase().includes(normalizedQuery);
          const matchingChildren = children.filter((c) =>
            `${c.name ?? ''} ${c.purpose_key ?? ''}`.toLowerCase().includes(normalizedQuery)
          );
          if (mainMatches) return { main, children };
          if (matchingChildren.length > 0) return { main, children: matchingChildren };
          return null;
        })
        .filter(Boolean) as Array<{ main: Purpose; children: Purpose[] }>
    : currentTree;

  const visibleMainIds = filteredTree.map((x) => x.main.id);
  const forceExpanded = normalizedQuery.length > 0;

  return (
    <SystemAdminClientGuard>
      <AdminPageLayout>
        <AdminBreadcrumbs items={[{ label: t('breadcrumbHome'), href: '/admin' }, { label: t('breadcrumbPurposes') }]} />
        <AdminPageHeader
          title={t('pageTitle')}
          description={t('pageDescription')}
          icon={<FolderIcon className="h-8 w-8 text-primary" />}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openCreate} disabled={activeTab === 'standard'}>
                {t('newPurpose')}
              </Button>
              <AdminExportButton
                data={purposes}
                columns={[
                  { header: t('exportColumns.id'), accessor: 'id' },
                  { header: t('exportColumns.type'), accessor: 'type' },
                  { header: t('exportColumns.key'), accessor: 'purpose_key' },
                  { header: t('exportColumns.name'), accessor: 'name' },
                  { header: t('exportColumns.parentId'), accessor: 'parent_id' },
                  { header: t('exportColumns.tenantId'), accessor: (row) => (row as Purpose).tenant_id ?? '' },
                  { header: t('exportColumns.standard'), accessor: (row) => ((row as Purpose).is_standard ? t('exportColumns.yes') : t('exportColumns.no')) },
                ]}
                filename="purposes"
              />
            </div>
          }
        />

      <AdminStatGrid className="mb-4">
        <AdminStatCard label={t('stats.mainPurposes')} value={purposes.filter((p) => p.type === 'main').length} />
        <AdminStatCard label={t('stats.subPurposes')} value={purposes.filter((p) => p.type === 'sub').length} />
        <AdminStatCard label={t('stats.total')} value={purposes.length} />
      </AdminStatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-1">
          {[
            { id: 'standard', label: t('tabs.standard') },
            { id: 'global', label: t('tabs.global') },
            { id: 'tenant', label: t('tabs.tenant') },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {activeTab === 'tenant' && (
          <Select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            options={[
              { value: '', label: t('selectTenant') },
              ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name || t('dialog.tenantLabel') })),
            ]}
          />
        )}

        <div className="min-w-[240px] flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ui.searchPlaceholder')}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => expandAll()} disabled={visibleMainIds.length === 0}>
            {t('ui.expandAll')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => collapseAll(visibleMainIds)} disabled={visibleMainIds.length === 0}>
            {t('ui.collapseAll')}
          </Button>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>{t('purposeTree')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && <AdminErrorState title={t('problem')} description={error} onRetry={() => window.location.reload()} />}
          {isLoading ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <SkeletonList items={6} />
            </div>
          ) : activeTab === 'tenant' && !selectedTenantId ? (
            <AdminEmptyState title={t('empty.selectTenant')} description={t('empty.selectTenantDescription')} />
          ) : filteredTree.length === 0 ? (
            <AdminEmptyState title={t('empty.noPurposes')} description={t('empty.noPurposesDescription')} />
          ) : (
            <div className="space-y-4">
              {filteredTree.map(({ main, children }) => (
                <div key={main.id} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleMainCollapsed(main.id)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={
                            forceExpanded
                              ? t('ui.expand')
                              : isMainCollapsed(main.id)
                              ? t('ui.expand')
                              : t('ui.collapse')
                          }
                          disabled={forceExpanded}
                        >
                          {forceExpanded ? (
                            <ChevronDownIcon className="h-4 w-4 opacity-50" />
                          ) : isMainCollapsed(main.id) ? (
                            <ChevronRightIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </button>
                        <p className="text-sm font-semibold text-foreground">{main.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className="truncate">{main.purpose_key} {main.is_standard ? t('standardLabel') : ''}</span>
                          {main.purpose_key && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => copyToClipboard(main.purpose_key || '')}
                              aria-label={t('ui.copyKey')}
                            >
                              <ClipboardIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </span>
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{t('subPurposesCount', { count: children.length })}</span>
                  </div>
                  {children.length > 0 && (forceExpanded || !isMainCollapsed(main.id)) && (
                    <ul className="mt-3 space-y-2">
                      {children.map((child) => (
                        <li key={child.id} className="rounded bg-muted/30 px-3 py-2">
                          <p className="text-sm text-foreground">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <span className="truncate">{child.purpose_key} {child.is_standard ? t('standardLabel') : ''}</span>
                              {child.purpose_key && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => copyToClipboard(child.purpose_key || '')}
                                  aria-label={t('ui.copyKey')}
                                >
                                  <ClipboardIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </span>
                          </p>
                          {!child.is_standard && (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(child)}>
                                {t('actions.edit')}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => void openConfirm(child, 'delete')}>
                                {t('actions.quickDelete')}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => void openConfirm(child, 'detach')}>
                                {t('actions.detachDelete')}
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!main.is_standard && (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(main)}>
                        {t('actions.editMain')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void openConfirm(main, 'delete')}>
                        {t('actions.quickDelete')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void openConfirm(main, 'detach')}>
                        {t('actions.detachDelete')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.createTitle')}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('dialog.nameLabel')}</label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('dialog.keyLabel')}</label>
              <Input value={form.purpose_key} onChange={(e) => setForm((prev) => ({ ...prev, purpose_key: e.target.value }))} required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('dialog.typeLabel')}</label>
                <Select
                  value={form.type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      type: e.target.value as 'main' | 'sub',
                      parent_id: e.target.value === 'sub' ? prev.parent_id : null,
                    }))
                  }
                  options={[
                    { value: 'main', label: t('dialog.typeMain') },
                    { value: 'sub', label: t('dialog.typeSub') },
                  ]}
                />
              </div>
              {form.type === 'sub' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('dialog.parentLabel')}</label>
                  <Select
                    value={form.parent_id ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value || null }))}
                    options={[
                      { value: '', label: t('dialog.selectMain') },
                      ...currentMains.map((p) => ({ value: p.id, label: p.name || p.purpose_key || t('dialog.typeMain') })),
                    ]}
                  />
                </div>
              )}
            </div>

            {activeTab === 'tenant' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('dialog.tenantLabel')}</label>
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: '', label: t('selectTenant') },
                    ...tenants.map((tenant) => ({ value: tenant.id, label: tenant.name || t('dialog.tenantLabel') })),
                  ]}
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button type="submit" disabled={activeTab === 'standard'}>
                {editing ? t('dialog.save') : t('dialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (confirmLoading) return;
          setConfirmOpen(open);
          if (!open) {
            setConfirmTarget(null);
            setConfirmUsage(null);
            setConfirmMode('delete');
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmMode === 'detach' ? t('ui.confirmDetachTitle') : t('ui.confirmDeleteTitle')}
            </DialogTitle>
          </DialogHeader>

          {confirmTarget ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium text-foreground">{confirmTarget.name}</p>
                <p className="text-xs text-muted-foreground">{confirmTarget.purpose_key}</p>
              </div>

              {confirmUsage && (
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium">{t('ui.usageTitle')}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>{t('ui.usageGamesMain', { count: confirmUsage.gamesMain })}</li>
                    <li>{t('ui.usageGamesSecondary', { count: confirmUsage.gamesSecondary })}</li>
                    <li>{t('ui.usageProducts', { count: confirmUsage.products })}</li>
                    <li>{t('ui.usageMedia', { count: confirmUsage.media })}</li>
                    <li>{t('ui.usageChildSubs', { count: confirmUsage.childSubs ?? 0 })}</li>
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {confirmMode === 'detach' ? t('ui.confirmDetachHelp') : t('ui.confirmDeleteHelp')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('ui.noSelection')}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>
              {t('dialog.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!confirmTarget || confirmLoading}
              onClick={async () => {
                if (!confirmTarget) return;
                setConfirmLoading(true);
                try {
                  if (confirmMode === 'detach') {
                    await handleDetachAndDelete(confirmTarget.id);
                  } else {
                    await handleDelete(confirmTarget.id);
                  }
                } finally {
                  setConfirmLoading(false);
                  setConfirmOpen(false);
                  setConfirmTarget(null);
                  setConfirmUsage(null);
                  setConfirmMode('delete');
                }
              }}
            >
              {confirmMode === 'detach' ? t('ui.confirmDetach') : t('ui.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </AdminPageLayout>
    </SystemAdminClientGuard>
  );
}
