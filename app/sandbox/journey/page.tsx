'use client'

import { useState, useEffect, useMemo } from 'react'
import { getFactionTheme, getAllFactions } from '@/lib/factions'
import type { FactionId, FactionTheme, JourneyState } from '@/types/journey'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SandboxShell } from '../components/shell/SandboxShellV2'

// =============================================================================
// Lekbanken Assets
// =============================================================================

const LEKBANKEN_AVATARS = [
  { id: 'none', name: 'Inga', src: '' },
  { id: 'deepspace', name: 'Deep Space', src: '/avatars/deepspace.png' },
  { id: 'greenmoss', name: 'Green Moss', src: '/avatars/greenmoss.png' },
  { id: 'greygravel', name: 'Grey Gravel', src: '/avatars/greygravel.png' },
  { id: 'pinksky', name: 'Pink Sky', src: '/avatars/pinksky.png' },
  { id: 'rainbowheaven', name: 'Rainbow', src: '/avatars/rainbowheaven.png' },
  { id: 'redmagma', name: 'Red Magma', src: '/avatars/redmagma.png' },
  { id: 'turqwave', name: 'Turq Wave', src: '/avatars/turqwave.png' },
]

const LEKBANKEN_ICONS = [
  { id: 'dice', name: 'Tärning', src: '/achievements/utmarkelser/lg/ic_dice.png' },
  { id: 'crown', name: 'Krona', src: '/achievements/utmarkelser/lg/ic_crown.png' },
  { id: 'heart', name: 'Hjärta', src: '/achievements/utmarkelser/lg/ic_heart.png' },
  { id: 'star', name: 'Stjärna', src: '/achievements/utmarkelser/lg/ic_singlestar.png' },
  { id: 'flash', name: 'Blixt', src: '/achievements/utmarkelser/lg/ic_flash.png' },
  { id: 'pokal', name: 'Pokal', src: '/achievements/utmarkelser/lg/ic_pokal.png' },
]

// =============================================================================
// Types
// =============================================================================

interface CustomThemeColors {
  accentColor: string
  gradientFrom: string
  gradientTo: string
  glowColor: string
}

interface JourneySettings {
  selectedFaction: FactionId | 'custom'
  customFactionName: string
  customColors: CustomThemeColors
  selectedAvatar: string
  mockLevel: number
  mockXPProgress: number
  mockMilestoneProgress: number
  particleCount: number
  // New settings
  isDarkMode: boolean
  headerStyle: 'gradient' | 'image'
  headerImageUrl: string
}

// =============================================================================
// Color Utilities
// =============================================================================

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 50 }
  
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function lightenColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex)
  // Move lightness towards white
  const newL = hsl.l + (100 - hsl.l) * amount
  // Reduce saturation slightly for a softer look
  const newS = hsl.s * (1 - amount * 0.3)
  return hslToHex(hsl.h, newS, newL)
}

// =============================================================================
// Mock Data
// =============================================================================

function createMockJourney(level: number, xpProgress: number, factionId: FactionId, avatarUrl?: string, milestoneProgress?: number): JourneyState {
  const xpToNextLevel = 500 + (level * 100)
  const currentXP = Math.floor(xpToNextLevel * (xpProgress / 100))
  
  return {
    userId: 'mock-user-1',
    displayName: 'Lekledare Anna',
    avatarUrl,
    faction: factionId,
    level,
    currentXP,
    xpToNextLevel,
    totalXP: 5000 + currentXP,
    totalCoins: 1250,
    badgeCount: 12,
    currentStreak: 7,
    longestStreak: 14,
    nextMilestone: {
      type: 'badge',
      label: 'Stjärnledare',
      description: 'Håll 10 sessioner',
      progress: milestoneProgress ?? 80,
    },
    memberSince: '2025-03-15',
    lastActive: '2026-01-05',
  }
}

// =============================================================================
// Icon Components
// =============================================================================

const CoinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <circle cx="12" cy="12" r="10" opacity="0.3"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
  </svg>
)

const BadgeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
)

const FlameIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
  </svg>
)

const ShopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/>
  </svg>
)

const LogIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
  </svg>
)

// =============================================================================
// Clean Components (No external dependencies)
// =============================================================================

/**
 * CleanParticleField - Lightweight CSS-based particles
 */
