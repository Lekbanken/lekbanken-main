'use client';

// =============================================================================
// Spatial Artifact Library – Browse, open, delete saved artifacts
// Production version (promoted from sandbox)
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useTenant } from '@/lib/context/TenantContext';
import { AdminEmptyState, AdminPageHeader, AdminPageLayout } from '@/components/admin/shared';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listSpatialArtifacts, deleteSpatialArtifact } from './lib/artifact-actions';
import type { SpatialArtifactListItem } from './lib/artifact-actions';

export function SpatialEditorLibraryPage() {
  const t = useTranslations('admin.library.spatialEditor.libraryPage');
  const { currentTenant } = useTenant();
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<SpatialArtifactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const tenantId = currentTenant?.id ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSpatialArtifacts(tenantId);
    setArtifacts(list);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    listSpatialArtifacts(tenantId).then((list) => {
      if (!cancelled) {
        setArtifacts(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [tenantId]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return;
    setDeleting(id);
    const artifact = artifacts.find((a) => a.id === id);
    await deleteSpatialArtifact(id, artifact?.tenant_id);
    await refresh();
    setDeleting(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Link href="/admin/library/spatial-editor/new">
            <Button>+ {t('newMap')}</Button>
          </Link>
        }
      />

      {/* Loading */}
      {loading && (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">
          {t('loading')}
        </div>
      )}

      {/* Empty state */}
      {!loading && artifacts.length === 0 && (
        <AdminEmptyState
          title={t('noMaps')}
          description={t('noMapsDescription')}
          action={{
            label: t('createNew'),
            onClick: () => router.push('/admin/library/spatial-editor/new'),
          }}
        />
      )}

      {/* Grid */}
      {!loading && artifacts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {artifacts.map((artifact) => (
            <Card key={artifact.id} className="group relative overflow-hidden">
              {/* Preview area */}
              <div className="h-36 bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-3xl text-gray-300 dark:text-gray-600 overflow-hidden">
                {artifact.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={artifact.preview_url}
                    alt={artifact.title}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  '🗺️'
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {artifact.title}
                </h3>
                {artifact.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {artifact.description}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    artifact.visibility === 'public' ? 'bg-green-400' :
                    artifact.visibility === 'tenant' ? 'bg-blue-400' : 'bg-gray-400'
                  }`} />
                  {artifact.visibility === 'public' ? t('public') :
                   artifact.visibility === 'tenant' ? t('tenant') : t('private')}
                  {' · '}
                  {formatDate(artifact.updated_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex border-t border-gray-100 dark:border-gray-700">
                <Link
                  href={`/admin/library/spatial-editor/${artifact.id}`}
                  className="flex-1 py-2 text-center text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded-bl-lg"
                >
                  ✏️ {t('open')}
                </Link>
                <button
                  type="button"
                  disabled={deleting === artifact.id}
                  onClick={() => handleDelete(artifact.id)}
                  className="flex-1 py-2 text-center text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 rounded-br-lg disabled:opacity-50"
                >
                  {deleting === artifact.id ? '…' : `🗑 ${t('delete')}`}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
