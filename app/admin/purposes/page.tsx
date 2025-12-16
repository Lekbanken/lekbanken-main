'use client';

import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { AdminBreadcrumbs, AdminEmptyState, AdminErrorState, AdminPageHeader, AdminPageLayout, AdminStatCard, AdminStatGrid } from '@/components/admin/shared';
import { AdminExportButton } from '@/components/admin/shared/AdminExportButton';
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Select } from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { FolderIcon } from '@heroicons/react/24/outline';

type PurposeRow = Database['public']['Tables']['purposes']['Row'];

export default function PurposesPage() {
  const { can } = useRbac();
  const canView = can('admin.products.list');
  const [purposes, setPurposes] = useState<PurposeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PurposeRow | null>(null);
  const [form, setForm] = useState<{ name: string; purpose_key: string; type: 'main' | 'sub'; parent_id: string | null }>({
    name: '',
    purpose_key: '',
    type: 'main',
    parent_id: null,
  });

  const mainPurposes = useMemo(() => purposes.filter((p) => p.type === 'main'), [purposes]);
  const subPurposes = useMemo(() => purposes.filter((p) => p.type === 'sub'), [purposes]);
  const tree = useMemo(() => {
    const map = new Map<string, PurposeRow>();
    mainPurposes.forEach((p) => map.set(p.id, p));
    return mainPurposes.map((main) => ({
      main,
      children: subPurposes.filter((s) => s.parent_id === main.id),
    }));
  }, [mainPurposes, subPurposes]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/purposes');
        const json = (await res.json().catch(() => ({}))) as { purposes?: PurposeRow[]; error?: string };
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

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', purpose_key: '', type: 'main', parent_id: null });
    setDialogOpen(true);
  };

  const openEdit = (p: PurposeRow) => {
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
    const payload = {
      name: form.name.trim(),
      purpose_key: form.purpose_key.trim(),
      type: form.type,
      parent_id: form.type === 'sub' ? form.parent_id : null,
    };
    try {
      const res = await fetch(editing ? `/api/purposes/${editing.id}` : '/api/purposes', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to save');
      }
      const json = (await res.json()) as { purpose?: PurposeRow };
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
    try {
      const res = await fetch(`/api/purposes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to delete');
      }
      setPurposes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('[admin/purposes] delete error', err);
      setError('Kunde inte ta bort syftet.');
    }
  };

  if (!can('admin.products.list')) {
    return (
      <AdminPageLayout>
        <AdminEmptyState title="Ingen åtkomst" description="Du behöver behörighet för att se syften." />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: 'Startsida', href: '/admin' }, { label: 'Syften' }]} />
      <AdminPageHeader
        title="Syften & undersyften"
        description="Hantera huvudsyften och undersyften som används i spel, produkter och filter."
        icon={<FolderIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openCreate}>Nytt syfte</Button>
            <AdminExportButton
              data={purposes}
              columns={[
                { header: 'ID', accessor: 'id' },
                { header: 'Typ', accessor: 'type' },
                { header: 'Nyckel', accessor: 'purpose_key' },
                { header: 'Namn', accessor: 'name' },
                { header: 'Parent ID', accessor: 'parent_id' },
              ]}
              filename="purposes"
            />
          </div>
        }
      />

      <AdminStatGrid className="mb-4">
        <AdminStatCard label="Huvudsyften" value={mainPurposes.length} />
        <AdminStatCard label="Undersyften" value={subPurposes.length} />
        <AdminStatCard label="Totalt" value={purposes.length} />
      </AdminStatGrid>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>Syftesträd</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && <AdminErrorState title="Problem" description={error} onRetry={() => window.location.reload()} />}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Laddar...</p>
          ) : tree.length === 0 ? (
            <AdminEmptyState title="Inga syften" description="Kör seeden eller lägg till syften via API." />
          ) : (
            <div className="space-y-4">
              {tree.map(({ main, children }) => (
                <div key={main.id} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{main.name}</p>
                      <p className="text-xs text-muted-foreground">{main.purpose_key}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{children.length} undersyften</span>
                  </div>
                  {children.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {children.map((child) => (
                        <li key={child.id} className="rounded bg-muted/30 px-3 py-2">
                          <p className="text-sm text-foreground">{child.name}</p>
                          <p className="text-xs text-muted-foreground">{child.purpose_key}</p>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEdit(child)}>
                              Redigera
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(child.id)}>
                              Ta bort
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
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
                      ...mainPurposes.map((p) => ({ value: p.id, label: p.name || p.purpose_key || 'Huvudsyfte' })),
                    ]}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit">{editing ? 'Spara' : 'Skapa'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
