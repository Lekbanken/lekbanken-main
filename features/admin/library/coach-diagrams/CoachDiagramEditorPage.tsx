'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { coachDiagramDocumentSchemaV1, type CoachDiagramDocumentV1 } from '@/lib/validation/coachDiagramSchemaV1';
import { renderDiagramSvg, diagramViewBox } from './svg';
import { getCourtBackgroundUrl } from './courtBackgrounds';
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from '@/components/admin/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  // Minimal snap-to-grid (no extra UI): 2% increments.
  const step = 0.02;
  return clamp01(Math.round(v / step) * step);
}

function clientToNormalized(
  clientX: number,
  clientY: number,
  svgRect: DOMRect
): { x: number; y: number } {
  const x = (clientX - svgRect.left) / svgRect.width;
  const y = (clientY - svgRect.top) / svgRect.height;
  return { x: snap(x), y: snap(y) };
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;
}

export function CoachDiagramEditorPage({ diagramId }: { diagramId: string }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doc, setDoc] = useState<CoachDiagramDocumentV1 | null>(null);
  const [mode, setMode] = useState<EditorMode>('select');
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });

  const [drag, setDrag] = useState<
    | null
    | {
        kind: 'object';
        id: string;
      }
    | {
        kind: 'arrow';
        id: string;
        handle: 'from' | 'to';
      }
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

  const svgMarkup = useMemo(() => {
    if (!doc) return null;
    return renderDiagramSvg(doc);
  }, [doc]);
  const backgroundUrl = doc ? getCourtBackgroundUrl(doc.sportType) : null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coach-diagrams/${diagramId}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      const json = (await res.json()) as { diagram?: { document: unknown } };
      const parsed = coachDiagramDocumentSchemaV1.safeParse(json.diagram?.document);
      if (!parsed.success) {
        throw new Error('Invalid diagram document');
      }
      setDoc(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [diagramId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    setError(null);
    try {
      const updated: CoachDiagramDocumentV1 = {
        ...doc,
        updatedAt: nowIso(),
      };

      const svg = renderDiagramSvg(updated);

      const res = await fetch(`/api/admin/coach-diagrams/${diagramId}`, {
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
  }, [diagramId, doc]);

  const setTitle = (title: string) => {
    if (!doc) return;
    setDoc({ ...doc, title, updatedAt: nowIso() });
  };

  const setSportType = (sportType: CoachDiagramDocumentV1['sportType']) => {
    if (!doc) return;
    setDoc({ ...doc, sportType, updatedAt: nowIso() });
  };

  const setFieldTemplateId = (fieldTemplateId: string) => {
    if (!doc) return;
    setDoc({ ...doc, fieldTemplateId, updatedAt: nowIso() });
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
      return;
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

  const [pendingArrowStart, setPendingArrowStart] = useState<{ x: number; y: number } | null>(null);

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!doc) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const target = e.target as Element | null;
    const objectId = target?.closest('[data-object-id]')?.getAttribute('data-object-id');
    const arrowId = target?.closest('[data-arrow-id]')?.getAttribute('data-arrow-id');

    // Arrow draw mode: click start then end.
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
      (e.currentTarget as unknown as SVGSVGElement).setPointerCapture(e.pointerId);
      return;
    }

    if (arrowId) {
      // If clicked close to endpoints, drag that endpoint.
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
          (e.currentTarget as unknown as SVGSVGElement).setPointerCapture(e.pointerId);
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
      (e.currentTarget as unknown as SVGSVGElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <AdminPageLayout>
        <div className="text-sm text-muted-foreground">Laddar…</div>
      </AdminPageLayout>
    );
  }

  if (!doc) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title="Kunde inte öppna diagram"
          description={error ?? 'Okänt fel'}
          action={{ label: 'Tillbaka', onClick: () => router.push('/admin/library/coach-diagrams') }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={doc.title}
        description="Redigera diagram (SVG)."
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/library/coach-diagrams')}
              disabled={saving}
            >
              Tillbaka
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? 'Sparar…' : 'Spara'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card className="p-4 space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Titel</label>
            <Input value={doc.title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sport</label>
              <Select
                value={doc.sportType}
                onChange={(e) => setSportType(e.target.value as CoachDiagramDocumentV1['sportType'])}
                options={[
                  { value: 'football', label: 'Fotboll' },
                  { value: 'basketball', label: 'Basket' },
                  { value: 'handball', label: 'Handboll' },
                  { value: 'hockey', label: 'Hockey' },
                  { value: 'innebandy', label: 'Innebandy' },
                  { value: 'custom', label: 'Custom' },
                ]}
              >
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mall</label>
              <Input value={doc.fieldTemplateId} onChange={(e) => setFieldTemplateId(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Verktyg</label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={mode === 'select' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('select'); setPendingArrowStart(null); }}>
                Flytta
              </Button>
              <Button type="button" variant={mode === 'arrow' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('arrow'); setPendingArrowStart(null); }}>
                Pilar
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addObject('player')}>
                + Spelare
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addObject('marker')}>
                + Markör
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addObject('ball')}>
                + Boll
              </Button>
            </div>
            {mode === 'arrow' && (
              <p className="text-xs text-muted-foreground">
                Klicka startpunkt, klicka slutpunkt.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={duplicateSelected} disabled={selection.kind === 'none'}>
              Duplicera
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={removeSelected} disabled={selection.kind === 'none'}>
              Ta bort
            </Button>
          </div>

          {selection.kind === 'object' && selectedObject && (
            <div className="space-y-3 pt-2 border-t">
              <div className="text-sm font-medium">Vald: {selectedObject.type}</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={selectedObject.style.label ?? ''} onChange={(e) => setSelectedLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Storlek</label>
                <Select
                  value={selectedObject.style.size}
                  onChange={(e) => setSelectedSize(e.target.value as 'sm' | 'md' | 'lg')}
                  options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Medium' },
                    { value: 'lg', label: 'Large' },
                  ]}
                />
              </div>
            </div>
          )}

          {selection.kind === 'arrow' && selectedArrow && (
            <div className="space-y-3 pt-2 border-t">
              <div className="text-sm font-medium">Vald: pil</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Label</label>
                <Input value={selectedArrow.label ?? ''} onChange={(e) => setArrowLabel(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mönster</label>
                  <Select
                    value={selectedArrow.style.pattern}
                    onChange={(e) => setArrowPattern(e.target.value as 'solid' | 'dashed')}
                    options={[
                      { value: 'solid', label: 'Solid' },
                      { value: 'dashed', label: 'Dashed' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pilhuvud</label>
                  <Select
                    value={String(selectedArrow.style.arrowhead)}
                    onChange={(e) => setArrowHead(e.target.value === 'true')}
                    options={[
                      { value: 'true', label: 'Ja' },
                      { value: 'false', label: 'Nej' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            ID: <span className="font-mono">{doc.id}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">Förhandsvisning</div>

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

              {/* Arrows */}
              {doc.arrows.map((a) => {
                const from = { x: a.from.x * diagramViewBox.width, y: a.from.y * diagramViewBox.height };
                const to = { x: a.to.x * diagramViewBox.width, y: a.to.y * diagramViewBox.height };
                const dash = a.style.pattern === 'dashed' ? '8 6' : undefined;
                const isSelected = selection.kind === 'arrow' && selection.id === a.id;
                const label = a.label?.trim() ? a.label : null;
                const labelX = (from.x + to.x) / 2;
                const labelY = (from.y + to.y) / 2 - 10;
                return (
                  <g key={a.id} data-arrow-id={a.id}>
                    {/* Wide invisible hit target for mobile */}
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="transparent"
                      strokeWidth={18}
                      strokeLinecap="round"
                    />
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
                        {/* Slightly larger hit targets for endpoints */}
                        <circle cx={from.x} cy={from.y} r={18} fill="transparent" stroke="transparent" />
                        <circle cx={to.x} cy={to.y} r={18} fill="transparent" stroke="transparent" />
                        <circle cx={from.x} cy={from.y} r={10} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.6} />
                        <circle cx={to.x} cy={to.y} r={10} fill="currentColor" fillOpacity={0.12} stroke="currentColor" strokeOpacity={0.6} />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Objects */}
              {doc.objects.map((o) => {
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

              {/* Pending arrow start marker */}
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

          <div className="mt-3 text-xs text-muted-foreground">
            <Link className="underline" href={`/api/coach-diagrams/${doc.id}/svg`} target="_blank" rel="noreferrer">
              Öppna SVG
            </Link>
          </div>

          {/* Keep this for quick debugging if needed */}
          {process.env.NODE_ENV === 'development' && svgMarkup && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-muted-foreground">SVG (debug)</summary>
              <pre className="mt-2 overflow-auto rounded-lg border bg-muted/20 p-2 text-xs">{svgMarkup}</pre>
            </details>
          )}
        </Card>
      </div>
    </AdminPageLayout>
  );
}