function CleanParticleField({ 
  particleCount = 30, 
  accentColor = '#8661ff' 
}: { 
  particleCount?: number
  accentColor?: string 
}) {
  const particles = useMemo(() => 
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: (i * 31) % 100,
      top: (i * 17) % 100,
      size: 2 + (i % 3),
      duration: 15 + (i % 10),
      delay: (i * 0.5) % 10,
      opacity: 0.3 + (i % 5) * 0.1,
    })), [particleCount])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            backgroundColor: accentColor,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${accentColor}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.6; }
          50% { transform: translateY(-15px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-40px) translateX(15px); opacity: 0.5; }
        }
        .animate-float-particle { animation: float-particle linear infinite; }
      `}</style>
    </div>
  )
}

/**
 * CleanAvatar - Avatar with glow effect and level burst
 */
function CleanAvatar({
  displayName,
  avatarUrl,
  level,
  accentColor = '#8661ff',
  isDarkMode = true,
  onAvatarClick,
}: {
  displayName: string
  avatarUrl?: string
  level: number
  accentColor?: string
  isDarkMode?: boolean
  onAvatarClick?: () => void
}) {
  const [showBurst, setShowBurst] = useState(false)

  const handleClick = () => {
    setShowBurst(true)
    setTimeout(() => setShowBurst(false), 800)
    onAvatarClick?.()
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 180, height: 180 }}
      onClick={handleClick}
    >
      {/* Glow effect */}
      <div
        className="absolute rounded-full animate-pulse-glow"
        style={{
          width: 160,
          height: 160,
          backgroundColor: accentColor,
          opacity: 0.3,
          filter: 'blur(30px)',
        }}
      />

      {/* Avatar ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 150,
          height: 150,
          border: `3px solid ${accentColor}`,
          boxShadow: `0 0 20px ${accentColor}50`,
        }}
      />

      {/* Avatar image */}
      <div
        className="relative rounded-full overflow-hidden border-4"
        style={{ width: 130, height: 130, borderColor: borderColor }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            fill
            className="object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-4xl font-bold"
            style={{ 
              backgroundColor: `${accentColor}40`,
              color: isDarkMode ? 'white' : '#1a1a2e',
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Level badge */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white font-bold text-sm"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 0 15px ${accentColor}80`,
        }}
      >
        Level {level}
      </div>

      {/* Level burst effect */}
      {showBurst && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-burst"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
                '--burst-angle': `${i * 30}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        @keyframes burst {
          0% { transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(-80px) scale(0); opacity: 0; }
        }
        .animate-burst { animation: burst 0.8s ease-out forwards; }
      `}</style>
    </div>
  )
}

/**
 * CleanProgressBar - Simple progress bar with shimmer
 */
function CleanProgressBar({
  progress,
  currentXP,
  xpToNextLevel,
  level,
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  progress: number
  currentXP: number
  xpToNextLevel: number
  level: number
  accentColor?: string
  isDarkMode?: boolean
}) {
  const [displayProgress, setDisplayProgress] = useState(0)
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textColorMuted = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'

  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2 text-sm">
        <span style={{ color: textColorMuted }}>Level {level}</span>
        <span style={{ color: textColor }} className="font-medium">{currentXP.toLocaleString('sv-SE')} / {xpToNextLevel.toLocaleString('sv-SE')} XP</span>
        <span style={{ color: textColorMuted }}>Level {level + 1}</span>
      </div>

      <div 
        className="relative h-6 rounded-full overflow-hidden"
        style={{ backgroundColor: `${accentColor}20` }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${displayProgress}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 20px ${accentColor}60`,
          }}
        >
          <div
            className="absolute inset-0 animate-shimmer"
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
          <div 
            className="absolute inset-x-0 top-0 h-1/2"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }}
          />
        </div>

        <div
          className="absolute top-0 bottom-0 w-3 transition-all duration-1000"
          style={{
            left: `calc(${displayProgress}% - 6px)`,
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            opacity: displayProgress > 0 ? 1 : 0,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .animate-shimmer { animation: shimmer 2s linear infinite; }
      `}</style>
    </div>
  )
}

/**
 * CleanStatCard - 3D stat card with glow and click burst
 */
