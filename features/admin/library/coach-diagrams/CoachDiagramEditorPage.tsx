'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { coachDiagramDocumentSchemaV1, type CoachDiagramDocumentV1, type ZoneV1 } from '@/lib/validation/coachDiagramSchemaV1';
import { renderDiagramSvg, diagramViewBox } from './svg';
import { getCourtBackgroundUrl } from './courtBackgrounds';
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from '@/components/admin/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  CenteredImage,
  ZoneRect,
  ZoneCircle,
  ZoneTriangle,
  imageSizeForSize,
  radiusForSize,
  ballRadiusForSize,
  type PrimitiveSize,
} from '@/components/coach-diagram/svg-primitives';

// Sport-specific marker images
const PLAYER_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-player_v2.webp',
  football: '/coach-diagram/markers/football-player_v2.webp',
  handball: '/coach-diagram/markers/football-player_v2.webp',
  hockey: '/coach-diagram/markers/hockeyjersey-player_v2.webp',
  innebandy: '/coach-diagram/markers/football-player_v2.webp',
  custom: '/coach-diagram/markers/football-player_v2.webp',
};

const BALL_MARKER_BY_SPORT: Record<string, string> = {
  basketball: '/coach-diagram/markers/basketball-ball_v2.webp',
  football: '/coach-diagram/markers/football-ball_v2.webp',
  handball: '/coach-diagram/markers/handball-ball_v2.webp',
  hockey: '/coach-diagram/markers/hockeypuck-ball_v2.webp',
  innebandy: '/coach-diagram/markers/innebandyball-ball_v2.webp',
  custom: '/coach-diagram/markers/football-ball_v2.webp',
};

