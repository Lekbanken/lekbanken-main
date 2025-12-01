'use client'

import { cn } from '@/lib/utils'

interface SvgProps {
  color?: string
  secondaryColor?: string
  size?: number
  className?: string
  glow?: boolean
}

// ============================================
// BASE SHAPES
// ============================================

export function CircleBase({ color = '#f59e0b', size = 160, className, glow }: SvgProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn('transition-all duration-300', className)}
    >
      <defs>
        <radialGradient id="circleGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
        </radialGradient>
        {glow && (
          <filter id="circleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <circle
        cx="50"
        cy="50"
        r="45"
        fill={color}
        stroke={color}
        strokeWidth="2"
        filter={glow ? 'url(#circleGlow)' : undefined}
      />
      <circle cx="50" cy="50" r="45" fill="url(#circleGrad)" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  )
}

export function ShieldBase({ color = '#f59e0b', size = 160, className, glow }: SvgProps) {
  return (
    <svg
      viewBox="0 0 100 120"
      width={size}
      height={size * 1.2}
      className={cn('transition-all duration-300', className)}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
        </linearGradient>
        {glow && (
          <filter id="shieldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M50 5 L90 20 L90 60 Q90 95 50 115 Q10 95 10 60 L10 20 Z"
        fill={color}
        stroke={color}
        strokeWidth="2"
        filter={glow ? 'url(#shieldGlow)' : undefined}
      />
      <path d="M50 5 L90 20 L90 60 Q90 95 50 115 Q10 95 10 60 L10 20 Z" fill="url(#shieldGrad)" />
      <path
        d="M50 10 L85 23 L85 58 Q85 90 50 108 Q15 90 15 58 L15 23 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
    </svg>
  )
}

// ============================================
// DECORATIONS
// ============================================

export function WingsDecoration({ color = '#f59e0b', size = 200, className }: SvgProps) {
  return (
    <svg viewBox="0 0 200 120" width={size} height={size * 0.6} className={cn('', className)}>
      <defs>
        <linearGradient id="wingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {/* Left wing */}
      <path
        d="M95 60 Q70 40 30 20 Q20 30 25 50 Q30 70 60 80 Q80 85 95 70 Z"
        fill="url(#wingGrad)"
        opacity="0.9"
      />
      <path
        d="M95 60 Q75 55 45 45 Q40 55 50 65 Q65 75 95 70"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.5"
        strokeOpacity="0.5"
      />
      {/* Right wing */}
      <path
        d="M105 60 Q130 40 170 20 Q180 30 175 50 Q170 70 140 80 Q120 85 105 70 Z"
        fill="url(#wingGrad)"
        opacity="0.9"
      />
      <path
        d="M105 60 Q125 55 155 45 Q160 55 150 65 Q135 75 105 70"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.5"
        strokeOpacity="0.5"
      />
    </svg>
  )
}

export function LaurelsDecoration({ color = '#f59e0b', size = 180, className }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('', className)}>
      {/* Left laurel */}
      <g fill={color} opacity="0.9">
        <ellipse cx="25" cy="30" rx="8" ry="12" transform="rotate(-30 25 30)" />
        <ellipse cx="20" cy="45" rx="7" ry="10" transform="rotate(-20 20 45)" />
        <ellipse cx="18" cy="60" rx="6" ry="9" transform="rotate(-10 18 60)" />
        <ellipse cx="20" cy="75" rx="5" ry="8" transform="rotate(5 20 75)" />
      </g>
      {/* Right laurel */}
      <g fill={color} opacity="0.9">
        <ellipse cx="75" cy="30" rx="8" ry="12" transform="rotate(30 75 30)" />
        <ellipse cx="80" cy="45" rx="7" ry="10" transform="rotate(20 80 45)" />
        <ellipse cx="82" cy="60" rx="6" ry="9" transform="rotate(10 82 60)" />
        <ellipse cx="80" cy="75" rx="5" ry="8" transform="rotate(-5 80 75)" />
      </g>
    </svg>
  )
}

