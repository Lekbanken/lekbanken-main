'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

import { coachDiagramDocumentSchemaV1, type CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';
import { diagramViewBox, renderDiagramSvg } from '@/features/admin/library/coach-diagrams/svg';
import { getCourtBackgroundUrl } from '@/features/admin/library/coach-diagrams/courtBackgrounds';

type SessionGameResponse = {
  steps?: Array<{ media?: { type?: string; url?: string; altText?: string } | null } | null>;
};

type EditorMode = 'select' | 'arrow';

type Selection =
  | { kind: 'none' }
  | { kind: 'object'; id: string }
  | { kind: 'arrow'; id: string; handle?: 'from' | 'to' };

function nowIso() {
  return new Date().toISOString();
}

function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function snap(v: number) {
  const step = 0.02;
  return clamp01(Math.round(v / step) * step);
}

function clientToNormalized(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return { x: snap(x), y: snap(y) };
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;
}

function extractCoachDiagramId(url: string): string | null {
  // Expect `/api/coach-diagrams/{id}/svg`.
  const match = url.match(/\/api\/coach-diagrams\/([^/]+)\/svg(?:\?|$)/);
  if (!match) return null;
  const id = match[1];
  return id && id.length > 0 ? id : null;
}

export function CoachDiagramBuilderV1({
  sessionId,
  participantToken,
}: {
  sessionId: string;
  participantToken?: string;
}) {
  const t = useTranslations('tools.coachDiagram');
  const isParticipant = Boolean(participantToken);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [diagramIds, setDiagramIds] = useState<string[]>([]);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doc, setDoc] = useState<CoachDiagramDocumentV1 | null>(null);
  const [mode, setMode] = useState<EditorMode>('select');
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  const [pendingArrowStart, setPendingArrowStart] = useState<{ x: number; y: number } | null>(null);

  const [drag, setDrag] = useState<
    | null
    | { kind: 'object'; id: string }
    | { kind: 'arrow'; id: string; handle: 'from' | 'to' }
  >(null);

  const selectedObject = useMemo(() => {
    if (!doc) return null;
    if (selection.kind !== 'object') return null;
    return doc.objects.find((o) => o.id === selection.id) ?? null;
  }, [doc, selection]);

  const selectedArrow = useMemo(() => {
    if (!doc) return null;
    if (selection.kind !== 'arrow') return null;
    return doc.arrows.find((a) => a.id === selection.id) ?? null;
  }, [doc, selection]);
  const backgroundUrl = doc ? getCourtBackgroundUrl(doc.sportType) : null;

  const toolOptions = useMemo(() => {
    return diagramIds.map((id) => ({ value: id, label: id }));
  }, [diagramIds]);

  const fetchSessionDiagramIds = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/play/sessions/${sessionId}/game`, {
        headers: participantToken ? { 'x-participant-token': participantToken } : undefined,
        cache: 'no-store',
      });
      if (!res.ok) return;

      const data = (await res.json().catch(() => ({}))) as SessionGameResponse;
      const ids = new Set<string>();

      for (const step of data.steps ?? []) {
        const media = step?.media;
        if (!media?.url) continue;
        const id = extractCoachDiagramId(media.url);
        if (!id) continue;
        ids.add(id);
      }

      const list = Array.from(ids);
      setDiagramIds(list);
      if (!selectedDiagramId && list.length > 0) {
        setSelectedDiagramId(list[0]);
      }
    } catch {
      // Ignore: tool is optional.
    }
  }, [participantToken, selectedDiagramId, sessionId]);

  const loadDiagram = useCallback(async (diagramId: string) => {
    if (!diagramId) return;

    // Participants can’t read diagram JSON via admin endpoints.
    if (isParticipant) {
      setDoc(null);
      setLoading(false);
      setError(t('onlyLeaderCanEdit'));
      return;
    }

    setLoading(true);
    setError(null);
    setDoc(null);
    setSelection({ kind: 'none' });
    setMode('select');
    setPendingArrowStart(null);

    try {
      const res = await fetch(`/api/admin/coach-diagrams/${diagramId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as { diagram?: { document: unknown } };
      const parsed = coachDiagramDocumentSchemaV1.safeParse(json.diagram?.document);
      if (!parsed.success) throw new Error('Invalid diagram document');
      setDoc(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load diagram');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [isParticipant, t]);

  useEffect(() => {
    void fetchSessionDiagramIds();
  }, [fetchSessionDiagramIds]);

  useEffect(() => {
    if (!selectedDiagramId) return;
    void loadDiagram(selectedDiagramId);
  }, [loadDiagram, selectedDiagramId]);

  const save = useCallback(async () => {
    if (!doc || !selectedDiagramId) return;
    if (isParticipant) {
      setError(t('onlyLeaderCanSave'));
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const updated: CoachDiagramDocumentV1 = {
        ...doc,
        updatedAt: nowIso(),
      };

      const svg = renderDiagramSvg(updated);

      const res = await fetch(`/api/admin/coach-diagrams/${selectedDiagramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: updated, svg }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Save failed (${res.status})`);
      }

      setDoc(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [doc, isParticipant, selectedDiagramId, t]);

  const setTitle = (title: string) => {
    if (!doc) return;
    setDoc({ ...doc, title, updatedAt: nowIso() });
  };

  const addObject = (type: 'player' | 'marker' | 'ball') => {
    if (!doc) return;

    if (type === 'ball') {
      const existing = doc.objects.find((o) => o.type === 'ball');
      if (existing) {
        setSelection({ kind: 'object', id: existing.id });
        setMode('select');
        return;
      }
    }

    const id = makeId();
    const next = {
      id,
      type,
      position: { x: 0.5, y: 0.5 },
      style: {
        color: 'currentColor',
        size: 'md' as const,
        label: type === 'player' ? 'P' : undefined,
      },
    };

    setDoc({ ...doc, objects: [...doc.objects, next], updatedAt: nowIso() });
    setSelection({ kind: 'object', id });
    setMode('select');
  };

  const addArrowFromTo = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (!doc) return;
    const id = makeId();
    const next = {
      id,
      from,
      to,
      style: { color: 'currentColor', pattern: 'solid' as const, arrowhead: true },
      label: undefined,
    };

    setDoc({ ...doc, arrows: [...doc.arrows, next], updatedAt: nowIso() });
    setSelection({ kind: 'arrow', id });
  };

  const removeSelected = () => {
    if (!doc) return;
    if (selection.kind === 'object') {
      setDoc({ ...doc, objects: doc.objects.filter((o) => o.id !== selection.id), updatedAt: nowIso() });
      setSelection({ kind: 'none' });
      return;
    }
    if (selection.kind === 'arrow') {
      setDoc({ ...doc, arrows: doc.arrows.filter((a) => a.id !== selection.id), updatedAt: nowIso() });
      setSelection({ kind: 'none' });
    }
  };

  const duplicateSelected = () => {
    if (!doc) return;
    if (selection.kind === 'object') {
      const src = doc.objects.find((o) => o.id === selection.id);
      if (!src) return;

      if (src.type === 'ball' && doc.objects.some((o) => o.type === 'ball' && o.id !== src.id)) return;

      const id = makeId();
      const next = {
        ...src,
        id,
        position: {
          x: clamp01(src.position.x + 0.04),
          y: clamp01(src.position.y + 0.04),
        },
      };

      setDoc({ ...doc, objects: [...doc.objects, next], updatedAt: nowIso() });
      setSelection({ kind: 'object', id });
      return;
    }

    if (selection.kind === 'arrow') {
      const src = doc.arrows.find((a) => a.id === selection.id);
      if (!src) return;

      const id = makeId();
      const next = {
        ...src,
        id,
        from: { x: clamp01(src.from.x + 0.04), y: clamp01(src.from.y + 0.04) },
        to: { x: clamp01(src.to.x + 0.04), y: clamp01(src.to.y + 0.04) },
      };

      setDoc({ ...doc, arrows: [...doc.arrows, next], updatedAt: nowIso() });
      setSelection({ kind: 'arrow', id });
    }
  };

  const setSelectedLabel = (label: string) => {
    if (!doc || selection.kind !== 'object') return;
    setDoc({
      ...doc,
      objects: doc.objects.map((o) =>
        o.id === selection.id
          ? {
              ...o,
              style: {
                ...o.style,
                label: label.trim() ? label.slice(0, 16) : undefined,
              },
            }
          : o
      ),
      updatedAt: nowIso(),
    });
  };

  const setSelectedSize = (size: 'sm' | 'md' | 'lg') => {
    if (!doc || selection.kind !== 'object') return;
    setDoc({
      ...doc,
      objects: doc.objects.map((o) =>
        o.id === selection.id
          ? {
              ...o,
              style: {
                ...o.style,
                size,
              },
            }
          : o
      ),
      updatedAt: nowIso(),
    });
  };

  const setArrowPattern = (pattern: 'solid' | 'dashed') => {
    if (!doc || selection.kind !== 'arrow') return;
    setDoc({
      ...doc,
      arrows: doc.arrows.map((a) => (a.id === selection.id ? { ...a, style: { ...a.style, pattern } } : a)),
      updatedAt: nowIso(),
    });
  };

  const setArrowLabel = (label: string) => {
    if (!doc || selection.kind !== 'arrow') return;
    setDoc({
      ...doc,
      arrows: doc.arrows.map((a) =>
        a.id === selection.id
          ? {
              ...a,
              label: label.trim() ? label.slice(0, 32) : undefined,
            }
          : a
      ),
      updatedAt: nowIso(),
    });
  };

  const setArrowHead = (arrowhead: boolean) => {
    if (!doc || selection.kind !== 'arrow') return;
    setDoc({
      ...doc,
      arrows: doc.arrows.map((a) => (a.id === selection.id ? { ...a, style: { ...a.style, arrowhead } } : a)),
      updatedAt: nowIso(),
    });
  };

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!doc) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const target = e.target as Element | null;
    const objectId = target?.closest('[data-object-id]')?.getAttribute('data-object-id');
    const arrowId = target?.closest('[data-arrow-id]')?.getAttribute('data-arrow-id');

    if (mode === 'arrow') {
      const pos = clientToNormalized(e.clientX, e.clientY, rect);
      if (!pendingArrowStart) {
        setPendingArrowStart(pos);
      } else {
        addArrowFromTo(pendingArrowStart, pos);
        setPendingArrowStart(null);
        setMode('select');
      }
      return;
    }

    if (objectId) {
      setSelection({ kind: 'object', id: objectId });
      setDrag({ kind: 'object', id: objectId });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (arrowId) {
      const clicked = clientToNormalized(e.clientX, e.clientY, rect);
      const arrow = doc.arrows.find((a) => a.id === arrowId);

      if (arrow) {
        const dist = (p: { x: number; y: number }, q: { x: number; y: number }) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
        const threshold = 0.02 ** 2;
        const dFrom = dist(clicked, arrow.from);
        const dTo = dist(clicked, arrow.to);
        const handle: 'from' | 'to' | null = dFrom < threshold ? 'from' : dTo < threshold ? 'to' : null;

        if (handle) {
          setSelection({ kind: 'arrow', id: arrowId, handle });
          setDrag({ kind: 'arrow', id: arrowId, handle });
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      setSelection({ kind: 'arrow', id: arrowId });
      return;
    }

    setSelection({ kind: 'none' });
  };

  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!doc || !drag) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pos = clientToNormalized(e.clientX, e.clientY, rect);

    if (drag.kind === 'object') {
      setDoc({
        ...doc,
        objects: doc.objects.map((o) => (o.id === drag.id ? { ...o, position: pos } : o)),
        updatedAt: nowIso(),
      });
      return;
    }

    if (drag.kind === 'arrow') {
      setDoc({
        ...doc,
        arrows: doc.arrows.map((a) => {
          if (a.id !== drag.id) return a;
          return drag.handle === 'from' ? { ...a, from: pos } : { ...a, to: pos };
        }),
        updatedAt: nowIso(),
      });
    }
  };

  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    setDrag(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const hasDiagrams = diagramIds.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{t('title')}</div>
          <div className="text-xs text-muted-foreground">{t('description')}</div>
        </div>
        <Button type="button" size="sm" onClick={save} disabled={!doc || saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {!hasDiagrams ? (
        <Card className="p-4">
          <div className="text-sm font-medium">{t('noDiagrams')}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t('addDiagramHint')}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <Link className="underline" href="/admin/library/coach-diagrams" target="_blank" rel="noreferrer">
              {t('openDiagramLibrary')}
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
          <Card className="p-3 space-y-3">
            <Select
              label={t('diagram')}
              value={selectedDiagramId}
              onChange={(e) => setSelectedDiagramId(e.target.value)}
              options={toolOptions}
              placeholder={t('selectDiagram')}
            />

            {isParticipant && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                {t('onlyLeaderCanEdit')}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('titleLabel')}</label>
              <Input value={doc?.title ?? ''} onChange={(e) => setTitle(e.target.value)} disabled={!doc} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('tools')}</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={mode === 'select' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMode('select');
                    setPendingArrowStart(null);
                  }}
                >
                  {t('move')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'arrow' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMode('arrow');
                    setPendingArrowStart(null);
                  }}
                >
                  {t('arrows')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addObject('player')}>
                  {t('addPlayer')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addObject('marker')}>
                  {t('addMarker')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addObject('ball')}>
                  {t('addBall')}
                </Button>
              </div>
              {mode === 'arrow' && <div className="text-xs text-muted-foreground">{t('arrowHint')}</div>}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={duplicateSelected} disabled={selection.kind === 'none'}>
                {t('duplicate')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={removeSelected} disabled={selection.kind === 'none'}>
                {t('remove')}
              </Button>
            </div>

            {selection.kind === 'object' && selectedObject && (
              <div className="space-y-3 pt-2 border-t">
                <div className="text-sm font-medium">{t('selected')}: {selectedObject.type}</div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('label')}</label>
                  <Input value={selectedObject.style.label ?? ''} onChange={(e) => setSelectedLabel(e.target.value)} />
                </div>
                <Select
                  label={t('size')}
                  value={selectedObject.style.size}
                  onChange={(e) => setSelectedSize(e.target.value as 'sm' | 'md' | 'lg')}
                  options={[
                    { value: 'sm', label: t('sizeSmall') },
                    { value: 'md', label: t('sizeMedium') },
                    { value: 'lg', label: t('sizeLarge') },
                  ]}
                />
              </div>
            )}

            {selection.kind === 'arrow' && selectedArrow && (
              <div className="space-y-3 pt-2 border-t">
                <div className="text-sm font-medium">{t('selected')}: {t('arrow')}</div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('label')}</label>
                  <Input value={selectedArrow.label ?? ''} onChange={(e) => setArrowLabel(e.target.value)} />
                </div>
                <Select
                  label={t('pattern')}
                  value={selectedArrow.style.pattern}
                  onChange={(e) => setArrowPattern(e.target.value as 'solid' | 'dashed')}
                  options={[
                    { value: 'solid', label: t('patternSolid') },
                    { value: 'dashed', label: t('patternDashed') },
                  ]}
                />
                <Select
                  label={t('arrowhead')}
                  value={String(selectedArrow.style.arrowhead)}
                  onChange={(e) => setArrowHead(e.target.value === 'true')}
                  options={[
                    { value: 'true', label: t('yes') },
                    { value: 'false', label: t('no') },
                  ]}
                />
              </div>
            )}

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <div>
                <Link className="underline" href={`/admin/library/coach-diagrams/${selectedDiagramId}`} target="_blank" rel="noreferrer">
                  {t('openInAdmin')}
                </Link>
              </div>
              <div className="mt-1">
                <Link className="underline" href={`/api/coach-diagrams/${selectedDiagramId}/svg`} target="_blank" rel="noreferrer">
                  {t('openSvg')}
                </Link>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">{t('loading')}</div>
            ) : isParticipant ? (
              <div className="aspect-[3/5] w-full overflow-hidden rounded-xl border bg-background">
                <Image
                  src={`/api/coach-diagrams/${selectedDiagramId}/svg`}
                  alt={t('title')}
                  width={diagramViewBox.width}
                  height={diagramViewBox.height}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="aspect-[3/5] w-full overflow-hidden rounded-xl border bg-background">
                <div className="relative h-full w-full">
                  {backgroundUrl && (
                    <Image
                      src={backgroundUrl}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-contain pointer-events-none"
                    />
                  )}
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${diagramViewBox.width} ${diagramViewBox.height}`}
                    className="relative z-10 h-full w-full text-foreground"
                    onPointerDown={onSvgPointerDown}
                    onPointerMove={onSvgPointerMove}
                    onPointerUp={onSvgPointerUp}
                  >
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
                      </marker>
                    </defs>

                  {doc?.arrows.map((a) => {
                    const from = { x: a.from.x * diagramViewBox.width, y: a.from.y * diagramViewBox.height };
                    const to = { x: a.to.x * diagramViewBox.width, y: a.to.y * diagramViewBox.height };
                    const dash = a.style.pattern === 'dashed' ? '8 6' : undefined;
                    const isSelected = selection.kind === 'arrow' && selection.id === a.id;
                    const label = a.label?.trim() ? a.label : null;
                    const labelX = (from.x + to.x) / 2;
                    const labelY = (from.y + to.y) / 2 - 10;
                    return (
                      <g key={a.id} data-arrow-id={a.id}>
                        <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={18} strokeLinecap="round" />
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="currentColor"
                          strokeWidth={4}
                          strokeLinecap="round"
                          strokeOpacity={isSelected ? 1 : 0.9}
                          strokeDasharray={dash}
                          markerEnd={a.style.arrowhead ? 'url(#arrowhead)' : undefined}
                        />
                        {label && (
                          <>
                            <text
                              x={labelX}
                              y={labelY}
                              fontSize={14}
                              textAnchor="middle"
                              fill="none"
                              stroke="white"
                              strokeWidth={4}
                              strokeLinejoin="round"
                              strokeOpacity={0.9}
                            >
                              {label}
                            </text>
                            <text x={labelX} y={labelY} fontSize={14} textAnchor="middle" fill="currentColor" fillOpacity={0.85}>
                              {label}
                            </text>
                          </>
                        )}

                        {isSelected && (
                          <>
                            <circle cx={from.x} cy={from.y} r={18} fill="transparent" stroke="transparent" />
                            <circle cx={to.x} cy={to.y} r={18} fill="transparent" stroke="transparent" />
                            <circle cx={from.x} cy={from.y} r={10} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.6} />
                            <circle cx={to.x} cy={to.y} r={10} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.6} />
                          </>
                        )}
                      </g>
                    );
                  })}

                  {doc?.objects.map((o) => {
                    const x = o.position.x * diagramViewBox.width;
                    const y = o.position.y * diagramViewBox.height;
                    const r = o.style.size === 'sm' ? 14 : o.style.size === 'lg' ? 26 : 20;
                    const isSelected = selection.kind === 'object' && selection.id === o.id;
                    const label = o.style.label?.trim() ? o.style.label : null;
                    const isShort = label ? label.length <= 2 : false;
                    const labelY = isShort ? y + 5 : y - r - 8;
                    const labelFontSize = isShort ? 16 : 14;

                    if (o.type === 'ball') {
                      return (
                        <g key={o.id} data-object-id={o.id}>
                          <circle cx={x} cy={y} r={Math.max(20, r + 12)} fill="transparent" stroke="transparent" />
                          <circle cx={x} cy={y} r={Math.max(10, r - 6)} fill="currentColor" fillOpacity={0.9} />
                          {isSelected && <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={2} />}
                        </g>
                      );
                    }

                    const fill = o.type === 'marker' ? 'currentColor' : 'none';
                    const fillOpacity = o.type === 'marker' ? 0.12 : 0;

                    return (
                      <g key={o.id} data-object-id={o.id}>
                        <circle cx={x} cy={y} r={r + 14} fill="transparent" stroke="transparent" />
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill={fill}
                          fillOpacity={fillOpacity}
                          stroke="currentColor"
                          strokeOpacity={isSelected ? 1 : 0.85}
                          strokeWidth={3}
                        />
                        {label && (
                          <>
                            <text
                              x={x}
                              y={labelY}
                              fontSize={labelFontSize}
                              textAnchor="middle"
                              fill="none"
                              stroke="white"
                              strokeWidth={4}
                              strokeLinejoin="round"
                              strokeOpacity={0.9}
                            >
                              {label}
                            </text>
                            <text x={x} y={labelY} fontSize={labelFontSize} textAnchor="middle" fill="currentColor" fillOpacity={0.9}>
                              {label}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {pendingArrowStart && (
                    <circle
                      cx={pendingArrowStart.x * diagramViewBox.width}
                      cy={pendingArrowStart.y * diagramViewBox.height}
                      r={10}
                      fill="currentColor"
                      fillOpacity={0.12}
                      stroke="currentColor"
                      strokeOpacity={0.6}
                    />
                  )}
                </svg>
              </div>
            </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
