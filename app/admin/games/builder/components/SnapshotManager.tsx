'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  ArchiveBoxIcon,
  PlusIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { formatSnapshotVersion } from '@/types/game-snapshot';

// =============================================================================
// Types
// =============================================================================

type SnapshotSummary = {
  id: string;
  version: number;
  version_label: string | null;
  includes_steps: boolean;
  includes_phases: boolean;
  includes_roles: boolean;
  includes_artifacts: boolean;
  includes_triggers: boolean;
  includes_board_config: boolean;
  created_at: string;
};

type SnapshotManagerProps = {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  onSnapshotCreated?: (snapshot: SnapshotSummary) => void;
};

// =============================================================================
// Component
// =============================================================================

export function SnapshotManager({
  gameId,
  isOpen,
  onClose,
  onSnapshotCreated,
}: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch snapshots
  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/snapshots`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSnapshots(data.snapshots ?? []);
      }
    } catch {
      setError('Kunde inte hämta versioner');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
    }
  }, [isOpen, fetchSnapshots]);

  // Create snapshot
  const createSnapshot = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${gameId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionLabel: versionLabel || undefined }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setVersionLabel('');
        fetchSnapshots();
        onSnapshotCreated?.(data.snapshot);
      }
    } catch {
      setError('Kunde inte skapa version');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[80vh] bg-background rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ArchiveBoxIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Versionshantering</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Create new snapshot */}
        <div className="p-4 border-b bg-surface-secondary/50">
          <h3 className="text-sm font-medium mb-2">Skapa ny version</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Versionsetikett (valfritt), t.ex. 'Launch version'"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="default"
              onClick={createSnapshot}
              disabled={creating}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {creating ? 'Skapar...' : 'Skapa snapshot'}
            </Button>
          </div>
          <p className="text-xs text-foreground-secondary mt-2">
            En snapshot fryser spelets nuvarande tillstånd. Sessioner kan
            använda snapshots så att ändringar i spelet inte påverkar pågående
            sessioner.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Snapshot list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-foreground-secondary">
              Laddar versioner...
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-3 text-foreground-tertiary" />
              <p className="text-foreground-secondary">
                Inga versioner ännu
              </p>
              <p className="text-sm text-foreground-tertiary mt-1">
                Skapa en snapshot för att frysa spelets nuvarande tillstånd.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snapshot, index) => (
                <Card
                  key={snapshot.id}
                  className={`p-4 ${index === 0 ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatSnapshotVersion(
                            snapshot.version,
                            snapshot.version_label
                          )}
                        </span>
                        {index === 0 && (
                          <Badge variant="default" size="sm">
                            Senaste
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-foreground-secondary">
                        <ClockIcon className="h-3 w-3" />
                        {formatDate(snapshot.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {snapshot.includes_steps && (
                        <Badge variant="outline" size="sm">
                          Steg
                        </Badge>
                      )}
                      {snapshot.includes_phases && (
                        <Badge variant="outline" size="sm">
                          Faser
                        </Badge>
                      )}
                      {snapshot.includes_roles && (
                        <Badge variant="outline" size="sm">
                          Roller
                        </Badge>
                      )}
                      {snapshot.includes_artifacts && (
                        <Badge variant="outline" size="sm">
                          Artefakter
                        </Badge>
                      )}
                      {snapshot.includes_triggers && (
                        <Badge variant="outline" size="sm">
                          Triggers
                        </Badge>
                      )}
                      {snapshot.includes_board_config && (
                        <Badge variant="outline" size="sm">
                          Board
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-surface-secondary/50">
          <div className="flex items-center justify-between text-sm text-foreground-secondary">
            <span>
              {snapshots.length} version{snapshots.length !== 1 ? 'er' : ''}
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Stäng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