function CleanStatCard({
  icon,
  label,
  value,
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accentColor?: string
  isDarkMode?: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [showBurstEffect, setShowBurstEffect] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textColorMuted = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
  const cardBg = isDarkMode 
    ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8
    const rotateX = -((e.clientY - centerY) / (rect.height / 2)) * 8
    setTilt({ x: rotateX, y: rotateY })
  }

  const handleClick = () => {
    setShowBurstEffect(true)
    setTimeout(() => setShowBurstEffect(false), 600)
  }

  return (
    <div
      className="relative p-4 rounded-2xl cursor-pointer transition-all duration-300"
      style={{
        transform: `perspective(500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.05 : 1})`,
        background: cardBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${isHovered ? accentColor : borderColor}`,
        boxShadow: isHovered
          ? `0 0 30px ${accentColor}40, 0 10px 40px rgba(0,0,0,${isDarkMode ? '0.3' : '0.1'})`
          : `0 4px 20px rgba(0,0,0,${isDarkMode ? '0.2' : '0.08'})`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setTilt({ x: 0, y: 0 }) }}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)`,
            boxShadow: isHovered ? `0 0 20px ${accentColor}60` : 'none',
          }}
        >
          <div className="w-5 h-5" style={{ color: accentColor }}>{icon}</div>
        </div>
        <div className="text-xl font-bold" style={{ color: textColor }}>{value}</div>
        <div className="text-xs uppercase tracking-wider" style={{ color: textColorMuted }}>{label}</div>
      </div>

      {showBurstEffect && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-stat-burst"
              style={{
                backgroundColor: accentColor,
                '--burst-angle': `${i * 45}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes stat-burst {
          0% { transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--burst-angle)) translateY(-40px) scale(0); opacity: 0; }
        }
        .animate-stat-burst { animation: stat-burst 0.6s ease-out forwards; }
      `}</style>
    </div>
  )
}

/**
 * CleanMilestoneBadge - Milestone with pulse and confetti
 */
function CleanMilestoneBadge({
  type,
  label,
  description,
  progress,
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  type: 'level' | 'badge' | 'reward' | 'streak'
  label: string
  description?: string
  progress: number
  accentColor?: string
  isDarkMode?: boolean
}) {
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const textColor = isDarkMode ? 'white' : '#1e293b'
  const textColorMuted = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])

  const isComplete = displayProgress >= 100
  const size = 70
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayProgress / 100) * circumference

  const icons: Record<string, React.ReactNode> = {
    level: <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/>,
    badge: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>,
    reward: <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>,
    streak: <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>,
  }

  return (
    <div 
      className="relative flex items-center gap-4 p-4 rounded-2xl backdrop-blur-sm"
      style={{ 
        backgroundColor: cardBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${accentColor}20`} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={accentColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${accentColor})` }}
          />
          {displayProgress > 0 && displayProgress < 100 && (
            <circle
              cx={size / 2 + radius * Math.cos((displayProgress / 100 * 360 - 90) * Math.PI / 180)}
              cy={size / 2 + radius * Math.sin((displayProgress / 100 * 360 - 90) * Math.PI / 180)}
              r={5} fill={accentColor} className="animate-pulse-dot" style={{ filter: `blur(3px)` }}
            />
          )}
        </svg>

        <div className={cn("absolute inset-0 flex items-center justify-center", isComplete && "animate-bounce-subtle")}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}40 0%, ${accentColor}20 100%)`,
              boxShadow: isComplete ? `0 0 20px ${accentColor}60` : 'none',
            }}
          >
            <svg viewBox="0 0 24 24" fill={accentColor} className="w-5 h-5">
              {icons[type] || icons.badge}
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold truncate" style={{ color: textColor }}>{label}</h4>
          {isComplete && <span className="text-green-400 text-xs">✓</span>}
        </div>
        {description && <p className="text-sm truncate" style={{ color: textColorMuted }}>{description}</p>}
        <div className="text-xs mt-1" style={{ color: accentColor }}>{Math.round(displayProgress)}% klar</div>
      </div>

      <style jsx>{`
        @keyframes pulse-dot { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        .animate-pulse-dot { animation: pulse-dot 1s ease-in-out infinite; }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

/**
 * CleanActionButton - Simple action button
 */
function CleanActionButton({
  icon,
  label,
  accentColor = '#8661ff',
  isDarkMode = true,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  accentColor?: string
  isDarkMode?: boolean
  onClick?: () => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const bgDefault = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const borderDefault = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
  const textDefault = isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)'

  return (
    <button
      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200"
      style={{
        background: isHovered 
          ? `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`
          : bgDefault,
        border: `1px solid ${isHovered ? `${accentColor}40` : borderDefault}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{ background: `linear-gradient(135deg, ${accentColor}30 0%, ${accentColor}15 100%)` }}
      >
        <div className="w-6 h-6" style={{ color: accentColor }}>{icon}</div>
      </div>
      <span 
        className="text-sm font-medium transition-colors duration-200"
        style={{ color: isHovered ? accentColor : textDefault }}
      >
        {label}
      </span>
    </button>
  )
}

// =============================================================================
// Sample Header Images
// =============================================================================

const SAMPLE_HEADER_IMAGES = [
  { id: 'none', name: 'Ingen', src: '' },
  { id: 'forest', name: 'Skog', src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&h=400&fit=crop' },
  { id: 'mountains', name: 'Berg', src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop' },
  { id: 'space', name: 'Rymd', src: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&h=400&fit=crop' },
  { id: 'ocean', name: 'Hav', src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=400&fit=crop' },
  { id: 'abstract', name: 'Abstrakt', src: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&h=400&fit=crop' },
]

// =============================================================================
// Skill Tree Types & Data
// =============================================================================

type SkillNodeStatus = 'locked' | 'available' | 'completed'

interface SkillNode {
  id: string
  label: string
  icon: 'badge' | 'coin' | 'shop' | 'star' | 'crown' | 'flame' | 'heart' | 'gift'
  status: SkillNodeStatus
  description?: string
  // Position in skill tree grid (row, col)
  row: number
  col: number
  // IDs of nodes this connects FROM (prerequisites)
  connectsFrom?: string[]
}

interface _FactionSkillTree {
  factionId: FactionId
  nodes: SkillNode[]
}

// Non-nullable faction type for dictionaries
type NonNullFactionId = Exclude<FactionId, null>

// Dice images per faction
const FACTION_DICE: Record<NonNullFactionId, string> = {
  explorer: '/achievements/utmarkelser/lg/ic_dice.png',
  guardian: '/achievements/utmarkelser/lg/ic_dice.png',
  trickster: '/achievements/utmarkelser/lg/ic_dice.png',
  sage: '/achievements/utmarkelser/lg/ic_dice.png',
}

// Generate mock skill tree for each faction
function generateSkillTree(factionId: FactionId, completedCount: number): SkillNode[] {
  const baseNodes: Omit<SkillNode, 'status'>[] = [
    // Row 0: Root
    { id: 'select', label: 'Välj Tema', icon: 'star', row: 0, col: 2, connectsFrom: [] },
    // Row 1: First tier
    { id: 'badge1', label: 'Första Steget', icon: 'badge', row: 1, col: 1, connectsFrom: ['select'] },
    { id: 'coin1', label: 'Startbonus', icon: 'coin', row: 1, col: 2, connectsFrom: ['select'] },
    { id: 'badge2', label: 'Utforskare', icon: 'badge', row: 1, col: 3, connectsFrom: ['select'] },
    // Row 2: Second tier
    { id: 'shop1', label: 'Butikstillgång', icon: 'shop', row: 2, col: 0, connectsFrom: ['badge1'] },
    { id: 'flame1', label: 'Streak Mästare', icon: 'flame', row: 2, col: 1, connectsFrom: ['badge1', 'coin1'] },
    { id: 'crown1', label: 'Ledare', icon: 'crown', row: 2, col: 2, connectsFrom: ['coin1'] },
    { id: 'heart1', label: 'Hjälpare', icon: 'heart', row: 2, col: 3, connectsFrom: ['coin1', 'badge2'] },
    { id: 'gift1', label: 'Belöning', icon: 'gift', row: 2, col: 4, connectsFrom: ['badge2'] },
    // Row 3: Third tier
    { id: 'badge3', label: 'Mästare', icon: 'badge', row: 3, col: 1, connectsFrom: ['shop1', 'flame1'] },
    { id: 'star1', label: 'Stjärna', icon: 'star', row: 3, col: 2, connectsFrom: ['crown1'] },
    { id: 'coin2', label: 'Skattjakt', icon: 'coin', row: 3, col: 3, connectsFrom: ['heart1', 'gift1'] },
    // Row 4: Final tier
    { id: 'crown2', label: 'Champion', icon: 'crown', row: 4, col: 2, connectsFrom: ['badge3', 'star1', 'coin2'] },
  ]

  // Determine status based on completedCount (simple sequential unlock for demo)
  return baseNodes.map((node, index) => {
    let status: SkillNodeStatus = 'locked'
    if (index < completedCount) {
      status = 'completed'
    } else if (index === completedCount) {
      status = 'available'
    } else {
      // Check if any prerequisite is completed
      const prereqs = node.connectsFrom || []
      const hasCompletedPrereq = prereqs.some((prereqId) => {
        const prereqIndex = baseNodes.findIndex(n => n.id === prereqId)
        return prereqIndex < completedCount
      })
      if (hasCompletedPrereq && index <= completedCount + 3) {
        status = 'available'
      }
    }
    return { ...node, status }
  })
}

// =============================================================================
// Skill Tree Node Icons
// =============================================================================

const SkillNodeIcons: Record<SkillNode['icon'], React.ReactNode> = {
  badge: <BadgeIcon />,
  coin: <CoinIcon />,
  shop: <ShopIcon />,
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
    </svg>
  ),
  flame: <FlameIcon />,
  heart: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
    </svg>
  ),
}

// =============================================================================
// Skill Tree Modal Component
// =============================================================================

function SkillTreeModal({
  isOpen,
  onClose,
  currentFaction,
  onFactionChange,
  completedPerFaction,
  isDarkMode,
}: {
  isOpen: boolean
  onClose: () => void
  currentFaction: FactionId
  onFactionChange: (faction: FactionId) => void
  completedPerFaction: Record<NonNullFactionId, number>
  isDarkMode: boolean
}) {
  const factions = getAllFactions()
  const factionList = Object.values(factions) as { id: FactionId; name: string }[]
  
  const [viewingFaction, setViewingFaction] = useState<FactionId>(currentFaction)
  const viewingIndex = factionList.findIndex(f => f.id === viewingFaction)
  const viewingTheme = getFactionTheme(viewingFaction)
  const skillTree = generateSkillTree(viewingFaction, viewingFaction ? completedPerFaction[viewingFaction] || 0 : 0)

  // Colors
  const bgColor = isDarkMode ? 'rgba(20, 20, 35, 0.98)' : 'rgba(255, 255, 255, 0.98)'
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'

  const navigateFaction = (direction: 'prev' | 'next') => {
    let newIndex = direction === 'prev' ? viewingIndex - 1 : viewingIndex + 1
    if (newIndex < 0) newIndex = factionList.length - 1
    if (newIndex >= factionList.length) newIndex = 0
    setViewingFaction(factionList[newIndex].id)
  }

  const selectCurrentFaction = () => {
    onFactionChange(viewingFaction)
  }

  // Grid dimensions
  const maxRow = Math.max(...skillTree.map(n => n.row))
  const maxCol = Math.max(...skillTree.map(n => n.col))

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-md"
        style={{ backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl"
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          boxShadow: `0 0 60px ${viewingTheme.accentColor}30`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-20"
          style={{ 
            backgroundColor: cardBg, 
            color: textMuted,
            border: `1px solid ${borderColor}`,
          }}
        >
          ✕
        </button>

        {/* Header with dice carousel */}
        <div 
          className="relative pt-8 pb-6 px-6"
          style={{
            background: `linear-gradient(180deg, ${viewingTheme.gradientFrom}40 0%, transparent 100%)`,
          }}
        >
          {/* Dice carousel */}
          <div className="flex items-center justify-center gap-6 mb-4">
            {/* Previous button */}
            <button
              onClick={() => navigateFaction('prev')}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ 
                color: viewingTheme.accentColor,
                backgroundColor: `${viewingTheme.accentColor}20`,
                border: `1px solid ${viewingTheme.accentColor}40`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>

            {/* Dice display */}
            <div 
              className="relative w-28 h-28 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${viewingTheme.accentColor}30 0%, ${viewingTheme.accentColor}10 100%)`,
                border: `2px solid ${viewingTheme.accentColor}60`,
                boxShadow: `0 0 40px ${viewingTheme.accentColor}40`,
              }}
            >
              <Image
                src={viewingFaction ? FACTION_DICE[viewingFaction] : '/achievements/utmarkelser/lg/ic_dice.png'}
                alt={viewingFaction || 'dice'}
                width={80}
                height={80}
                className="object-contain"
              />
              {/* Glow ring */}
              <div 
                className="absolute inset-0 rounded-2xl animate-pulse"
                style={{
                  boxShadow: `inset 0 0 20px ${viewingTheme.accentColor}30`,
                }}
              />
            </div>

            {/* Next button */}
            <button
              onClick={() => navigateFaction('next')}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ 
                color: viewingTheme.accentColor,
                backgroundColor: `${viewingTheme.accentColor}20`,
                border: `1px solid ${viewingTheme.accentColor}40`,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
              </svg>
            </button>
          </div>

          {/* Faction name & select button */}
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2" style={{ color: textColor }}>
              {factionList[viewingIndex]?.name || 'Neutral'}
            </h3>
            <button
              onClick={selectCurrentFaction}
              className="px-5 py-2 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: viewingFaction === currentFaction 
                  ? `${viewingTheme.accentColor}30` 
                  : viewingTheme.accentColor,
                color: viewingFaction === currentFaction ? viewingTheme.accentColor : 'white',
                border: `1px solid ${viewingTheme.accentColor}`,
              }}
            >
              {viewingFaction === currentFaction ? '✓ Aktivt Tema' : 'Välj Detta Tema'}
            </button>
            <p className="text-xs mt-2" style={{ color: textMuted }}>
              {viewingFaction ? completedPerFaction[viewingFaction] || 0 : 0} / {skillTree.length} upplåsta
            </p>
          </div>
        </div>

        {/* Skill Tree Grid */}
        <div className="px-6 pb-8 flex justify-center">
          <div 
            className="relative p-6 rounded-2xl"
            style={{ 
              backgroundColor: cardBg, 
              border: `1px solid ${borderColor}`,
              // Fixed width based on grid: 5 cols * 70px + 4 gaps * 12px + 2 * padding 24px
              width: `${(maxCol + 1) * 70 + maxCol * 12 + 48}px`,
            }}
          >
            {/* Node Grid */}
            <div 
              className="relative grid"
              style={{ 
                gridTemplateColumns: `repeat(${maxCol + 1}, 70px)`,
                gap: '40px 12px',
                zIndex: 10,
              }}
            >
              {Array.from({ length: maxRow + 1 }).map((_, rowIndex) => (
                <div key={rowIndex} className="contents">
                  {Array.from({ length: maxCol + 1 }).map((_, colIndex) => {
                    const node = skillTree.find(n => n.row === rowIndex && n.col === colIndex)
                    
                    if (!node) {
                      return <div key={`empty-${rowIndex}-${colIndex}`} className="w-[70px] h-[70px]" />
                    }

                    const isCompleted = node.status === 'completed'
                    const isAvailable = node.status === 'available'
                    const isLocked = node.status === 'locked'

                    return (
                      <div
                        key={node.id}
                        className={cn(
                          "relative w-[70px] h-[70px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                          isAvailable && "cursor-pointer hover:scale-105",
                          isLocked && "opacity-40"
                        )}
                        style={{
                          backgroundColor: isCompleted 
                            ? `${viewingTheme.accentColor}30` 
                            : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                          border: `1px solid ${isCompleted ? viewingTheme.accentColor : borderColor}`,
                          boxShadow: isCompleted ? `0 0 15px ${viewingTheme.accentColor}30` : 'none',
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ 
                            color: isCompleted ? viewingTheme.accentColor : (isLocked ? textMuted : textColor),
                            backgroundColor: isCompleted ? `${viewingTheme.accentColor}20` : 'transparent',
                          }}
                        >
                          {isLocked ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                          ) : (
                            SkillNodeIcons[node.icon]
                          )}
                        </div>
                        <span 
                          className="text-[10px] font-medium text-center leading-tight px-1"
                          style={{ color: isLocked ? textMuted : textColor }}
                        >
                          {node.label}
                        </span>
                        {isCompleted && (
                          <div 
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                            style={{ 
                              backgroundColor: viewingTheme.accentColor,
                              color: 'white',
                            }}
                          >
                            ✓
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Color Input Component
// =============================================================================

function ColorInput({ 
  label, 
  value, 
  onChange 
}: { 
  label: string
  value: string
  onChange: (value: string) => void 
}) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-7 rounded cursor-pointer border-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 rounded-md text-xs font-mono bg-background border border-border"
        />
      </div>
    </div>
  )
}

// =============================================================================
// Settings Panel Component
// =============================================================================

function JourneySettingsPanel({
  settings,
  onChange,
}: {
  settings: JourneySettings
  onChange: (updates: Partial<JourneySettings>) => void
}) {
  const factions = getAllFactions()

  const updateCustomColor = (key: keyof CustomThemeColors, value: string) => {
    onChange({ 
      customColors: { 
        ...settings.customColors, 
        [key]: value 
      } 
    })
  }

  return (
    <div className="space-y-5">
      {/* Dark/Light Mode Toggle */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          🌓 Läge
        </h4>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => onChange({ isDarkMode: true })}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              settings.isDarkMode 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => onChange({ isDarkMode: false })}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              !settings.isDarkMode 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            ☀️ Light
          </button>
        </div>
      </div>

      {/* Header Style */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          🖼️ Header-stil
        </h4>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
          <button
            onClick={() => onChange({ headerStyle: 'gradient' })}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              settings.headerStyle === 'gradient' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Gradient
          </button>
          <button
            onClick={() => onChange({ headerStyle: 'image' })}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              settings.headerStyle === 'image' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Bild (v2)
          </button>
        </div>

        {/* Header Image Selection */}
        {settings.headerStyle === 'image' && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-muted-foreground">Välj bild</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SAMPLE_HEADER_IMAGES.map(img => (
                <button
                  key={img.id}
                  onClick={() => onChange({ headerImageUrl: img.src })}
                  className={cn(
                    "relative h-12 rounded-md overflow-hidden border-2 transition-all",
                    settings.headerImageUrl === img.src 
                      ? "border-primary ring-1 ring-primary/50" 
                      : "border-border hover:border-muted-foreground"
                  )}
                  title={img.name}
                >
                  {img.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      Ingen
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Eller ange URL</label>
              <input
                type="text"
                value={settings.headerImageUrl}
                onChange={(e) => onChange({ headerImageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-2 py-1.5 rounded-md text-xs bg-background border border-border"
              />
            </div>
          </div>
        )}
      </div>

      {/* Faction Selection */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          🎨 Faction / Tema
        </h4>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onChange({ selectedFaction: null as unknown as FactionId })}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                settings.selectedFaction === null 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Neutral
            </button>
            {factions.map(f => (
              <button
                key={f.id}
                onClick={() => onChange({ selectedFaction: f.id })}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: settings.selectedFaction === f.id ? f.accentColor : `${f.accentColor}30`,
                  color: settings.selectedFaction === f.id ? 'white' : f.accentColor,
                }}
              >
                {f.name}
              </button>
            ))}
            <button
              onClick={() => onChange({ selectedFaction: 'custom' })}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all border border-dashed",
                settings.selectedFaction === 'custom' 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
              )}
            >
              + Custom
            </button>
          </div>

          {/* Custom faction settings - expanded */}
          {settings.selectedFaction === 'custom' && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Namn</label>
                <input
                  type="text"
                  value={settings.customFactionName}
                  onChange={(e) => onChange({ customFactionName: e.target.value })}
                  placeholder="Min faction"
                  className="w-full px-2 py-1.5 rounded-md text-sm bg-background border border-border"
                />
              </div>
              
              <ColorInput 
                label="Accentfärg (knappar, XP-bar)" 
                value={settings.customColors.accentColor}
                onChange={(v) => updateCustomColor('accentColor', v)}
              />
              
              <ColorInput 
                label="Gradient Start (topp)" 
                value={settings.customColors.gradientFrom}
                onChange={(v) => updateCustomColor('gradientFrom', v)}
              />
              
              <ColorInput 
                label="Gradient Slut (botten)" 
                value={settings.customColors.gradientTo}
                onChange={(v) => updateCustomColor('gradientTo', v)}
              />
              
              <ColorInput 
                label="Glow / Skugga" 
                value={settings.customColors.glowColor}
                onChange={(v) => updateCustomColor('glowColor', v)}
              />

              {/* Preview swatch */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Förhandsgranskning</label>
                <div 
                  className="h-12 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${settings.customColors.gradientFrom} 0%, ${settings.customColors.gradientTo} 100%)`,
                    boxShadow: `0 4px 20px ${settings.customColors.glowColor}`,
                  }}
                >
                  <div 
                    className="px-3 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: settings.customColors.accentColor }}
                  >
                    {settings.customFactionName || 'Custom'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Level */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          ⭐ Level: {settings.mockLevel}
        </h4>
        <input
          type="range" min="1" max="50"
          value={settings.mockLevel}
          onChange={(e) => onChange({ mockLevel: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* XP Progress */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          📊 XP Progress: {settings.mockXPProgress}%
        </h4>
        <input
          type="range" min="0" max="100"
          value={settings.mockXPProgress}
          onChange={(e) => onChange({ mockXPProgress: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Milestone Progress */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          🏆 Milestone: {settings.mockMilestoneProgress}%
        </h4>
        <input
          type="range" min="0" max="100"
          value={settings.mockMilestoneProgress}
          onChange={(e) => onChange({ mockMilestoneProgress: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Particles */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          ✨ Partiklar: {settings.particleCount}
        </h4>
        <input
          type="range" min="0" max="60"
          value={settings.particleCount}
          onChange={(e) => onChange({ particleCount: parseInt(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>

      {/* Avatar Selection */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          🖼️ Avatar
        </h4>
        <div className="flex gap-1.5 flex-wrap">
          {LEKBANKEN_AVATARS.map(avatar => (
            <button
              key={avatar.id}
              onClick={() => onChange({ selectedAvatar: avatar.src })}
              className={cn(
                "relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all",
                settings.selectedAvatar === avatar.src 
                  ? "border-primary ring-2 ring-primary/50" 
                  : "border-border hover:border-muted-foreground"
              )}
              title={avatar.name}
            >
              {avatar.src ? (
                <Image src={avatar.src} alt={avatar.name} fill className="object-cover" />
              ) : (
                <span className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground text-sm">👤</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap mt-2">
          {LEKBANKEN_ICONS.map(icon => (
            <button
              key={icon.id}
              onClick={() => onChange({ selectedAvatar: icon.src })}
              className={cn(
                "relative w-9 h-9 rounded-lg overflow-hidden border-2 transition-all bg-muted p-1",
                settings.selectedAvatar === icon.src 
                  ? "border-primary ring-2 ring-primary/50" 
                  : "border-border hover:border-muted-foreground"
              )}
              title={icon.name}
            >
              <Image src={icon.src} alt={icon.name} fill className="object-contain p-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function JourneySandboxPage() {
  const [settings, setSettings] = useState<JourneySettings>({
    selectedFaction: null as unknown as FactionId,
    customFactionName: 'Custom',
    customColors: {
      accentColor: '#8661ff',
      gradientFrom: '#1a1040',
      gradientTo: '#0d0820',
      glowColor: '#8661ff40',
    },
    selectedAvatar: '/avatars/deepspace.png',
    mockLevel: 12,
    mockXPProgress: 65,
    mockMilestoneProgress: 80,
    particleCount: 30,
    isDarkMode: true,
    headerStyle: 'gradient',
    headerImageUrl: '',
  })

  // Skill Tree state
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false)
  const [completedPerFaction, _setCompletedPerFaction] = useState<Record<NonNullFactionId, number>>({
    explorer: 1,
    guardian: 0,
    trickster: 5,
    sage: 2,
  })

  // Derive theme - use custom or faction theme
  const baseTheme: FactionTheme = settings.selectedFaction === 'custom'
    ? {
        id: null,
        name: settings.customFactionName || 'Custom',
        description: 'Custom faction theme',
        accentColor: settings.customColors.accentColor,
        accentColorMuted: `${settings.customColors.accentColor}30`,
        gradientFrom: settings.customColors.gradientFrom,
        gradientTo: settings.customColors.gradientTo,
        glowColor: settings.customColors.glowColor,
        iconVariant: 'rounded',
      }
    : getFactionTheme(settings.selectedFaction as FactionId | null)

  // Apply light mode transformations
  const theme = settings.isDarkMode ? baseTheme : {
    ...baseTheme,
    gradientFrom: lightenColor(baseTheme.gradientFrom, 0.7),
    gradientTo: lightenColor(baseTheme.gradientTo, 0.6),
    glowColor: `${baseTheme.accentColor}20`,
  }

  // Text color based on mode
  const textColor = settings.isDarkMode ? 'white' : '#1a1a2e'

  const journey = createMockJourney(
    settings.mockLevel, 
    settings.mockXPProgress, 
    settings.selectedFaction === 'custom' ? null : settings.selectedFaction as FactionId, 
    settings.selectedAvatar || undefined,
    settings.mockMilestoneProgress
  )

  const handleSettingsChange = (updates: Partial<JourneySettings>) => {
    setSettings(s => ({ ...s, ...updates }))
  }

  return (
    <SandboxShell
      moduleId="journey"
      title="Journey / Resan"
      description="Progression overview med faction-theming (CSS-baserad, inga externa deps)"
      contentWidth="full"
      contextContent={
        <JourneySettingsPanel 
          settings={settings} 
          onChange={handleSettingsChange} 
        />
      }
      contextTitle="⚙️ Journey Inställningar"
    >
      {/* Preview Area */}
      <div className="relative min-h-[700px] rounded-2xl overflow-hidden">
        {/* Background Layer - always the base gradient */}
        <div 
          className="absolute inset-0 transition-colors duration-1000"
          style={{
            background: `linear-gradient(180deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`,
          }}
        />

        {/* Particle field */}
        {settings.particleCount > 0 && (
          <CleanParticleField
            particleCount={settings.particleCount}
            accentColor={theme.accentColor}
          />
        )}

        {/* Content */}
        <div className="relative z-10 max-w-lg mx-auto pt-12 px-4 pb-16">
          
          {/* ========== HEADER GLASS CONTAINER ========== */}
          <div 
            className="relative rounded-2xl overflow-hidden mb-10"
            style={{
              background: settings.headerStyle === 'image' && settings.headerImageUrl 
                ? 'transparent' 
                : (settings.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${settings.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: `0 0 30px ${theme.glowColor}40, inset 0 1px 0 ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)'}`,
            }}
          >
            {/* Optional header image background */}
            {settings.headerStyle === 'image' && settings.headerImageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={settings.headerImageUrl} 
                  alt="Header background" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlay for readability */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: settings.isDarkMode
                      ? 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%)'
                      : 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.7) 100%)',
                  }}
                />
                {/* Radial vignette for center focus */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: settings.isDarkMode
                      ? 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(0,0,0,0.6) 0%, transparent 70%)'
                      : 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.6) 0%, transparent 70%)',
                  }}
                />
              </>
            )}

            {/* Header content */}
            <div className="relative z-10 py-10 px-6">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <CleanAvatar
                  displayName={journey.displayName}
                  avatarUrl={journey.avatarUrl}
                  level={journey.level}
                  accentColor={theme.accentColor}
                  isDarkMode={settings.isDarkMode}
                  onAvatarClick={() => setIsSkillTreeOpen(true)}
                />
              </div>

              {/* Name */}
              <h2 
                className="text-center text-2xl font-bold"
                style={{ color: textColor }}
              >
                {journey.displayName}
              </h2>
            </div>
          </div>
          {/* ========== END HEADER GLASS CONTAINER ========== */}

          {/* Progress Bar */}
          <div className="mb-10">
            <CleanProgressBar
              progress={settings.mockXPProgress}
              currentXP={journey.currentXP}
              xpToNextLevel={journey.xpToNextLevel}
              level={journey.level}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <CleanStatCard
              icon={<CoinIcon />}
              label="DiceCoin"
              value={journey.totalCoins.toLocaleString('sv-SE')}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanStatCard
              icon={<BadgeIcon />}
              label="Utmärkelser"
              value={journey.badgeCount}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanStatCard
              icon={<FlameIcon />}
              label="Streak"
              value={`${journey.currentStreak}d`}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
          </div>

          {/* Milestone Badge */}
          {journey.nextMilestone && (
            <div className="mb-10">
              <CleanMilestoneBadge
                type={journey.nextMilestone.type}
                label={journey.nextMilestone.label}
                description={journey.nextMilestone.description}
                progress={settings.mockMilestoneProgress}
                accentColor={theme.accentColor}
                isDarkMode={settings.isDarkMode}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <CleanActionButton
              icon={<BadgeIcon />}
              label="Utmärkelser"
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanActionButton
              icon={<CoinIcon />}
              label="DiceCoin"
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanActionButton
              icon={<ShopIcon />}
              label="Butik"
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanActionButton
              icon={<LogIcon />}
              label="Logg"
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          ✅ Ren CSS & React — inga externa bibliotek • Gradient bakgrund, CSS-partiklar, 
          glow på avatar, shimmer på progress, 3D-effekt på stats, puls på milestone
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Klicka på avataren för att öppna Skill Tree
        </p>
      </div>

      {/* Skill Tree Modal */}
      <SkillTreeModal
        isOpen={isSkillTreeOpen}
        onClose={() => setIsSkillTreeOpen(false)}
        currentFaction={(settings.selectedFaction as FactionId) || 'explorer'}
        onFactionChange={(faction) => {
          handleSettingsChange({ selectedFaction: faction })
          setIsSkillTreeOpen(false)
        }}
        completedPerFaction={completedPerFaction}
        isDarkMode={settings.isDarkMode}
      />
    </SandboxShell>
  )
}