// Predefined zone colors
const ZONE_COLORS = [
  { value: '#ef4444', label: 'Röd' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Gul' },
  { value: '#22c55e', label: 'Grön' },
  { value: '#3b82f6', label: 'Blå' },
  { value: '#8b5cf6', label: 'Lila' },
] as const;

type EditorMode = 'select' | 'arrow' | 'zone-rect' | 'zone-circle';

type Selection =
  | { kind: 'none' }
  | { kind: 'object'; id: string }
  | { kind: 'arrow'; id: string; handle?: 'from' | 'to' }
  | { kind: 'zone'; id: string };

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
  const t = useTranslations('admin.coachDiagrams');
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [doc, setDoc] = useState<CoachDiagramDocumentV1 | null>(null);
  const [mode, setMode] = useState<EditorMode>('select');
  const [selection, setSelection] = useState<Selection>({ kind: 'none' });
  
  // Visual style options
  const [usePlayerImages, setUsePlayerImages] = useState(true);
  const [useBallImages, setUseBallImages] = useState(true);
  const [zoneOpacity, _setZoneOpacity] = useState(0.2);

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
    | {
        kind: 'zone';
        id: string;
      }
  >(null);

  // Zone drawing state
  const [pendingZoneStart, setPendingZoneStart] = useState<{ x: number; y: number } | null>(null);

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

  const selectedZone = useMemo(() => {
    if (!doc) return null;
    if (selection.kind !== 'zone') return null;
    return doc.zones?.find((z) => z.id === selection.id) ?? null;
  }, [doc, selection]);

  const svgMarkup = useMemo(() => {
    if (!doc) return null;
    return renderDiagramSvg(doc);
  }, [doc]);
  const backgroundUrl = doc ? getCourtBackgroundUrl(doc.sportType) : null;
  
  // Sport-specific marker URLs
  const playerImageUrl = doc ? PLAYER_MARKER_BY_SPORT[doc.sportType] || PLAYER_MARKER_BY_SPORT.football : PLAYER_MARKER_BY_SPORT.football;
  const ballImageUrl = doc ? BALL_MARKER_BY_SPORT[doc.sportType] || BALL_MARKER_BY_SPORT.football : BALL_MARKER_BY_SPORT.football;

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

  const addZoneRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!doc) return;
    const id = makeId();
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.max(0.05, Math.abs(end.x - start.x));
    const height = Math.max(0.05, Math.abs(end.y - start.y));
    
    const newZone: ZoneV1 = {
      id,
      type: 'rect',
      x,
      y,
      width,
      height,
      style: { fill: ZONE_COLORS[0].value, fillOpacity: zoneOpacity },
    };

    setDoc({ ...doc, zones: [...(doc.zones ?? []), newZone], updatedAt: nowIso() });
    setSelection({ kind: 'zone', id });
  };

  const addZoneCircle = (center: { x: number; y: number }, edge: { x: number; y: number }) => {
    if (!doc) return;
    const id = makeId();
    const dx = edge.x - center.x;
    const dy = edge.y - center.y;
    const r = Math.max(0.05, Math.sqrt(dx * dx + dy * dy));
    
    const newZone: ZoneV1 = {
      id,
      type: 'circle',
      cx: center.x,
      cy: center.y,
      r: Math.min(0.5, r),
      style: { fill: ZONE_COLORS[2].value, fillOpacity: zoneOpacity },
    };

    setDoc({ ...doc, zones: [...(doc.zones ?? []), newZone], updatedAt: nowIso() });
    setSelection({ kind: 'zone', id });
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
    if (selection.kind === 'zone') {
      setDoc({ ...doc, zones: (doc.zones ?? []).filter((z) => z.id !== selection.id), updatedAt: nowIso() });
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

  const setZoneColor = (fill: string) => {
    if (!doc || selection.kind !== 'zone') return;
    setDoc({
      ...doc,
      zones: (doc.zones ?? []).map((z) =>
        z.id === selection.id ? { ...z, style: { ...z.style, fill } } : z
      ),
      updatedAt: nowIso(),
    });
  };

  const setZoneFillOpacity = (fillOpacity: number) => {
    if (!doc || selection.kind !== 'zone') return;
    setDoc({
      ...doc,
      zones: (doc.zones ?? []).map((z) =>
        z.id === selection.id ? { ...z, style: { ...z.style, fillOpacity } } : z
      ),
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
    const zoneId = target?.closest('[data-zone-id]')?.getAttribute('data-zone-id');

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

    // Zone rect draw mode
    if (mode === 'zone-rect') {
      const pos = clientToNormalized(e.clientX, e.clientY, rect);
      if (!pendingZoneStart) {
        setPendingZoneStart(pos);
      } else {
        addZoneRect(pendingZoneStart, pos);
        setPendingZoneStart(null);
        setMode('select');
      }
      return;
    }

    // Zone circle draw mode
    if (mode === 'zone-circle') {
      const pos = clientToNormalized(e.clientX, e.clientY, rect);
      if (!pendingZoneStart) {
        setPendingZoneStart(pos);
      } else {
        addZoneCircle(pendingZoneStart, pos);
        setPendingZoneStart(null);
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

    if (zoneId) {
      setSelection({ kind: 'zone', id: zoneId });
      setDrag({ kind: 'zone', id: zoneId });
      (e.currentTarget as unknown as SVGSVGElement).setPointerCapture(e.pointerId);
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
      return;
    }

    if (drag.kind === 'zone') {
      setDoc({
        ...doc,
        zones: (doc.zones ?? []).map((z) => {
          if (z.id !== drag.id) return z;
          if (z.type === 'rect') {
            return { ...z, x: clamp01(pos.x - z.width / 2), y: clamp01(pos.y - z.height / 2) };
          }
          if (z.type === 'circle') {
            return { ...z, cx: pos.x, cy: pos.y };
          }
          // Triangle - move all points by delta (not fully implemented for simplicity)
          return z;
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
        <div className="text-sm text-muted-foreground">{t('loading')}</div>
      </AdminPageLayout>
    );
  }

  if (!doc) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          title={t('couldNotOpen')}
          description={error ?? t('unknownError')}
          action={{ label: t('back'), onClick: () => router.push('/admin/library/coach-diagrams') }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={doc.title}
        description={t('editDiagram')}
        actions={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/library/coach-diagrams')}
              disabled={saving}
            >
              {t('back')}
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? t('saving') : t('save')}
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
              <Button type="button" variant={mode === 'select' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('select'); setPendingArrowStart(null); setPendingZoneStart(null); }}>
                Flytta
              </Button>
              <Button type="button" variant={mode === 'arrow' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('arrow'); setPendingArrowStart(null); setPendingZoneStart(null); }}>
                {t('arrows')}
              </Button>
              <Button type="button" variant={mode === 'zone-rect' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('zone-rect'); setPendingArrowStart(null); setPendingZoneStart(null); }}>
                {t('addRectangle')}
              </Button>
              <Button type="button" variant={mode === 'zone-circle' ? 'default' : 'outline'} size="sm" onClick={() => { setMode('zone-circle'); setPendingArrowStart(null); setPendingZoneStart(null); }}>
                {t('addCircle')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
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
            {mode === 'arrow' && (
              <p className="text-xs text-muted-foreground">
                {t('arrowInstructions')}
              </p>
            )}
            {(mode === 'zone-rect' || mode === 'zone-circle') && (
              <p className="text-xs text-muted-foreground">
                {mode === 'zone-rect' ? t('rectInstructions') : t('circleInstructions')}
              </p>
            )}
          </div>

          {/* Visual Style Options */}
          <div className="space-y-3 pt-2 border-t">
            <label className="text-sm font-medium">Utseende</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Spelare som bilder</span>
              <Switch checked={usePlayerImages} onCheckedChange={setUsePlayerImages} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Boll som bild</span>
              <Switch checked={useBallImages} onCheckedChange={setUseBallImages} />
            </div>
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
                  <label className="text-sm font-medium">{t('pattern')}</label>
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
                  <label className="text-sm font-medium">{t('arrowhead')}</label>
                  <Select
                    value={String(selectedArrow.style.arrowhead)}
                    onChange={(e) => setArrowHead(e.target.value === 'true')}
                    options={[
                      { value: 'true', label: t('yes') },
                      { value: 'false', label: t('no') },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {selection.kind === 'zone' && selectedZone && (
            <div className="space-y-3 pt-2 border-t">
              <div className="text-sm font-medium">{t('selectedZone', { type: selectedZone.type })}</div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('color')}</label>
                <Select
                  value={selectedZone.style.fill}
                  onChange={(e) => setZoneColor(e.target.value)}
                  options={ZONE_COLORS.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('transparency')}</span>
                  <span className="text-muted-foreground">{((selectedZone.style.fillOpacity ?? 0.2) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  value={[selectedZone.style.fillOpacity ?? 0.2]}
                  onValueChange={(value) => setZoneFillOpacity(value[0] ?? 0.2)}
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            ID: <span className="font-mono">{doc.id}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">{t('preview')}</div>

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

              {/* Zones - rendered first so they appear behind everything else */}
              {(doc.zones ?? []).map((zone) => {
                const isSelected = selection.kind === 'zone' && selection.id === zone.id;
                
                if (zone.type === 'rect') {
                  const x = zone.x * diagramViewBox.width;
                  const y = zone.y * diagramViewBox.height;
                  const width = zone.width * diagramViewBox.width;
                  const height = zone.height * diagramViewBox.height;
                  return (
                    <g key={zone.id} data-zone-id={zone.id}>
                      <ZoneRect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={zone.style.fill}
                        fillOpacity={zone.style.fillOpacity ?? 0.2}
                        strokeOpacity={isSelected ? 0.8 : 0.35}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    </g>
                  );
                }

                if (zone.type === 'circle') {
                  const cx = zone.cx * diagramViewBox.width;
                  const cy = zone.cy * diagramViewBox.height;
                  const r = zone.r * Math.min(diagramViewBox.width, diagramViewBox.height);
                  return (
                    <g key={zone.id} data-zone-id={zone.id}>
                      <ZoneCircle
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill={zone.style.fill}
                        fillOpacity={zone.style.fillOpacity ?? 0.2}
                        strokeOpacity={isSelected ? 0.8 : 0.35}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    </g>
                  );
                }

                if (zone.type === 'triangle') {
                  const points = zone.points.map((p) => ({
                    x: p.x * diagramViewBox.width,
                    y: p.y * diagramViewBox.height,
                  }));
                  return (
                    <g key={zone.id} data-zone-id={zone.id}>
                      <ZoneTriangle
                        points={points}
                        fill={zone.style.fill}
                        fillOpacity={zone.style.fillOpacity ?? 0.2}
                        strokeOpacity={isSelected ? 0.8 : 0.35}
                        strokeWidth={isSelected ? 3 : 2}
                      />
                    </g>
                  );
                }

                return null;
              })}

              {/* Pending zone preview */}
              {pendingZoneStart && mode === 'zone-rect' && (
                <circle
                  cx={pendingZoneStart.x * diagramViewBox.width}
                  cy={pendingZoneStart.y * diagramViewBox.height}
                  r={8}
                  fill={ZONE_COLORS[0].value}
                  fillOpacity={0.5}
                />
              )}
              {pendingZoneStart && mode === 'zone-circle' && (
                <circle
                  cx={pendingZoneStart.x * diagramViewBox.width}
                  cy={pendingZoneStart.y * diagramViewBox.height}
                  r={8}
                  fill={ZONE_COLORS[2].value}
                  fillOpacity={0.5}
                />
              )}

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
                const size = o.style.size as PrimitiveSize;
                const r = radiusForSize(size);
                const _imageSize = imageSizeForSize(size);
                const isSelected = selection.kind === 'object' && selection.id === o.id;
                const label = o.style.label?.trim() ? o.style.label : null;
                const isShort = label ? label.length <= 2 : false;
                const labelY = isShort ? y + 5 : y - r - 8;
                const labelFontSize = isShort ? 16 : 14;

                if (o.type === 'ball') {
                  const ballR = ballRadiusForSize(size);
                  return (
                    <g key={o.id} data-object-id={o.id}>
                      <circle cx={x} cy={y} r={Math.max(20, r + 12)} fill="transparent" stroke="transparent" />
                      {useBallImages ? (
                        <CenteredImage href={ballImageUrl} cx={x} cy={y} size={size} />
                      ) : (
                        <circle cx={x} cy={y} r={ballR} fill="currentColor" fillOpacity={0.9} />
                      )}
                      {isSelected && <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeOpacity={0.6} strokeWidth={2} />}
                    </g>
                  );
                }

                if (o.type === 'player') {
                  return (
                    <g key={o.id} data-object-id={o.id}>
                      <circle cx={x} cy={y} r={r + 14} fill="transparent" stroke="transparent" />
                      {usePlayerImages ? (
                        <CenteredImage href={playerImageUrl} cx={x} cy={y} size={size} />
                      ) : (
                        <circle
                          cx={x}
                          cy={y}
                          r={r}
                          fill="none"
                          stroke="currentColor"
                          strokeOpacity={isSelected ? 1 : 0.85}
                          strokeWidth={3}
                        />
                      )}
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
                      {isSelected && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="currentColor" strokeOpacity={0.4} strokeWidth={2} strokeDasharray="4 2" />}
                    </g>
                  );
                }

                // Marker (cross)
                const half = r * 0.9;
                return (
                  <g key={o.id} data-object-id={o.id}>
                    <circle cx={x} cy={y} r={r + 14} fill="transparent" stroke="transparent" />
                    <circle cx={x} cy={y} r={half} fill="currentColor" fillOpacity={0.12} />
                    <line
                      x1={x - half}
                      y1={y - half}
                      x2={x + half}
                      y2={y + half}
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeOpacity={isSelected ? 1 : 0.85}
                    />
                    <line
                      x1={x - half}
                      y1={y + half}
                      x2={x + half}
                      y2={y - half}
                      stroke="currentColor"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeOpacity={isSelected ? 1 : 0.85}
                    />
                    {label && (
                      <>
                        <text
                          x={x}
                          y={y - r - 8}
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
                        <text x={x} y={y - r - 8} fontSize={14} textAnchor="middle" fill="currentColor" fillOpacity={0.9}>
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
              {t('openSvg')}
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
