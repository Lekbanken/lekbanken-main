'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AchievementIconConfig } from '../types';

export type ServerPreset = {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  icon_config: AchievementIconConfig;
  category: 'custom' | 'system' | 'template';
  tags: string[];
  usage_count: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type UseServerPresetsOptions = {
  tenantId: string | null;
  includeGlobal?: boolean;
  category?: 'custom' | 'system' | 'template';
};

type UseServerPresetsReturn = {
  presets: ServerPreset[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPreset: (data: CreatePresetData) => Promise<string | null>;
  deletePreset: (id: string) => Promise<boolean>;
  trackUsage: (id: string) => Promise<void>;
};

type CreatePresetData = {
  name: string;
  description?: string;
  iconConfig: AchievementIconConfig;
  category?: 'custom' | 'system' | 'template';
  tags?: string[];
};

/**
 * Hook for managing server-side badge presets
 * Fetches from /api/admin/award-builder/presets
 */
export function useServerPresets({
  tenantId,
  includeGlobal = true,
  category,
}: UseServerPresetsOptions): UseServerPresetsReturn {
  const [presets, setPresets] = useState<ServerPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPresets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (tenantId) params.set('tenantId', tenantId);
      params.set('includeGlobal', String(includeGlobal));
      if (category) params.set('category', category);

      const res = await fetch(`/api/admin/award-builder/presets?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load presets');
      }

      setPresets(json.presets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presets');
      setPresets([]);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, includeGlobal, category]);

  // Initial fetch
  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  const createPreset = useCallback(async (data: CreatePresetData): Promise<string | null> => {
    try {
      const res = await fetch('/api/admin/award-builder/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          tenantId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create preset');
      }

      // Refresh the list
      await fetchPresets();
      return json.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create preset');
      return null;
    }
  }, [tenantId, fetchPresets]);

  const deletePreset = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/award-builder/presets/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete preset');
      }

      // Update local state
      setPresets(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete preset');
      return false;
    }
  }, []);

  const trackUsage = useCallback(async (id: string): Promise<void> => {
    try {
      // Fire and forget - don't await or handle errors
      fetch(`/api/admin/award-builder/presets/${id}`, { method: 'POST' });
    } catch {
      // Silently ignore usage tracking errors
    }
  }, []);

  return {
    presets,
    isLoading,
    error,
    refresh: fetchPresets,
    createPreset,
    deletePreset,
    trackUsage,
  };
}

/**
 * Combine local (localStorage) presets with server presets
 * Local presets are shown first, then server presets
 */
export function mergeLocalAndServerPresets(
  localPresets: Array<{ id: string; name: string; icon: AchievementIconConfig; createdAt: string }>,
  serverPresets: ServerPreset[],
): Array<{ id: string; name: string; icon: AchievementIconConfig; isServer: boolean; preset?: ServerPreset }> {
  const merged = [
    ...localPresets.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      isServer: false,
    })),
    ...serverPresets.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon_config,
      isServer: true,
      preset: p,
    })),
  ];

  return merged;
}
