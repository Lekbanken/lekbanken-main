'use client';

// =============================================================================
// Spatial Artifact Library – Browse, open, delete saved artifacts
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { listSpatialArtifacts, deleteSpatialArtifact } from '../lib/artifact-actions';
import type { SpatialArtifactListItem } from '../lib/artifact-actions';
import Link from 'next/link';

// TODO: resolve from auth context when inside a tenant route
const ACTIVE_TENANT_ID: string | null = null;

export default function SpatialLibraryPage() {
  const [artifacts, setArtifacts] = useState<SpatialArtifactListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSpatialArtifacts(ACTIVE_TENANT_ID);
    setArtifacts(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listSpatialArtifacts(ACTIVE_TENANT_ID).then((list) => {
      if (!cancelled) {
        setArtifacts(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Vill du verkligen ta bort denna karta?')) return;
    const artifact = artifacts.find((a) => a.id === id);
    await deleteSpatialArtifact(id, artifact?.tenant_id);
    await refresh();
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
    <SandboxShell
      moduleId="spatial-editor"
      title="Kartbibliotek"
      description="Sparade kartor och banor från Spatial Editor."
      contentWidth="full"
    >
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              📚 Kartbibliotek
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {artifacts.length} sparade kartor
            </p>
          </div>
          <Link
            href="/sandbox/spatial-editor"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            + Ny karta
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">
            Laddar…
          </div>
        )}

        {/* Empty state */}
        {!loading && artifacts.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Inga sparade kartor ännu.
            </p>
            <Link
              href="/sandbox/spatial-editor"
              className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Skapa din första karta →
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && artifacts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artifacts.map((artifact) => (
              <div
                key={artifact.id}
                className="group relative rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Preview area */}
                <div className="h-36 rounded-t-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-3xl text-gray-300 dark:text-gray-600 overflow-hidden">
                  {artifact.preview_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artifact.preview_url}
                      alt={artifact.title}
                      className="h-full w-full object-contain rounded-t-lg"
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
                    {artifact.visibility === 'public' ? 'Publik' :
                     artifact.visibility === 'tenant' ? 'Organisation' : 'Privat'}
                    {' · '}
                    {formatDate(artifact.updated_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex border-t border-gray-100 dark:border-gray-700">
                  <Link
                    href={`/sandbox/spatial-editor?artifact=${artifact.id}`}
                    className="flex-1 py-2 text-center text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded-bl-lg"
                  >
                    ✏️ Öppna
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(artifact.id)}
                    className="flex-1 py-2 text-center text-xs font-medium text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 rounded-br-lg"
                  >
                    🗑 Ta bort
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SandboxShell>
  );
}
