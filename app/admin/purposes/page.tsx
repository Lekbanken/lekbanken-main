'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
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
} from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { FolderIcon } from '@heroicons/react/24/outline';

type PurposeRow = Database['public']['Tables']['purposes']['Row'];
type Purpose = PurposeRow & { tenant_id?: string | null; is_standard?: boolean };
type Tenant = { id: string; name: string | null };

export default function PurposesPage() {
  const { can } = useRbac();
  const canView = can('admin.products.list');
  const [purposes, setPurposes] = useState<Purpose[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'standard' | 'global' | 'tenant'>('standard');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Purpose | null>(null);
  const [form, setForm] = useState<{ name: string; purpose_key: string; type: 'main' | 'sub'; parent_id: string | null }>(
    {
      name: '',
      purpose_key: '',
      type: 'main',
      parent_id: null,
    }
  );

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
        if (!res.ok) throw new Error(json.error || 'Kunde inte ladda syften');
        if (!cancelled) {
          setPurposes(json.purposes || []);
        }
      } catch (err) {
        console.error('[admin/purposes] load error', err);
        if (!cancelled) setError('Kunde inte ladda syften just nu.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canView]);

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
      setError('Välj en tenant innan du skapar tenant-specifikt syfte.');
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const scopeTenantId = activeTab === 'tenant' ? selectedTenantId || null : null;
    if (activeTab === 'tenant' && !scopeTenantId) {
      setError('Välj en tenant för tenant-specifikt syfte.');
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
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      if (!json.purpose) return;
      setPurposes((prev) => {
        if (editing) return prev.map((p) => (p.id === editing.id ? json.purpose! : p));
        return [json.purpose!, ...prev];
      });
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      console.error('[admin/purposes] save error', err);
      setError('Kunde inte spara syftet.');
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
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      setPurposes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('[admin/purposes] delete error', err);
      setError('Kunde inte ta bort syftet.');
    }
  };

  const handleDetachAndDelete = async (id: string) => {
    setError(null);
    const target = purposes.find((p) => p.id === id);
    if (target?.is_standard) {
      setError('Standardsyften kan inte tas bort.');
      return;
    }
    try {
      const usageRes = await fetch(`/api/purposes/${id}`);
      if (!usageRes.ok) {
        const usageErr = (await usageRes.json().catch(() => ({}))) as { error?: string };
        setError(usageErr.error || 'Kunde inte läsa användning.');
        return;
      }
      const usageJson = (await usageRes.json().catch(() => ({}))) as {
        usage?: { gamesMain: number; gamesSecondary: number; products: number; media: number; childSubs?: number };
      };
      const u = usageJson.usage || { gamesMain: 0, gamesSecondary: 0, products: 0, media: 0, childSubs: 0 };
      const confirmText = `Detta syfte används av:\n- ${u.gamesMain} spel (main)\n- ${u.gamesSecondary} spel (secondary)\n- ${u.products} produkter\n- ${u.media} media\n- ${u.childSubs} undersyften (kommer tas bort)\nDet kommer kopplas loss och tas bort. Vill du fortsätta?`;
      if (!window.confirm(confirmText)) return;

      const res = await fetch(`/api/purposes/${id}?detach=true`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string; missing?: boolean };
      if (json.missing) {
        setPurposes((prev) => prev.filter((p) => p.id !== id));
        return;
      }
      if (!res.ok) {
        setError(json.error || 'Misslyckades att koppla loss och ta bort.');
        return;
      }
      setPurposes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('[admin/purposes] detach/delete error', err);
      setError('Kunde inte koppla loss och ta bort syftet.');
    }
  };

  if (!canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState title="Ingen åtkomst" description="Du behöver behörighet för att se syften." />
      </AdminPageLayout>
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

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: 'Startsida', href: '/admin' }, { label: 'Syften' }]} />
      <AdminPageHeader
        title="Syften & undersyften"
        description="Hantera huvudsyften och undersyften som används i spel, produkter och filter."
        icon={<FolderIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate} disabled={activeTab === 'standard'}>
              Nytt syfte
            </Button>
            <AdminExportButton
              data={purposes}
              columns={[
                { header: 'ID', accessor: 'id' },
                { header: 'Typ', accessor: 'type' },
                { header: 'Nyckel', accessor: 'purpose_key' },
                { header: 'Namn', accessor: 'name' },
                { header: 'Parent ID', accessor: 'parent_id' },
                { header: 'Tenant ID', accessor: (row) => (row as Purpose).tenant_id ?? '' },
                { header: 'Standard', accessor: (row) => ((row as Purpose).is_standard ? 'ja' : 'nej') },
              ]}
              filename="purposes"
            />
          </div>
        }
      />

      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Huvudsyften" value={purposes.filter((p) => p.type === 'main').length} />
        <AdminStatCard label="Undersyften" value={purposes.filter((p) => p.type === 'sub').length} />
        <AdminStatCard label="Totalt" value={purposes.length} />
      </AdminStatGrid>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-1">
          {[
            { id: 'standard', label: 'Standard (låsta)' },
            { id: 'global', label: 'Special global' },
            { id: 'tenant', label: 'Tenant-specifika' },
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
              { value: '', label: 'Välj tenant' },
              ...tenants.map((t) => ({ value: t.id, label: t.name || 'Tenant' })),
            ]}
          />
        )}
      </div>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>Syftesträd</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && <AdminErrorState title="Problem" description={error} onRetry={() => window.location.reload()} />}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar...</p>
          ) : activeTab === 'tenant' && !selectedTenantId ? (
            <AdminEmptyState title="Välj tenant" description="Välj en tenant för att se eller hantera syften." />
          ) : currentTree.length === 0 ? (
            <AdminEmptyState title="Inga syften" description="Kör seeden eller lägg till syften via API/UI." />
          ) : (
            <div className="space-y-4">
              {currentTree.map(({ main, children }) => (
                <div key={main.id} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{main.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {main.purpose_key} {main.is_standard ? '(standard)' : ''}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{children.length} undersyften</span>
                  </div>
                  {children.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {children.map((child) => (
                        <li key={child.id} className="rounded bg-muted/30 px-3 py-2">
                          <p className="text-sm text-foreground">{child.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {child.purpose_key} {child.is_standard ? '(standard)' : ''}
                          </p>
                          {!child.is_standard && (
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(child)}>
                                Redigera
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(child.id)}>
                                Snabb ta bort
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDetachAndDelete(child.id)}>
                                Koppla loss + ta bort
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
                        Redigera huvudsyfte
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(main.id)}>
                        Snabb ta bort
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDetachAndDelete(main.id)}>
                        Koppla loss + ta bort
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
              <DialogTitle>{editing ? 'Redigera syfte' : 'Nytt syfte'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              <label className="text-sm font-medium">Namn</label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nyckel</label>
              <Input value={form.purpose_key} onChange={(e) => setForm((prev) => ({ ...prev, purpose_key: e.target.value }))} required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Typ</label>
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
                    { value: 'main', label: 'Huvudsyfte' },
                    { value: 'sub', label: 'Undersyfte' },
                  ]}
                />
              </div>
              {form.type === 'sub' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent</label>
                  <Select
                    value={form.parent_id ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, parent_id: e.target.value || null }))}
                    options={[
                      { value: '', label: 'Välj huvudsyfte' },
                      ...currentMains.map((p) => ({ value: p.id, label: p.name || p.purpose_key || 'Huvudsyfte' })),
                    ]}
                  />
                </div>
              )}
            </div>

            {activeTab === 'tenant' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tenant</label>
                <Select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  options={[
                    { value: '', label: 'Välj tenant' },
                    ...tenants.map((t) => ({ value: t.id, label: t.name || 'Tenant' })),
                  ]}
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit" disabled={activeTab === 'standard'}>
                {editing ? 'Spara' : 'Skapa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
