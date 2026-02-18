'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Button, Card, CardContent, CardHeader, CardTitle, Select, Slider, Switch } from '@/components/ui';
import { COURT_BACKGROUND_BY_SPORT } from '@/features/admin/library/coach-diagrams/courtBackgrounds';
import { diagramViewBox } from '@/features/admin/library/coach-diagrams/svg';
import {
  ArrowHeadOnly,
  ArrowHeadMarker,
  ArrowLine,
  Ball,
  CenteredImage,
  LabelText,
  MarkerCross,
  PlayerRing,
  ZoneCircle,
  ZoneRect,
  ZoneTriangle,
  ballRadiusForSize,
  imageSizeForSize,
  radiusForSize,
  type PrimitiveSize,
} from '@/components/coach-diagram/svg-primitives';

type BackgroundOption = 'none' | keyof typeof COURT_BACKGROUND_BY_SPORT;
type AssetOption =
  | 'player'
  | 'player-png'
  | 'ball'
  | 'ball-png'
  | 'marker'
  | 'arrow-line-solid'
  | 'arrow-line-dashed'
  | 'arrow-head'
  | 'label';

const BACKGROUND_OPTIONS: Array<{ value: BackgroundOption; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'basketball', label: 'Basket' },
  { value: 'football', label: 'Fotboll' },
  { value: 'handball', label: 'Handboll' },
  { value: 'hockey', label: 'Hockey' },
  { value: 'innebandy', label: 'Innebandy' },
];

const COLOR_OPTIONS = [
  { value: '#ffffff', label: 'White' },
  { value: '#111827', label: 'Ink' },
  { value: '#8661ff', label: 'Violet' },
  { value: '#16a34a', label: 'Green' },
];

const SIZE_OPTIONS: Array<{ value: PrimitiveSize; label: string }> = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

const ASSET_OPTIONS: Array<{ value: AssetOption; label: string }> = [
  { value: 'player', label: 'Player ring' },
  { value: 'player-png', label: 'Player PNG' },
  { value: 'ball', label: 'Ball' },
  { value: 'ball-png', label: 'Ball PNG' },
  { value: 'marker', label: 'Marker cross' },
  { value: 'arrow-line-solid', label: 'Arrow line (solid)' },
  { value: 'arrow-line-dashed', label: 'Arrow line (dashed)' },
  { value: 'arrow-head', label: 'Arrow head' },
  { value: 'label', label: 'Label' },
];

const SAMPLE_PLAYERS = [
  { id: 'p1', x: 140, y: 180, label: 'P1' },
  { id: 'p2', x: 460, y: 200, label: 'P2' },
  { id: 'p3', x: 200, y: 520, label: 'P3' },
  { id: 'p4', x: 400, y: 740, label: 'P4' },
];

const SAMPLE_MARKERS = [
  { id: 'm1', x: 140, y: 420 },
  { id: 'm2', x: 460, y: 820 },
];

const SAMPLE_ARROWS = [
  { id: 'a1', from: { x: 140, y: 180 }, to: { x: 300, y: 360 }, label: 'Cut', dashed: false },
  { id: 'a2', from: { x: 300, y: 600 }, to: { x: 460, y: 820 }, label: 'Fade', dashed: true },
];

const SAMPLE_BALL = { x: 300, y: 480 };

const PLAYER_MARKER_BY_SPORT = {
  basketball: '/coach-diagram/markers/basketball-player_v2.webp',
  football: '/coach-diagram/markers/football-player_v2.webp',
  handball: '/coach-diagram/markers/football-player_v2.webp',
  hockey: '/coach-diagram/markers/hockeyjersey-player_v2.webp',
  innebandy: '/coach-diagram/markers/football-player_v2.webp',
} as const;

