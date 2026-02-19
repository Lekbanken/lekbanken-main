'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PhotoIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTenant } from '@/lib/context/TenantContext';
import { AdminEmptyState, AdminPageHeader, AdminPageLayout } from '@/components/admin/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiagramThumbnail } from '@/components/ui/diagram-thumbnail';
import { Select } from '@/components/ui/select';
import { coachDiagramDocumentSchemaV1, type CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';
import { renderDiagramSvg } from './svg';

type DiagramListRow = {
  id: string;
  tenant_id: string | null;
  scope_type: 'global' | 'tenant' | string;
  schema_version: string;
  title: string;
  sport_type: string;
  field_template_id: string;
  exported_at: string;
  exported_by_user_id: string | null;
  exported_by_tool: string | null;
  created_at: string;
  updated_at: string;
};

export function CoachDiagramsLibraryPage() {
  const t = useTranslations('admin.library.coachDiagrams');
  const { currentTenant } = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramListRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterTenantId, setFilterTenantId] = useState<string | 'all'>('all');

  const canLoad = Boolean(currentTenant?.id);

  const fetchDiagrams = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);
    try {
      // Fetch all diagrams (both tenant and global scope)
      const tenantParams = new URLSearchParams({ scopeType: 'tenant', tenantId: currentTenant.id });
      const globalParams = new URLSearchParams({ scopeType: 'global' });
      
      const [tenantRes, globalRes] = await Promise.all([
        fetch(`/api/admin/coach-diagrams?${tenantParams.toString()}`),
        fetch(`/api/admin/coach-diagrams?${globalParams.toString()}`).catch(() => null),
      ]);
      
      if (!tenantRes.ok) {
        const body = (await tenantRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed (${tenantRes.status})`);
      }
      
      const tenantJson = (await tenantRes.json()) as { diagrams?: DiagramListRow[] };
      const globalJson = globalRes?.ok 
        ? (await globalRes.json()) as { diagrams?: DiagramListRow[] }
        : { diagrams: [] };
      
      // Combine and dedupe by id
      const allDiagrams = [...(tenantJson.diagrams ?? []), ...(globalJson.diagrams ?? [])];
      const uniqueDiagrams = Array.from(new Map(allDiagrams.map(d => [d.id, d])).values());
      
      // Sort by updated_at descending
      uniqueDiagrams.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      setDiagrams(uniqueDiagrams);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    void fetchDiagrams();
  }, [fetchDiagrams]);

  const deleteDiagram = useCallback(async (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort detta diagram?')) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/coach-diagrams/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Delete failed (${res.status})`);
      }
      
      // Remove from local state
      setDiagrams(prev => prev.filter(d => d.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  }, []);

  // Filter diagrams by selected tenant
  const filteredDiagrams = useMemo(() => {
    if (filterTenantId === 'all') return diagrams;
    if (filterTenantId === 'global') return diagrams.filter(d => !d.tenant_id);
    return diagrams.filter(d => d.tenant_id === filterTenantId);
  }, [diagrams, filterTenantId]);

  // Get unique tenant IDs for filter
  const tenantOptions = useMemo(() => {
    const tenantIds = new Set(diagrams.map(d => d.tenant_id).filter(Boolean));
    const hasGlobal = diagrams.some(d => !d.tenant_id);
    return { tenantIds: Array.from(tenantIds) as string[], hasGlobal };
  }, [diagrams]);

  const makeUuidV4 = () => {
    const webCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
    if (webCrypto && typeof webCrypto.randomUUID === 'function') {
      // Must be called with `crypto` as receiver; unbound calls can throw “illegal invocation”.
      return webCrypto.randomUUID();
    }

    // RFC 4122 v4 using getRandomValues
    const bytes = new Uint8Array(16);
    if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
      throw new Error('crypto.getRandomValues is not available');
    }
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex
      .slice(8, 10)
      .join('')}-${hex.slice(10, 16).join('')}`;
  };

  const createNew = useCallback(async () => {
    if (!currentTenant?.id) return;
    setCreating(true);
    setError(null);

    try {
      const id = makeUuidV4();

      const now = new Date().toISOString();
      const draft: CoachDiagramDocumentV1 = {
        schemaVersion: 1,
        id,
        title: t('newDiagram'),
        sportType: 'custom',
        fieldTemplateId: 'default',
        objects: [],
        arrows: [],
        zones: [],
        metadata: {},
        createdAt: now,
        updatedAt: now,
      };

      const document = coachDiagramDocumentSchemaV1.parse(draft);
      const svg = renderDiagramSvg(document);

      const res = await fetch('/api/admin/coach-diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          scopeType: 'tenant',
          document,
          svg,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Create failed (${res.status})`);
      }

      const created = (await res.json().catch(() => null)) as { id?: string } | null;
      router.push(`/admin/library/coach-diagrams/${created?.id ?? id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }, [currentTenant?.id, router, t]);

  const content = useMemo(() => {
    if (!canLoad) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title={t('noTenantSelected')}
          description={t('selectTenantDescription')}
        />
      );
    }

    if (loading) {
      return <div className="text-sm text-muted-foreground">{t('loading')}</div>;
    }

    if (error) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title={t('loadError')}
          description={error}
          action={{ label: t('retry'), onClick: fetchDiagrams }}
        />
      );
    }

    if (filteredDiagrams.length === 0) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title={t('noDiagrams')}
          description={t('noDiagramsDescription')}
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDiagrams.map((d) => (
          <Card key={d.id} className="overflow-hidden">
            {/* Diagram thumbnail preview */}
            <div className="aspect-[3/4] bg-muted/50 border-b">
              <DiagramThumbnail
                url={`/api/coach-diagrams/${d.id}/svg`}
                alt={d.title}
                className="w-full h-full"
              />
            </div>
            <div className="p-4 space-y-1">
              <div className="text-sm font-semibold text-foreground">{d.title}</div>
              <div className="text-xs text-muted-foreground">
                {t('updated')}: {new Date(d.updated_at).toLocaleString()}
              </div>
              {/* Tenant indicator */}
              <div className="text-xs text-muted-foreground">
                {d.tenant_id ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    Tenant
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    Global
                  </span>
                )}
              </div>
              <div className="pt-2 flex items-center gap-3 text-xs">
                <Link className="underline text-muted-foreground hover:text-foreground" href={`/admin/library/coach-diagrams/${d.id}`}>
                  {t('openEditor')}
                </Link>
                <a
                  className="underline text-muted-foreground hover:text-foreground"
                  href={`/api/coach-diagrams/${d.id}/svg`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('openSvg')}
                </a>
                <button
                  type="button"
                  onClick={() => deleteDiagram(d.id)}
                  disabled={deleting === d.id}
                  className="underline text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {deleting === d.id ? 'Tar bort...' : 'Ta bort'}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }, [canLoad, filteredDiagrams, deleting, deleteDiagram, error, fetchDiagrams, loading, t]);

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('pageDescription')}
        icon={<PhotoIcon className="h-8 w-8 text-primary" />}
        actions={
          <Button type="button" onClick={createNew} disabled={!canLoad || creating}>
            {creating ? t('creating') : t('createNew')}
          </Button>
        }
      />

      {/* Filter */}
      {diagrams.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <Select
            label="Filter"
            value={filterTenantId}
            onChange={(e) => setFilterTenantId(e.target.value)}
            options={[
              { value: 'all', label: `Alla (${diagrams.length})` },
              ...(tenantOptions.hasGlobal ? [{ value: 'global', label: 'Globala' }] : []),
              ...tenantOptions.tenantIds.map((id) => ({ value: id, label: `Tenant: ${id.slice(0, 8)}...` })),
            ]}
          />
          <span className="text-xs text-muted-foreground">
            Visar {filteredDiagrams.length} av {diagrams.length} diagram
          </span>
        </div>
      )}

      <div className="space-y-4">{content}</div>
    </AdminPageLayout>
  );
}
