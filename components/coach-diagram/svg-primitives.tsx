type Position = {
  x: number;
  y: number;
};

export type PrimitiveSize = 'sm' | 'md' | 'lg';

const SIZE_TO_RADIUS: Record<PrimitiveSize, number> = {
  sm: 14,
  md: 20,
  lg: 26,
};

const SIZE_TO_IMAGE: Record<PrimitiveSize, number> = {
  sm: 34,
  md: 48,
  lg: 62,
};

export function radiusForSize(size: PrimitiveSize): number {
  return SIZE_TO_RADIUS[size];
}

export function ballRadiusForSize(size: PrimitiveSize): number {
  return Math.max(10, radiusForSize(size) - 6);
}

export function imageSizeForSize(size: PrimitiveSize): number {
  return SIZE_TO_IMAGE[size];
}

export function CenteredImage({
  href,
  cx,
  cy,
  size = 'md',
  width,
  height,
  opacity = 1,
}: {
  href: string;
  cx: number;
  cy: number;
  size?: PrimitiveSize;
  width?: number;
  height?: number;
  opacity?: number;
}) {
  const imageWidth = width ?? imageSizeForSize(size);
  const imageHeight = height ?? imageSizeForSize(size);
  return (
    <image
      href={href}
      x={cx - imageWidth / 2}
      y={cy - imageHeight / 2}
      width={imageWidth}
      height={imageHeight}
      opacity={opacity}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

export function PlayerRing({
  cx,
  cy,
  size = 'md',
  strokeWidth = 3,
}: {
  cx: number;
  cy: number;
  size?: PrimitiveSize;
  strokeWidth?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radiusForSize(size)}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
    />
  );
}

export function Ball({
  cx,
  cy,
  size = 'md',
  fillOpacity = 0.9,
}: {
  cx: number;
  cy: number;
  size?: PrimitiveSize;
  fillOpacity?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={ballRadiusForSize(size)}
      fill="currentColor"
      fillOpacity={fillOpacity}
    />
  );
}

export function MarkerCross({
  cx,
  cy,
  size = 'md',
  strokeWidth = 3,
  length,
  fillOpacity = 0.12,
}: {
  cx: number;
  cy: number;
  size?: PrimitiveSize;
  strokeWidth?: number;
  length?: number;
  fillOpacity?: number;
}) {
  const half = (length ?? radiusForSize(size)) * 0.9;
  return (
    <>
      <circle cx={cx} cy={cy} r={half} fill="currentColor" fillOpacity={fillOpacity} />
      <line
        x1={cx - half}
        y1={cy - half}
        x2={cx + half}
        y2={cy + half}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={cx - half}
        y1={cy + half}
        x2={cx + half}
        y2={cy - half}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </>
  );
}

export function ArrowHeadMarker({
  id = 'arrowhead',
  markerWidth = 12,
  markerHeight = 12,
  refX = 10,
  refY = 6,
  markerUnits = 'userSpaceOnUse',
  viewBox = '0 0 12 12',
}: {
  id?: string;
  markerWidth?: number;
  markerHeight?: number;
  refX?: number;
  refY?: number;
  markerUnits?: 'userSpaceOnUse' | 'strokeWidth';
  viewBox?: string;
}) {
  return (
    <marker
      id={id}
      markerWidth={markerWidth}
      markerHeight={markerHeight}
      refX={refX}
      refY={refY}
      orient="auto"
      markerUnits={markerUnits}
      viewBox={viewBox}
    >
      <path d="M0,0 L0,12 L12,6 z" fill="currentColor" />
    </marker>
  );
}

export function ArrowLine({
  from,
  to,
  strokeWidth = 4,
  dashed = false,
  showHead = true,
  markerId = 'arrowhead',
}: {
  from: Position;
  to: Position;
  strokeWidth?: number;
  dashed?: boolean;
  showHead?: boolean;
  markerId?: string;
}) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={dashed ? '8 6' : undefined}
      markerEnd={showHead ? `url(#${markerId})` : undefined}
    />
  );
}

export function ArrowHeadOnly({
  from,
  to,
  markerId = 'arrowhead',
}: {
  from: Position;
  to: Position;
  markerId?: string;
}) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="transparent"
      strokeWidth={1}
      markerEnd={`url(#${markerId})`}
    />
  );
}

export function ZoneRect({
  x,
  y,
  width,
  height,
  fill,
  fillOpacity = 0.2,
  strokeOpacity = 0.35,
  strokeWidth = 2,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={fill}
      strokeOpacity={strokeOpacity}
      strokeWidth={strokeWidth}
    />
  );
}

export function ZoneCircle({
  cx,
  cy,
  r,
  fill,
  fillOpacity = 0.2,
  strokeOpacity = 0.35,
  strokeWidth = 2,
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={fill}
      strokeOpacity={strokeOpacity}
      strokeWidth={strokeWidth}
    />
  );
}

export function ZoneTriangle({
  points,
  fill,
  fillOpacity = 0.2,
  strokeOpacity = 0.35,
  strokeWidth = 2,
}: {
  points: ReadonlyArray<{ x: number; y: number }>;
  fill: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
}) {
  const pointsAttr = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <polygon
      points={pointsAttr}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={fill}
      strokeOpacity={strokeOpacity}
      strokeWidth={strokeWidth}
    />
  );
}

export function LabelText({
  text,
  x,
  y,
  fontSize = 14,
  haloWidth = 4,
  haloColor = 'white',
}: {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  haloWidth?: number;
  haloColor?: string;
}) {
  return (
    <>
      <text
        x={x}
        y={y}
        fontSize={fontSize}
        textAnchor="middle"
        fill="none"
        stroke={haloColor}
        strokeWidth={haloWidth}
        strokeLinejoin="round"
        strokeOpacity={0.9}
      >
        {text}
      </text>
      <text x={x} y={y} fontSize={fontSize} textAnchor="middle" fill="currentColor" fillOpacity={0.9}>
        {text}
      </text>
    </>
  );
}
