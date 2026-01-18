'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { AtlasEdge, AtlasEntity, AtlasReviewFlag, AtlasReviewStatus, AtlasSelection } from '../types';

interface AtlasInspectorProps {
  selection: AtlasSelection | null;
  nodeLookup: Record<string, AtlasEntity>;
  edges: AtlasEdge[];
  lastSystemSyncAt: string | null;
  systemSyncSource: string | null;
  onToggleReviewFlag: (frameId: string, flag: AtlasReviewFlag) => void;
  onMarkReviewed: (frameId: string) => void;
  onSetNotes: (frameId: string, notes: string) => void;
}

const reviewBadgeVariant: Record<AtlasReviewStatus, 'success' | 'warning' | 'destructive'> = {
  complete: 'success',
  partial: 'warning',
  missing: 'destructive',
};

function formatTimestamp(value?: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

function getEntityLabel(entity: AtlasEntity) {
  if (entity.type === 'endpoint') {
    return `${entity.method ?? 'GET'} ${entity.path}`;
  }
  return entity.name;
}

function getEntitySubtitle(entity: AtlasEntity) {
  if (entity.type === 'frame') return entity.route;
  if (entity.type === 'endpoint') return entity.fileRef ?? entity.path;
  if (entity.type === 'table') return entity.schema ? `${entity.schema}.${entity.name}` : entity.name;
  return entity.fileRef ?? '';
}

export function AtlasInspector({
  selection,
  nodeLookup,
  edges,
  lastSystemSyncAt,
  systemSyncSource,
  onToggleReviewFlag,
  onMarkReviewed,
  onSetNotes,
}: AtlasInspectorProps) {
  const selected = selection ? nodeLookup[`${selection.type}:${selection.id}`] : null;
  const [draftNotes, setDraftNotes] = useState('');

  useEffect(() => {
    if (selected?.type === 'frame') {
      setDraftNotes(selected.notes ?? '');
    } else {
      setDraftNotes('');
    }
  }, [selected?.id, selected?.type, selected?.notes]);

  const relations = useMemo(() => {
    if (!selection) {
      return { incoming: [], outgoing: [] };
    }
    const incoming = edges.filter(
      (edge) => edge.toType === selection.type && edge.toId === selection.id
    );
    const outgoing = edges.filter(
      (edge) => edge.fromType === selection.type && edge.fromId === selection.id
    );
    return { incoming, outgoing };
  }, [edges, selection]);

  if (!selected) {
    return (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>Select a node in the canvas to see details.</p>
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs">
          Tip: use filters or search to focus the map.
        </div>
      </div>
    );
  }

  const isFrame = selected.type === 'frame';

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">System layer</div>
        <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
          <div className="font-semibold text-foreground">Last system sync</div>
          <div>{formatTimestamp(lastSystemSyncAt)}</div>
          {systemSyncSource && <div className="mt-1 text-muted-foreground">{systemSyncSource}</div>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {selected.type}
            </div>
            <h3 className="text-lg font-semibold text-foreground">{getEntityLabel(selected)}</h3>
            {getEntitySubtitle(selected) && (
              <div className="text-xs text-muted-foreground">{getEntitySubtitle(selected)}</div>
            )}
          </div>
          {isFrame && (
            <Badge variant={reviewBadgeVariant[selected.reviewStatus]}>
              {selected.reviewStatus}
            </Badge>
          )}
        </div>

        {selected.fileRef && (
          <div className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {selected.fileRef}
          </div>
        )}
      </div>

      {isFrame && (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Access
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.roles.map((role) => (
              <span key={role} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Relationships
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">Incoming:</span>{' '}
            {relations.incoming.length || 'None'}
          </div>
          {relations.incoming.slice(0, 6).map((edge) => {
            const key = `${edge.fromType}:${edge.fromId}`;
            const entity = nodeLookup[key];
            return (
              <div key={key}>
                {edge.relation} from {entity ? getEntityLabel(entity) : key}
              </div>
            );
          })}
          <div className="pt-2">
            <span className="font-semibold text-foreground">Outgoing:</span>{' '}
            {relations.outgoing.length || 'None'}
          </div>
          {relations.outgoing.slice(0, 6).map((edge) => {
            const key = `${edge.toType}:${edge.toId}`;
            const entity = nodeLookup[key];
            return (
              <div key={key}>
                {edge.relation} to {entity ? getEntityLabel(entity) : key}
              </div>
            );
          })}
        </div>
      </div>

      {isFrame && (
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Manual layer
          </div>
          <div className="space-y-2">
            <Checkbox
              label="UX reviewed"
              checked={selected.reviewFlags.ux_reviewed}
              onChange={() => onToggleReviewFlag(selected.id, 'ux_reviewed')}
            />
            <Checkbox
              label="Data linked"
              checked={selected.reviewFlags.data_linked}
              onChange={() => onToggleReviewFlag(selected.id, 'data_linked')}
            />
            <Checkbox
              label="RLS checked"
              checked={selected.reviewFlags.rls_checked}
              onChange={() => onToggleReviewFlag(selected.id, 'rls_checked')}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Last reviewed: {formatTimestamp(selected.lastReviewedAt)}
          </div>

          <Button type="button" size="sm" variant="outline" onClick={() => onMarkReviewed(selected.id)}>
            Mark UX reviewed
          </Button>

          <div className="space-y-2">
            <Textarea
              label="Notes"
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              placeholder="Add review notes or gaps"
            />
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => onSetNotes(selected.id, draftNotes)}
            >
              Save notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