export function FlamesDecoration({ color = '#f59e0b', secondaryColor, size = 180, className }: SvgProps) {
  const secondary = secondaryColor || color
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('', className)}>
      <defs>
        <linearGradient id="flameDecoGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={secondary} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Left flames */}
      <path
        d="M20 85 Q15 70 25 55 Q20 65 30 50 Q25 60 35 45 Q30 55 25 70 Q20 80 20 85"
        fill="url(#flameDecoGrad)"
        opacity="0.8"
      />
      {/* Right flames */}
      <path
        d="M80 85 Q85 70 75 55 Q80 65 70 50 Q75 60 65 45 Q70 55 75 70 Q80 80 80 85"
        fill="url(#flameDecoGrad)"
        opacity="0.8"
      />
    </svg>
  )
}

export function RibbonDecoration({ color = '#f59e0b', size = 160, className }: SvgProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('', className)}>
      <defs>
        <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {/* Main ribbon */}
      <path
        d="M10 75 Q30 70 50 75 Q70 80 90 75 L95 85 Q70 90 50 85 Q30 80 5 85 Z"
        fill="url(#ribbonGrad)"
      />
      {/* Ribbon ends */}
      <path d="M5 85 L10 100 L20 90 L15 85 Z" fill={color} opacity="0.8" />
      <path d="M95 85 L90 100 L80 90 L85 85 Z" fill={color} opacity="0.8" />
    </svg>
  )
}

export function StarsDecoration({ color = '#f59e0b', size = 180, count = 3, className }: SvgProps & { count?: number }) {
  const starPath = 'M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z'
  const positions = [
    { x: 50, y: 8, scale: 0.8 },
    { x: 25, y: 15, scale: 0.6 },
    { x: 75, y: 15, scale: 0.6 },
    { x: 15, y: 30, scale: 0.5 },
    { x: 85, y: 30, scale: 0.5 },
  ].slice(0, count)

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={cn('', className)}>
      <defs>
        <filter id="starGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {positions.map((pos, i) => (
        <g key={i} transform={`translate(${pos.x}, ${pos.y}) scale(${pos.scale})`}>
          <path d={starPath} fill={color} filter="url(#starGlow)" />
        </g>
      ))}
    </svg>
  )
}

export function CrownDecoration({ color = '#f59e0b', size = 160, className }: SvgProps) {
  return (
    <svg viewBox="0 0 100 50" width={size} height={size * 0.5} className={cn('', className)}>
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d="M10 45 L15 15 L30 30 L50 5 L70 30 L85 15 L90 45 Z"
        fill="url(#crownGrad)"
        stroke={color}
        strokeWidth="1"
      />
      {/* Gems */}
      <circle cx="50" cy="15" r="4" fill="#fff" opacity="0.8" />
      <circle cx="30" cy="28" r="3" fill="#fff" opacity="0.6" />
      <circle cx="70" cy="28" r="3" fill="#fff" opacity="0.6" />
    </svg>
  )
}

// ============================================
// SYMBOLS
// ============================================

export function FlameSymbol({ color = '#f59e0b', secondaryColor, size = 64, className, glow }: SvgProps) {
  const secondary = secondaryColor || '#facc15'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('', className)}>
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={secondary} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        {glow && (
          <filter id="flameGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M12 2C10 6 7 8 7 12C7 15.5 9.5 18 12 18C14.5 18 17 15.5 17 12C17 8 14 6 12 2Z"
        fill="url(#flameGrad)"
        filter={glow ? 'url(#flameGlow)' : undefined}
      />
      <path
        d="M12 8C11 10 10 11 10 13C10 14.5 11 16 12 16C13 16 14 14.5 14 13C14 11 13 10 12 8Z"
        fill={secondary}
        opacity="0.8"
      />
    </svg>
  )
}

