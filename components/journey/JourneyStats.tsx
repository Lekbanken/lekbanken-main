'use client'

import type { JourneyStatsProps } from '@/types/journey'
import { cn } from '@/lib/utils'

/**
 * JourneyStats
 * 
 * Compact stat pills showing coins, badges, and streak.
 * Designed to be scannable at a glance.
 */
export function JourneyStats({ 
  coins, 
  badges, 
  streak,
  theme,
}: JourneyStatsProps) {
  const stats = [
    {
      id: 'coins',
      label: 'DiceCoin',
      value: coins,
      icon: CoinIcon,
      format: (v: number) => v.toLocaleString('sv-SE'),
    },
    {
      id: 'badges',
      label: 'Utmärkelser',
      value: badges,
      icon: BadgeIcon,
      format: (v: number) => v.toString(),
    },
    {
      id: 'streak',
      label: 'Streak',
      value: streak,
      icon: FlameIcon,
      format: (v: number) => `${v}d`,
    },
  ]

  return (
    <div className="flex justify-center gap-3">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full',
            'bg-white/10 backdrop-blur-sm',
            'transition-colors hover:bg-white/15'
          )}
        >
          <stat.icon 
            className="w-4 h-4" 
            style={{ color: theme.accentColor }}
          />
          <span className="text-white font-medium text-sm">
            {stat.format(stat.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Stat icons
function CoinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" opacity="0.3"/>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
    </svg>
  )
}

function BadgeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  )
}

function FlameIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
    </svg>
  )
}

export default JourneyStats
