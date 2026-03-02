'use client';

import { useCallback, useEffect, useState } from 'react';
import { Input, Select } from '@/components/ui';
import { listSpatialArtifacts, type SpatialArtifactListItem } from '@/features/admin/library/spatial-editor/lib/artifact-actions';

// =============================================================================
// SpatialMapConfigPanel — Type-specific config for artifact_type='spatial_map'
//
// Fetches the spatial artifacts library and lets the builder author pick one.
// Stores ONLY `metadata.spatial_artifact_id` (+ optional title_override).
// URLs are derived server-side — never stored in metadata.
// =============================================================================

interface SpatialMapConfigPanelProps {
  metadata: Record<string, unknown> | null | undefined;
  onChange: (next: Record<string, unknown>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

export function SpatialMapConfigPanel({ metadata, onChange, t }: SpatialMapConfigPanelProps) {
  const [maps, setMaps] = useState<SpatialArtifactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedId = typeof metadata?.spatial_artifact_id === 'string' ? metadata.spatial_artifact_id : '';
  const titleOverride = typeof metadata?.title_override === 'string' ? metadata.title_override : '';

  // Load available spatial artifacts on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        // listSpatialArtifacts is a server action — call directly
        const list = await listSpatialArtifacts(null);
        if (!cancelled) setMaps(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load maps');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback(
    (artifactId: string) => {
      const selected = maps.find((m) => m.id === artifactId);
      onChange({
        ...(metadata ?? {}),
        spatial_artifact_id: artifactId || undefined,
        // Auto-fill title from the spatial artifact unless user already set one
        ...(selected && !titleOverride ? { title_override: selected.title } : {}),
      });
    },
    [maps, metadata, onChange, titleOverride],
  );

  const selectedMap = maps.find((m) => m.id === selectedId);

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🗺️</span>
        <h4 className="text-sm font-semibold text-foreground">{t('artifact.spatialMap.title')}</h4>
      </div>

      {/* Map picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('artifact.spatialMap.pickLabel')}</label>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            <span>{t('artifact.spatialMap.loading')}</span>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : maps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('artifact.spatialMap.noMaps')}</p>
        ) : (
          <Select
            value={selectedId}
            onChange={(e) => handleSelect(e.target.value)}
            options={[
              { value: '', label: t('artifact.spatialMap.pickPlaceholder') },
              ...maps.map((m) => ({
                value: m.id,
                label: `${m.title}${m.visibility === 'private' ? ' 🔒' : ''}`,
              })),
            ]}
          />
        )}
      </div>

      {/* Preview thumbnail of selected map */}
      {selectedMap?.preview_url && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{t('artifact.spatialMap.currentMap')}</p>
          <div className="relative rounded-lg overflow-hidden border border-border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedMap.preview_url}
              alt={selectedMap.title}
              className="w-full max-h-48 object-contain"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Title override */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{t('artifact.spatialMap.titleOverrideLabel')}</label>
        <Input
          value={titleOverride}
          onChange={(e) =>
            onChange({
              ...(metadata ?? {}),
              title_override: e.target.value,
            })
          }
          placeholder={t('artifact.spatialMap.titleOverridePlaceholder')}
        />
      </div>

      <p className="text-xs text-muted-foreground">{t('artifact.spatialMap.helpText')}</p>
    </div>
  );
}
