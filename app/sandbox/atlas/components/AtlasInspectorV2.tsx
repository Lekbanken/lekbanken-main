/**
 * AtlasInspector V2
 *
 * Enhanced inspector with full annotation support:
 * - Cleanup status dropdown
 * - Translation status dropdown
 * - Owner field
 * - Extended review flags (ux, data, rls, tested)
 * - Save/unsaved indicators
 */

'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import type { AtlasEdge, AtlasEntity, AtlasSelection } from '../types';
import {
  CLEANUP_STATUS_OPTIONS,
  TRANSLATION_STATUS_OPTIONS,
  calculateReviewCompletion,
  getRefactorSafetyLevel,
  type Annotation,
  type CleanupStatus,
  type TranslationStatus,
  type AtlasAnnotationReviewFlags,
} from '../lib/annotations-schema';

interface AtlasInspectorV2Props {
  selection: AtlasSelection | null;
  nodeLookup: Record<string, AtlasEntity & { risk?: string; usage?: string }>;
  edges: AtlasEdge[];
  lastSystemSyncAt: string | null;
  systemSyncSource: string | null;

  // Navigation
  onSelectNode?: (type: 'frame' | 'component' | 'table' | 'endpoint', id: string) => void;

  // Annotation props
  getAnnotation: (nodeId: string) => Annotation;
  onToggleReviewFlag: (nodeId: string, flag: keyof AtlasAnnotationReviewFlags) => void;
  onSetCleanupStatus: (nodeId: string, status: CleanupStatus) => void;
  onSetTranslationStatus: (nodeId: string, status: TranslationStatus) => void;
  onSetOwner: (nodeId: string, owner: string) => void;
  onSetNotes: (nodeId: string, notes: string) => void;
  onMarkAllReviewed: (nodeId: string) => void;
  onSave: () => Promise<boolean>;
  hasUnsavedChanges: boolean;
  lastSavedAt: string | null;
}

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

