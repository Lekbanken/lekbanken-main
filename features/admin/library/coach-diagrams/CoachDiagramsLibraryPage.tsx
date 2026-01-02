'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTenant } from '@/lib/context/TenantContext';
import { AdminEmptyState, AdminPageHeader, AdminPageLayout } from '@/components/admin/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const { currentTenant } = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramListRow[]>([]);
  const [creating, setCreating] = useState(false);

  const canLoad = Boolean(currentTenant?.id);

  const fetchDiagrams = useCallback(async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scopeType: 'tenant', tenantId: currentTenant.id });
      const res = await fetch(`/api/admin/coach-diagrams?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as { diagrams?: DiagramListRow[] };
      setDiagrams(json.diagrams ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    void fetchDiagrams();
  }, [fetchDiagrams]);

  const makeUuidV4 = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      const fn = (crypto as unknown as { randomUUID?: () => string }).randomUUID;
      if (typeof fn === 'function') return fn();
    }

    // RFC 4122 v4 using getRandomValues
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
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
        title: 'Nytt diagram',
        sportType: 'custom',
        fieldTemplateId: 'default',
        objects: [],
        arrows: [],
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
  }, [currentTenant?.id, router]);

  const content = useMemo(() => {
    if (!canLoad) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj en organisation för att se diagram-biblioteket."
        />
      );
    }

    if (loading) {
      return <div className="text-sm text-muted-foreground">Laddar…</div>;
    }

    if (error) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title="Kunde inte ladda diagram"
          description={error}
          action={{ label: 'Försök igen', onClick: fetchDiagrams }}
        />
      );
    }

    if (diagrams.length === 0) {
      return (
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title="Inga diagram ännu"
          description="Skapa diagram i Coach Diagram Builder och de dyker upp här."
        />
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {diagrams.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">{d.title}</div>
              <div className="text-xs text-muted-foreground">
                Uppdaterad: {new Date(d.updated_at).toLocaleString()}
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <Link className="underline" href={`/admin/library/coach-diagrams/${d.id}`}>
                  Öppna editor
                </Link>
              </div>
              <div className="pt-2 text-xs text-muted-foreground">
                <a
                  className="underline"
                  href={`/api/coach-diagrams/${d.id}/svg`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Öppna SVG
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }, [canLoad, diagrams, error, fetchDiagrams, loading]);

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Coach Diagrams"
        description="Diagram som kan användas som instruktionsmedia i steg."
        icon={<PhotoIcon className="h-8 w-8 text-primary" />}
        actions={
          <Button type="button" onClick={createNew} disabled={!canLoad || creating}>
            {creating ? 'Skapar…' : 'Skapa nytt'}
          </Button>
        }
      />

      <div className="space-y-4">{content}</div>
    </AdminPageLayout>
  );
}