export function StarSymbol({ color = '#f59e0b', size = 64, className, glow }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('', className)}>
      <defs>
        {glow && (
          <filter id="starSymGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M12 2L14.5 9H22L16 14L18 22L12 17L6 22L8 14L2 9H9.5L12 2Z"
        fill={color}
        filter={glow ? 'url(#starSymGlow)' : undefined}
      />
      <path d="M12 6L13.5 10.5H18L14.5 13.5L15.5 18L12 15L8.5 18L9.5 13.5L6 10.5H10.5L12 6Z" fill="#fff" opacity="0.3" />
    </svg>
  )
}

export function ShieldSymbol({ color = '#f59e0b', size = 64, className, glow }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('', className)}>
      <defs>
        {glow && (
          <filter id="shieldSymGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M12 2L20 6V12C20 17 16 21 12 22C8 21 4 17 4 12V6L12 2Z"
        fill={color}
        filter={glow ? 'url(#shieldSymGlow)' : undefined}
      />
      <path d="M12 4L18 7V12C18 16 15 19 12 20" fill="#fff" opacity="0.2" />
      <path d="M12 8V16M8 12H16" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

export function WingsSymbol({ color = '#f59e0b', size = 64, className, glow }: SvgProps) {
  return (
    <svg viewBox="0 0 32 24" width={size} height={size * 0.75} className={cn('', className)}>
      <defs>
        {glow && (
          <filter id="wingsSymGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M16 12 Q8 6 2 4 Q4 10 6 14 Q10 18 16 16 Z"
        fill={color}
        filter={glow ? 'url(#wingsSymGlow)' : undefined}
      />
      <path
        d="M16 12 Q24 6 30 4 Q28 10 26 14 Q22 18 16 16 Z"
        fill={color}
        filter={glow ? 'url(#wingsSymGlow)' : undefined}
      />
      <path d="M16 12 Q10 8 5 6 Q7 10 10 13" fill="#fff" opacity="0.3" />
      <path d="M16 12 Q22 8 27 6 Q25 10 22 13" fill="#fff" opacity="0.3" />
    </svg>
  )
}

export function MedalSymbol({ color = '#f59e0b', size = 64, className, glow }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('', className)}>
      <defs>
        <radialGradient id="medalGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </radialGradient>
        {glow && (
          <filter id="medalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      {/* Ribbon */}
      <path d="M9 2L7 10H17L15 2Z" fill={color} opacity="0.7" />
      {/* Medal */}
      <circle
        cx="12"
        cy="15"
        r="7"
        fill={color}
        filter={glow ? 'url(#medalGlow)' : undefined}
      />
      <circle cx="12" cy="15" r="7" fill="url(#medalGrad)" />
      <circle cx="12" cy="15" r="5" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
      <text x="12" y="17" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="bold" opacity="0.9">
        1
      </text>
    </svg>
  )
}

export function BoltSymbol({ color = '#f59e0b', size = 64, className, glow }: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={cn('', className)}>
      <defs>
        {glow && (
          <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        fill={color}
        filter={glow ? 'url(#boltGlow)' : undefined}
      />
      <path d="M13 2L6 12H11L10 18" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
    </svg>
  )
}

// ============================================
// ICON REGISTRY (for selectors)
// ============================================

export const BASE_ICONS = {
  circle: CircleBase,
  shield: ShieldBase,
}

export const DECORATION_ICONS = {
  wings: WingsDecoration,
  laurels: LaurelsDecoration,
  flames: FlamesDecoration,
  ribbon: RibbonDecoration,
  stars: StarsDecoration,
  crown: CrownDecoration,
}

export const SYMBOL_ICONS = {
  flame: FlameSymbol,
  star: StarSymbol,
  shield: ShieldSymbol,
  wings: WingsSymbol,
  medal: MedalSymbol,
  bolt: BoltSymbol,
}