const SAFETY_BADGES = {
  safe: { label: 'Safe to Refactor', className: 'bg-green-100 text-green-700 border-green-300' },
  partial: { label: 'Partially Reviewed', className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  'not-safe': { label: 'Needs Review', className: 'bg-red-100 text-red-700 border-red-300' },
};

export function AtlasInspectorV2({
  selection,
  nodeLookup,
  edges,
  lastSystemSyncAt,
  systemSyncSource: _systemSyncSource,
  onSelectNode,
  getAnnotation,
  onToggleReviewFlag,
  onSetCleanupStatus,
  onSetTranslationStatus,
  onSetOwner,
  onSetNotes,
  onMarkAllReviewed,
  onSave,
  hasUnsavedChanges,
  lastSavedAt,
}: AtlasInspectorV2Props) {
  const selected = selection ? nodeLookup[`${selection.type}:${selection.id}`] : null;
  const annotation = selected ? getAnnotation(selected.id) : null;
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Track which node we're currently editing to reset draft state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [draftOwner, setDraftOwner] = useState('');
  
  // Show/hide dependency details
  const [showDependencies, setShowDependencies] = useState(false);

  // Reset draft state when selection changes
  const currentNodeId = selected?.id ?? null;
  if (currentNodeId !== editingNodeId) {
    setEditingNodeId(currentNodeId);
    setDraftNotes(annotation?.notes ?? '');
    setDraftOwner(annotation?.owner ?? '');
  }

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

  // Calculate dependency risk summary
  const dependencyRiskSummary = useMemo(() => {
    const allEdges = [...relations.incoming, ...relations.outgoing];
    let critical = 0, high = 0, medium = 0, low = 0;
    
    allEdges.forEach(edge => {
      const nodeKey = edge.fromType === selection?.type && edge.fromId === selection?.id
        ? `${edge.toType}:${edge.toId}`
        : `${edge.fromType}:${edge.fromId}`;
      const node = nodeLookup[nodeKey];
      const risk = (node?.risk as string) || 'low';
      if (risk === 'critical') critical++;
      else if (risk === 'high') high++;
      else if (risk === 'medium') medium++;
      else low++;
    });
    
    return { critical, high, medium, low, total: allEdges.length };
  }, [relations, nodeLookup, selection]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  if (!selected) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>Select a node in the canvas to see details.</p>
        
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs">
          <p className="font-medium">Tips:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>Node identity and metadata</li>
            <li>Usage status and risk level</li>
            <li>Dependencies (edges in/out)</li>
            <li>Impact trace for safe refactoring</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Data Source
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">📦</span>
              <span className="font-medium">inventory.json</span>
            </div>
            <div className="mt-1 text-muted-foreground">
              Last loaded: {formatTimestamp(lastSystemSyncAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const safetyLevel = getRefactorSafetyLevel(annotation ?? undefined);
  const safetyBadge = SAFETY_BADGES[safetyLevel];
  const completionPercent = annotation ? calculateReviewCompletion(annotation.reviewFlags) : 0;
  const isRoute = selected.type === 'frame';

  return (
    <div className="space-y-6">
      {/* Unsaved changes banner */}
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 p-2 text-xs">
          <span className="text-yellow-700">Unsaved changes</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {/* Node header */}
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
          <Badge className={safetyBadge.className}>{safetyBadge.label}</Badge>
        </div>

        {selected.fileRef && (
          <div className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
            {selected.fileRef}
          </div>
        )}
      </div>

      {/* Review completion bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Review completion</span>
          <span className="font-medium">{completionPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Relationships */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          onClick={() => setShowDependencies(!showDependencies)}
        >
          <span>Dependencies</span>
          <span className="text-xs normal-case font-normal">
            {showDependencies ? '▼' : '▶'} {relations.incoming.length + relations.outgoing.length} total
          </span>
        </button>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted/50 p-2">
            <div className="font-medium text-foreground">← Incoming</div>
            <div className="text-2xl font-bold">{relations.incoming.length}</div>
          </div>
          <div className="rounded bg-muted/50 p-2">
            <div className="font-medium text-foreground">→ Outgoing</div>
            <div className="text-2xl font-bold">{relations.outgoing.length}</div>
          </div>
        </div>

        {/* Dependency risk summary */}
        {dependencyRiskSummary.total > 0 && (
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-muted-foreground">Dependency risk:</span>
            {dependencyRiskSummary.critical > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
                {dependencyRiskSummary.critical} critical
              </span>
            )}
            {dependencyRiskSummary.high > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
                {dependencyRiskSummary.high} high
              </span>
            )}
            {dependencyRiskSummary.medium > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">
                {dependencyRiskSummary.medium} med
              </span>
            )}
            {dependencyRiskSummary.low > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                {dependencyRiskSummary.low} low
              </span>
            )}
          </div>
        )}
        
        {/* Expandable dependency list */}
        {showDependencies && (relations.incoming.length > 0 || relations.outgoing.length > 0) && (
          <div className="space-y-3 mt-2">
            {relations.incoming.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">← Uses this node:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {relations.incoming.slice(0, 10).map((edge, idx) => {
                    const sourceNode = nodeLookup[`${edge.fromType}:${edge.fromId}`];
                    const nodeRisk = sourceNode?.risk as string | undefined;
                    return (
                      <button
                        key={`in-${idx}`}
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-left hover:bg-muted/50"
                        onClick={() => onSelectNode?.(edge.fromType, edge.fromId)}
                        disabled={!onSelectNode}
                      >
                        <span className="text-muted-foreground">{edge.relation}</span>
                        <span className="truncate font-medium flex-1">
                          {sourceNode ? getEntityLabel(sourceNode) : edge.fromId}
                        </span>
                        {nodeRisk && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            nodeRisk === 'critical' ? 'bg-red-100 text-red-700' :
                            nodeRisk === 'high' ? 'bg-orange-100 text-orange-700' :
                            nodeRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {nodeRisk}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {relations.incoming.length > 10 && (
                    <div className="text-xs text-muted-foreground px-2">
                      +{relations.incoming.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {relations.outgoing.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">→ Depends on:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {relations.outgoing.slice(0, 10).map((edge, idx) => {
                    const targetNode = nodeLookup[`${edge.toType}:${edge.toId}`];
                    const nodeRisk = targetNode?.risk as string | undefined;
                    return (
                      <button
                        key={`out-${idx}`}
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-left hover:bg-muted/50"
                        onClick={() => onSelectNode?.(edge.toType, edge.toId)}
                        disabled={!onSelectNode}
                      >
                        <span className="text-muted-foreground">{edge.relation}</span>
                        <span className="truncate font-medium flex-1">
                          {targetNode ? getEntityLabel(targetNode) : edge.toId}
                        </span>
                        {nodeRisk && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            nodeRisk === 'critical' ? 'bg-red-100 text-red-700' :
                            nodeRisk === 'high' ? 'bg-orange-100 text-orange-700' :
                            nodeRisk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {nodeRisk}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {relations.outgoing.length > 10 && (
                    <div className="text-xs text-muted-foreground px-2">
                      +{relations.outgoing.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual layer - Annotations */}
      <div className="space-y-4 border-t pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Manual Annotations
        </div>

        {/* Review flags */}
        <div className="space-y-2">
          <Checkbox
            label="UX reviewed"
            checked={annotation?.reviewFlags.ux_reviewed ?? false}
            onChange={() => onToggleReviewFlag(selected.id, 'ux_reviewed')}
          />
          <Checkbox
            label="Data linked"
            checked={annotation?.reviewFlags.data_linked ?? false}
            onChange={() => onToggleReviewFlag(selected.id, 'data_linked')}
          />
          <Checkbox
            label="RLS checked"
            checked={annotation?.reviewFlags.rls_checked ?? false}
            onChange={() => onToggleReviewFlag(selected.id, 'rls_checked')}
          />
          <Checkbox
            label="Tested"
            checked={annotation?.reviewFlags.tested ?? false}
            onChange={() => onToggleReviewFlag(selected.id, 'tested')}
          />
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onMarkAllReviewed(selected.id)}
        >
          Mark All Reviewed
        </Button>

        {/* Cleanup status */}
        <div className="space-y-1">
          <Select
            label="Cleanup Status"
            value={annotation?.cleanup_status ?? 'not_started'}
            onChange={(e) => onSetCleanupStatus(selected.id, e.target.value as CleanupStatus)}
            options={CLEANUP_STATUS_OPTIONS}
          />
        </div>

        {/* Translation status (only for routes) */}
        {isRoute && (
          <div className="space-y-1">
            <Select
              label="Translation Status"
              value={annotation?.translation_status ?? 'n/a'}
              onChange={(e) => onSetTranslationStatus(selected.id, e.target.value as TranslationStatus)}
              options={TRANSLATION_STATUS_OPTIONS}
            />
          </div>
        )}

        {/* Owner */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Owner</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftOwner}
              onChange={(e) => setDraftOwner(e.target.value)}
              placeholder="Team or person"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSetOwner(selected.id, draftOwner)}
            >
              Set
            </Button>
          </div>
        </div>

        {/* Notes */}
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
            Save Notes
          </Button>
        </div>

        {/* Timestamps */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Last reviewed: {formatTimestamp(annotation?.lastReviewedAt)}</div>
          <div>Last modified: {formatTimestamp(annotation?.lastModifiedAt)}</div>
          <div>Last saved: {formatTimestamp(lastSavedAt)}</div>
        </div>
      </div>
    </div>
  );
}