const BALL_MARKER_BY_SPORT = {
  basketball: '/coach-diagram/markers/basketball-ball_v2.webp',
  football: '/coach-diagram/markers/football-ball_v2.webp',
  handball: '/coach-diagram/markers/handball-ball_v2.webp',
  hockey: '/coach-diagram/markers/hockeypuck-ball_v2.webp',
  innebandy: '/coach-diagram/markers/innebandyball-ball_v2.webp',
} as const;

const ZONE_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
} as const;

const ZONE_DEMOS = [
  { id: 'red', label: 'Red', x: 40, y: 80, width: 240, height: 240 },
  { id: 'orange', label: 'Orange', x: 320, y: 80, width: 240, height: 240 },
  { id: 'yellow', label: 'Yellow', x: 40, y: 680, width: 240, height: 240 },
  { id: 'green', label: 'Green', x: 320, y: 680, width: 240, height: 240 },
] as const;

const ZONE_CIRCLES = [
  { id: 'circle-red', zoneId: 'red', cx: 160, cy: 520, r: 90 },
  { id: 'circle-green', zoneId: 'green', cx: 440, cy: 520, r: 90 },
] as const;

const ZONE_TRIANGLES = [
  {
    id: 'triangle-orange',
    zoneId: 'orange',
    points: [
      { x: 300, y: 140 },
      { x: 520, y: 320 },
      { x: 80, y: 320 },
    ],
  },
  {
    id: 'triangle-yellow',
    zoneId: 'yellow',
    points: [
      { x: 300, y: 860 },
      { x: 520, y: 660 },
      { x: 80, y: 660 },
    ],
  },
] as const;

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function CoachDiagramsSandboxPage() {
  const [background, setBackground] = useState<BackgroundOption>('basketball');
  const [overlayColor, setOverlayColor] = useState<string>('#111827');
  const [size, setSize] = useState<PrimitiveSize>('md');
  const [showPlayers, setShowPlayers] = useState(true);
  const [showBall, setShowBall] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showArrowSolid, setShowArrowSolid] = useState(true);
  const [showArrowDashed, setShowArrowDashed] = useState(true);
  const [showArrowHead, setShowArrowHead] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showHitline, setShowHitline] = useState(false);
  const [usePlayerImage, setUsePlayerImage] = useState(true);
  const [useBallImage, setUseBallImage] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showZoneCircles, setShowZoneCircles] = useState(false);
  const [showZoneTriangles, setShowZoneTriangles] = useState(false);
  const [zoneOpacity, setZoneOpacity] = useState(0.18);
  const [zoneVisibility, setZoneVisibility] = useState({
    red: true,
    orange: true,
    yellow: true,
    green: true,
  });
  const [arrowStrokeWidth, setArrowStrokeWidth] = useState(4);
  const [arrowHeadSize, setArrowHeadSize] = useState(24);
  const [outlineStrokeWidth, setOutlineStrokeWidth] = useState(3);
  const [copyAsset, setCopyAsset] = useState<AssetOption>('player');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const backgroundUrl = background === 'none' ? null : COURT_BACKGROUND_BY_SPORT[background];
  const labelFontSize = size === 'lg' ? 16 : 14;
  const imageSize = imageSizeForSize(size);
  const markerSport = background === 'none' ? 'football' : background;
  const playerImageUrl = PLAYER_MARKER_BY_SPORT[markerSport];
  const ballImageUrl = BALL_MARKER_BY_SPORT[markerSport];

  const assetMarkup = useMemo(() => {
    const viewBox = '0 0 100 100';
    const radius = radiusForSize(size);
    const ballRadius = ballRadiusForSize(size);
    const half = radius * 0.9;
    const markerDef = `
  <defs>
    <marker id="arrowhead" markerWidth="${arrowHeadSize}" markerHeight="${arrowHeadSize}" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse" viewBox="0 0 12 12">
      <path d="M0,0 L0,12 L12,6 z" fill="currentColor" />
    </marker>
  </defs>`;

    switch (copyAsset) {
      case 'ball':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <circle cx="50" cy="50" r="${ballRadius}" fill="currentColor" fill-opacity="0.9" />
</svg>`;
      case 'player-png':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <image href="${playerImageUrl}" x="${50 - imageSize / 2}" y="${50 - imageSize / 2}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
      case 'ball-png':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <image href="${ballImageUrl}" x="${50 - imageSize / 2}" y="${50 - imageSize / 2}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet" />
</svg>`;
      case 'marker':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <circle cx="50" cy="50" r="${half}" fill="currentColor" fill-opacity="0.12" />
  <line x1="${50 - half}" y1="${50 - half}" x2="${50 + half}" y2="${50 + half}" stroke="currentColor" stroke-width="${outlineStrokeWidth}" stroke-linecap="round" />
  <line x1="${50 - half}" y1="${50 + half}" x2="${50 + half}" y2="${50 - half}" stroke="currentColor" stroke-width="${outlineStrokeWidth}" stroke-linecap="round" />
</svg>`;
      case 'arrow-line-solid':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="${arrowStrokeWidth}" stroke-linecap="round" />
</svg>`;
      case 'arrow-line-dashed':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" stroke-width="${arrowStrokeWidth}" stroke-linecap="round" stroke-dasharray="8 6" />
</svg>`;
      case 'arrow-head':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
${markerDef}
  <line x1="10" y1="50" x2="90" y2="50" stroke="transparent" stroke-width="1" marker-end="url(#arrowhead)" />
</svg>`;
      case 'label':
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <text x="50" y="52" font-size="${labelFontSize}" text-anchor="middle" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round" stroke-opacity="0.9">Label</text>
  <text x="50" y="52" font-size="${labelFontSize}" text-anchor="middle" fill="currentColor" fill-opacity="0.9">Label</text>
</svg>`;
      case 'player':
      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
  <circle cx="50" cy="50" r="${radius}" fill="none" stroke="currentColor" stroke-width="${outlineStrokeWidth}" />
</svg>`;
    }
  }, [
    arrowHeadSize,
    arrowStrokeWidth,
    ballImageUrl,
    copyAsset,
    imageSize,
    labelFontSize,
    outlineStrokeWidth,
    playerImageUrl,
    size,
  ]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assetMarkup);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    } finally {
      window.setTimeout(() => setCopyStatus('idle'), 1500);
    }
  };

  return (
    <SandboxShell
      moduleId="admin-coach-diagrams"
      title="Coach Diagrams Sandbox"
      description="Iterate on SVG primitives with background courts and size toggles."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                label="Court"
                value={background}
                onChange={(e) => setBackground(e.target.value as BackgroundOption)}
                options={BACKGROUND_OPTIONS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overlay Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                label="Color"
                value={overlayColor}
                onChange={(e) => setOverlayColor(e.target.value)}
                options={COLOR_OPTIONS}
              />
              <Select
                label="Size"
                value={size}
                onChange={(e) => setSize(e.target.value as PrimitiveSize)}
                options={SIZE_OPTIONS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Players" checked={showPlayers} onChange={setShowPlayers} />
              <ToggleRow label="Ball" checked={showBall} onChange={setShowBall} />
              <ToggleRow label="Marker" checked={showMarkers} onChange={setShowMarkers} />
              <ToggleRow label="Arrow solid" checked={showArrowSolid} onChange={setShowArrowSolid} />
              <ToggleRow label="Arrow dashed" checked={showArrowDashed} onChange={setShowArrowDashed} />
              <ToggleRow label="Arrow head" checked={showArrowHead} onChange={setShowArrowHead} />
              <ToggleRow label="Labels" checked={showLabels} onChange={setShowLabels} />
              <ToggleRow label="Show hitline" checked={showHitline} onChange={setShowHitline} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Zones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Show zones" checked={showZones} onChange={setShowZones} />
              <ToggleRow label="Circle zones" checked={showZoneCircles} onChange={setShowZoneCircles} />
              <ToggleRow label="Triangle zones" checked={showZoneTriangles} onChange={setShowZoneTriangles} />
              <ToggleRow
                label="Red zone"
                checked={zoneVisibility.red}
                onChange={(value) => setZoneVisibility((prev) => ({ ...prev, red: value }))}
              />
              <ToggleRow
                label="Orange zone"
                checked={zoneVisibility.orange}
                onChange={(value) => setZoneVisibility((prev) => ({ ...prev, orange: value }))}
              />
              <ToggleRow
                label="Yellow zone"
                checked={zoneVisibility.yellow}
                onChange={(value) => setZoneVisibility((prev) => ({ ...prev, yellow: value }))}
              />
              <ToggleRow
                label="Green zone"
                checked={zoneVisibility.green}
                onChange={(value) => setZoneVisibility((prev) => ({ ...prev, green: value }))}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Zone opacity</span>
                  <span className="text-muted-foreground">{zoneOpacity.toFixed(2)}</span>
                </div>
                <Slider
                  min={0.05}
                  max={0.4}
                  step={0.01}
                  value={[zoneOpacity]}
                  onValueChange={(value) => setZoneOpacity(value[0] ?? 0.18)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PNG Markers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Players as PNG" checked={usePlayerImage} onChange={setUsePlayerImage} />
              <ToggleRow label="Ball as PNG" checked={useBallImage} onChange={setUseBallImage} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stroke Width</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Arrow stroke</span>
                  <span className="text-muted-foreground">{arrowStrokeWidth}px</span>
                </div>
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={[arrowStrokeWidth]}
                  onValueChange={(value) => setArrowStrokeWidth(value[0] ?? 4)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Arrow head size</span>
                  <span className="text-muted-foreground">{arrowHeadSize}px</span>
                </div>
                <Slider
                  min={6}
                  max={60}
                  step={1}
                  value={[arrowHeadSize]}
                  onValueChange={(value) => setArrowHeadSize(value[0] ?? 24)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Ring / marker stroke</span>
                  <span className="text-muted-foreground">{outlineStrokeWidth}px</span>
                </div>
                <Slider
                  min={1}
                  max={8}
                  step={1}
                  value={[outlineStrokeWidth]}
                  onValueChange={(value) => setOutlineStrokeWidth(value[0] ?? 3)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                label="Asset"
                value={copyAsset}
                onChange={(e) => setCopyAsset(e.target.value as AssetOption)}
                options={ASSET_OPTIONS}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                  Copy SVG markup
                </Button>
                {copyStatus === 'copied' && <span className="text-xs text-green-600">Copied</span>}
                {copyStatus === 'error' && <span className="text-xs text-red-600">Copy failed</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Canvas Preview</CardTitle>
            </CardHeader>
            <CardContent>
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
                    viewBox={`0 0 ${diagramViewBox.width} ${diagramViewBox.height}`}
                    className="relative z-10 h-full w-full"
                    style={{ color: overlayColor }}
                  >
                    <defs>
                      <ArrowHeadMarker id="arrowhead" markerWidth={arrowHeadSize} markerHeight={arrowHeadSize} />
                    </defs>

                    {showZones &&
                      ZONE_DEMOS.map((zone) =>
                        zoneVisibility[zone.id] ? (
                          <ZoneRect
                            key={zone.id}
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            fill={ZONE_COLORS[zone.id]}
                            fillOpacity={zoneOpacity}
                          />
                        ) : null
                      )}

                    {showZoneCircles &&
                      ZONE_CIRCLES.map((zone) =>
                        zoneVisibility[zone.zoneId] ? (
                          <ZoneCircle
                            key={zone.id}
                            cx={zone.cx}
                            cy={zone.cy}
                            r={zone.r}
                            fill={ZONE_COLORS[zone.zoneId]}
                            fillOpacity={zoneOpacity}
                          />
                        ) : null
                      )}

                    {showZoneTriangles &&
                      ZONE_TRIANGLES.map((zone) =>
                        zoneVisibility[zone.zoneId] ? (
                          <ZoneTriangle
                            key={zone.id}
                            points={zone.points}
                            fill={ZONE_COLORS[zone.zoneId]}
                            fillOpacity={zoneOpacity}
                          />
                        ) : null
                      )}

                    {showArrowSolid &&
                      SAMPLE_ARROWS.filter((arrow) => !arrow.dashed).map((arrow) => (
                        <g key={arrow.id}>
                          {showHitline && (
                            <line
                              x1={arrow.from.x}
                              y1={arrow.from.y}
                              x2={arrow.to.x}
                              y2={arrow.to.y}
                              stroke="currentColor"
                              strokeOpacity={0.2}
                              strokeWidth={18}
                              strokeLinecap="round"
                            />
                          )}
                          <ArrowLine
                            from={arrow.from}
                            to={arrow.to}
                            strokeWidth={arrowStrokeWidth}
                            showHead={false}
                            markerId="arrowhead"
                          />
                          {showLabels && arrow.label && (
                            <LabelText
                              text={arrow.label}
                              x={(arrow.from.x + arrow.to.x) / 2}
                              y={(arrow.from.y + arrow.to.y) / 2 - 10}
                              fontSize={labelFontSize}
                            />
                          )}
                        </g>
                      ))}

                    {showArrowDashed &&
                      SAMPLE_ARROWS.filter((arrow) => arrow.dashed).map((arrow) => (
                        <g key={arrow.id}>
                          {showHitline && (
                            <line
                              x1={arrow.from.x}
                              y1={arrow.from.y}
                              x2={arrow.to.x}
                              y2={arrow.to.y}
                              stroke="currentColor"
                              strokeOpacity={0.2}
                              strokeWidth={18}
                              strokeLinecap="round"
                            />
                          )}
                          <ArrowLine
                            from={arrow.from}
                            to={arrow.to}
                            strokeWidth={arrowStrokeWidth}
                            dashed
                            showHead={false}
                            markerId="arrowhead"
                          />
                          {showLabels && arrow.label && (
                            <LabelText
                              text={arrow.label}
                              x={(arrow.from.x + arrow.to.x) / 2}
                              y={(arrow.from.y + arrow.to.y) / 2 - 10}
                              fontSize={labelFontSize}
                            />
                          )}
                        </g>
                      ))}

                    {showArrowHead &&
                      SAMPLE_ARROWS.map((arrow) => (
                        <ArrowHeadOnly key={`${arrow.id}-head`} from={arrow.from} to={arrow.to} markerId="arrowhead" />
                      ))}

                    {showPlayers &&
                      SAMPLE_PLAYERS.map((player) => {
                        const radius = radiusForSize(size);
                        const playerLabelOffset = usePlayerImage ? imageSize / 2 : radius;
                        const labelY = player.y - playerLabelOffset - 10;
                        return (
                          <g key={player.id}>
                            {usePlayerImage ? (
                              <CenteredImage href={playerImageUrl} cx={player.x} cy={player.y} size={size} />
                            ) : (
                              <PlayerRing cx={player.x} cy={player.y} size={size} strokeWidth={outlineStrokeWidth} />
                            )}
                            {showLabels && (
                              <LabelText text={player.label} x={player.x} y={labelY} fontSize={labelFontSize} />
                            )}
                          </g>
                        );
                      })}

                    {showMarkers &&
                      SAMPLE_MARKERS.map((marker) => (
                        <MarkerCross key={marker.id} cx={marker.x} cy={marker.y} size={size} strokeWidth={outlineStrokeWidth} />
                      ))}

                    {showBall &&
                      (useBallImage ? (
                        <CenteredImage href={ballImageUrl} cx={SAMPLE_BALL.x} cy={SAMPLE_BALL.y} size={size} />
                      ) : (
                        <Ball cx={SAMPLE_BALL.x} cy={SAMPLE_BALL.y} size={size} />
                      ))}
                  </svg>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">ViewBox: 0 0 600 1000</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SandboxShell>
  );
}
