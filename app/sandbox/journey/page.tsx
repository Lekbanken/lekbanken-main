'use client'

import { useState, useEffect, useMemo } from 'react'
import { getFactionTheme, getAllFactions } from '@/lib/factions'
import type { FactionId, FactionTheme, JourneyState } from '@/types/journey'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { BadgePreviewEnhanced } from '@/features/admin/achievements/editor/components/BadgePreviewEnhanced'
import { mockAchievements, themes } from '@/features/admin/achievements/data'
import type { AchievementIconConfig, AchievementAssetType } from '@/features/admin/achievements/types'

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

// ── Cosmetic Design Config ──
type HeaderFrameStyle = 'none' | 'minimal' | 'ornate' | 'mythic' | 'neon' | 'constellation' | 'coral' | 'vines' | 'aurora'
type AvatarFrameStyle = 'default' | 'metallic' | 'faction' | 'animated'
type AvatarEffectStyle = 'none' | 'glow' | 'pulse' | 'aura' | 'orbit' | 'ripple' | 'spores' | 'halo'
type LevelBadgeStyle = 'flat' | 'shield' | 'crest' | 'orb'
type XPBarSkin = 'clean' | 'shimmer' | 'energy' | 'segmented' | 'warp' | 'current' | 'growth' | 'rainbow'
type BackgroundEffectType = 'none' | 'particles' | 'gradients' | 'noise' | 'rays' | 'stars' | 'meteors' | 'bubbles' | 'waves' | 'leaves' | 'fireflies' | 'clouds'
type SectionDividerStyle = 'line' | 'glow' | 'ornament' | 'fade' | 'nebula' | 'tide' | 'roots' | 'breeze'
type ColorMode = 'accent' | 'duo' | 'rainbow' | 'fire' | 'ice' | 'toxic' | 'sunset' | 'galaxy'

interface JourneyDesignConfig {
  headerFrame: HeaderFrameStyle
  avatarFrame: AvatarFrameStyle
  avatarEffect: AvatarEffectStyle
  levelBadge: LevelBadgeStyle
  xpBarSkin: XPBarSkin
  backgroundEffect: BackgroundEffectType
  sectionDivider: SectionDividerStyle
  colorMode: ColorMode
}

const DEFAULT_DESIGN_CONFIG: JourneyDesignConfig = {
  headerFrame: 'none',
  avatarFrame: 'default',
  avatarEffect: 'glow',
  levelBadge: 'flat',
  xpBarSkin: 'shimmer',
  backgroundEffect: 'particles',
  sectionDivider: 'line',
  colorMode: 'accent',
}

// ── Color Palette Generation ──
// Each mode returns an array of colors used across all cosmetic components
const COLOR_PALETTES: Record<ColorMode, (accent: string) => string[]> = {
  accent: (a) => [a, a, a, a],
  duo: (a) => {
    const hsl = hexToHSL(a)
    const comp = hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)
    return [a, comp, a, comp]
  },
  rainbow: () => ['#ff3366', '#ff9933', '#ffdd33', '#33ff99', '#3399ff', '#9933ff', '#ff3366'],
  fire: () => ['#ff2200', '#ff6600', '#ffaa00', '#ffdd44', '#ff6600'],
  ice: () => ['#00ccff', '#0088ff', '#66ddff', '#aaeeff', '#0066cc', '#00ccff'],
  toxic: () => ['#39ff14', '#00ff88', '#88ff00', '#ccff00', '#00ff44', '#39ff14'],
  sunset: () => ['#ff6b6b', '#ee5a24', '#f0932b', '#ffbe76', '#ff7979', '#e056fd'],
  galaxy: () => ['#9b59b6', '#3498db', '#e056fd', '#48dbfb', '#a29bfe', '#fd79a8', '#9b59b6'],
}

function getColorPalette(mode: ColorMode, accent: string): string[] {
  return COLOR_PALETTES[mode](accent)
}

// Build a CSS gradient string from palette colors
function paletteGradient(mode: ColorMode, accent: string, angle = 90): string {
  if (mode === 'accent') return accent
  const colors = getColorPalette(mode, accent)
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`
}

// Build a CSS conic-gradient from palette
function paletteConicGradient(mode: ColorMode, accent: string, from = 0): string {
  if (mode === 'accent') return `conic-gradient(from ${from}deg, ${accent}30, ${accent}, ${accent}30)`
  const colors = getColorPalette(mode, accent)
  const stops = colors.map((c, i) => `${c}${i === 0 || i === colors.length - 1 ? '' : ''}  ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ')
  return `conic-gradient(from ${from}deg, ${stops})`
}

// Animated gradient background-size trick — flowing diagonal color shift
function paletteAnimatedBg(mode: ColorMode, accent: string, angle = 124): Record<string, string> {
  if (mode === 'accent') return { backgroundColor: accent }
  const colors = getColorPalette(mode, accent)
  // Double the colors for seamless looping
  const doubled = [...colors, ...colors.slice(0, Math.min(3, colors.length))]
  return {
    backgroundImage: `linear-gradient(${angle}deg, ${doubled.join(', ')})`,
    backgroundSize: '1800% 1800%',
    animation: 'color-shift-flow 12s ease infinite',
  }
}

// Flowing border glow — returns style props for a container that shifts colors
// Use on box-shadow and border via CSS custom properties
function paletteFlowingStyle(mode: ColorMode, accent: string, angle = 124): Record<string, string> {
  if (mode === 'accent') return {}
  const colors = getColorPalette(mode, accent)
  const doubled = [...colors, ...colors.slice(0, Math.min(3, colors.length))]
  return {
    backgroundImage: `linear-gradient(${angle}deg, ${doubled.join(', ')})`,
    backgroundSize: '1800% 1800%',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    animation: 'color-shift-flow 12s ease infinite',
  }
}

// Cosmetic metadata for unlock/monetization annotations
const COSMETIC_META: Record<string, { rarity: string; unlock: string; exclusive?: boolean }> = {
  // Header frames
  'headerFrame:none': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'headerFrame:minimal': { rarity: 'common', unlock: 'Level 3' },
  'headerFrame:ornate': { rarity: 'rare', unlock: 'Level 10' },
  'headerFrame:mythic': { rarity: 'epic', unlock: 'Level 25 eller 500 DiceCoin' },
  'headerFrame:neon': { rarity: 'epic', unlock: '750 DiceCoin', exclusive: true },
  'headerFrame:constellation': { rarity: 'epic', unlock: 'Void-tema Level 15', exclusive: true },
  'headerFrame:coral': { rarity: 'epic', unlock: 'Sea-tema Level 15', exclusive: true },
  'headerFrame:vines': { rarity: 'epic', unlock: 'Forest-tema Level 15', exclusive: true },
  'headerFrame:aurora': { rarity: 'epic', unlock: 'Sky-tema Level 15', exclusive: true },
  // Avatar frames
  'avatarFrame:default': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'avatarFrame:metallic': { rarity: 'rare', unlock: 'Level 8 eller 200 DiceCoin' },
  'avatarFrame:faction': { rarity: 'rare', unlock: 'Välj faction' },
  'avatarFrame:animated': { rarity: 'epic', unlock: 'Level 20 eller 600 DiceCoin' },
  // Avatar effects
  'avatarEffect:none': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'avatarEffect:glow': { rarity: 'common', unlock: 'Level 2' },
  'avatarEffect:pulse': { rarity: 'rare', unlock: 'Level 12' },
  'avatarEffect:aura': { rarity: 'epic', unlock: '400 DiceCoin', exclusive: true },
  'avatarEffect:orbit': { rarity: 'epic', unlock: 'Void-tema Level 8', exclusive: true },
  'avatarEffect:ripple': { rarity: 'epic', unlock: 'Sea-tema Level 8', exclusive: true },
  'avatarEffect:spores': { rarity: 'epic', unlock: 'Forest-tema Level 8', exclusive: true },
  'avatarEffect:halo': { rarity: 'epic', unlock: 'Sky-tema Level 8', exclusive: true },
  // Level badges
  'levelBadge:flat': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'levelBadge:shield': { rarity: 'rare', unlock: 'Level 5' },
  'levelBadge:crest': { rarity: 'epic', unlock: 'Level 15 eller 300 DiceCoin' },
  'levelBadge:orb': { rarity: 'prestige', unlock: 'Level 30', exclusive: true },
  // XP bar skins
  'xpBarSkin:clean': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'xpBarSkin:shimmer': { rarity: 'common', unlock: 'Level 2' },
  'xpBarSkin:energy': { rarity: 'rare', unlock: 'Level 10 eller 150 DiceCoin' },
  'xpBarSkin:segmented': { rarity: 'epic', unlock: '500 DiceCoin' },
  'xpBarSkin:warp': { rarity: 'epic', unlock: 'Void-tema Level 12', exclusive: true },
  'xpBarSkin:current': { rarity: 'epic', unlock: 'Sea-tema Level 12', exclusive: true },
  'xpBarSkin:growth': { rarity: 'epic', unlock: 'Forest-tema Level 12', exclusive: true },
  'xpBarSkin:rainbow': { rarity: 'epic', unlock: 'Sky-tema Level 12', exclusive: true },
  // Background effects
  'backgroundEffect:none': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'backgroundEffect:particles': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'backgroundEffect:gradients': { rarity: 'rare', unlock: 'Level 7' },
  'backgroundEffect:noise': { rarity: 'rare', unlock: 'Level 12' },
  'backgroundEffect:rays': { rarity: 'epic', unlock: 'Level 20 eller 400 DiceCoin' },
  'backgroundEffect:stars': { rarity: 'rare', unlock: 'Void-tema Level 5', exclusive: true },
  'backgroundEffect:meteors': { rarity: 'epic', unlock: 'Void-tema Level 18', exclusive: true },
  'backgroundEffect:bubbles': { rarity: 'rare', unlock: 'Sea-tema Level 5', exclusive: true },
  'backgroundEffect:waves': { rarity: 'epic', unlock: 'Sea-tema Level 18', exclusive: true },
  'backgroundEffect:leaves': { rarity: 'rare', unlock: 'Forest-tema Level 5', exclusive: true },
  'backgroundEffect:fireflies': { rarity: 'epic', unlock: 'Forest-tema Level 18', exclusive: true },
  'backgroundEffect:clouds': { rarity: 'rare', unlock: 'Sky-tema Level 5', exclusive: true },
  // Section dividers
  'sectionDivider:line': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'sectionDivider:glow': { rarity: 'common', unlock: 'Level 3' },
  'sectionDivider:ornament': { rarity: 'rare', unlock: 'Level 10' },
  'sectionDivider:fade': { rarity: 'common', unlock: 'Level 5' },
  'sectionDivider:nebula': { rarity: 'epic', unlock: 'Void-tema Level 10', exclusive: true },
  'sectionDivider:tide': { rarity: 'epic', unlock: 'Sea-tema Level 10', exclusive: true },
  'sectionDivider:roots': { rarity: 'epic', unlock: 'Forest-tema Level 10', exclusive: true },
  'sectionDivider:breeze': { rarity: 'epic', unlock: 'Sky-tema Level 10', exclusive: true },
  // Color modes
  'colorMode:accent': { rarity: 'common', unlock: 'Alltid tillgänglig' },
  'colorMode:duo': { rarity: 'rare', unlock: 'Level 8' },
  'colorMode:rainbow': { rarity: 'epic', unlock: 'Level 20 eller 500 DiceCoin', exclusive: true },
  'colorMode:fire': { rarity: 'rare', unlock: 'Level 12' },
  'colorMode:ice': { rarity: 'rare', unlock: 'Level 12' },
  'colorMode:toxic': { rarity: 'rare', unlock: 'Level 15' },
  'colorMode:sunset': { rarity: 'epic', unlock: 'Level 25' },
  'colorMode:galaxy': { rarity: 'prestige', unlock: 'Level 30', exclusive: true },
}

const RARITY_BADGE_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  prestige: '#f59e0b',
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
  // Display settings
  isDarkMode: boolean
  headerStyle: 'gradient' | 'image'
  headerImageUrl: string
  // Cosmetic design
  design: JourneyDesignConfig
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
  accentColor = '#8661ff',
  isDarkMode = true,
  colorMode = 'accent' as ColorMode,
}: { 
  particleCount?: number
  accentColor?: string
  isDarkMode?: boolean
  colorMode?: ColorMode 
}) {
  const palette = getColorPalette(colorMode, accentColor)
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
      {particles.map(p => {
        const pColor = palette[p.id % palette.length]
        return (
          <div
            key={p.id}
            className="absolute rounded-full animate-float-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              backgroundColor: isDarkMode ? pColor : `${pColor}90`,
              opacity: isDarkMode ? p.opacity : p.opacity * 0.5,
              boxShadow: isDarkMode ? `0 0 ${p.size * 2}px ${pColor}` : `0 0 ${p.size}px ${pColor}40`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        )
      })}
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
 * CleanAvatar — Escalating visual tiers for avatar presentation
 * 
 * Frame tiers:   default (simple ring) → metallic (chrome reflections) → faction (double-ring energy) → animated (orbiting particles + rotating arcs)
 * Effect tiers:  none → glow (soft halo) → pulse (sonar rings) → aura (aurora vortex with sparkles)
 * Badge tiers:   flat (pill) → shield (heraldic SVG) → crest (winged golden plate) → orb (levitating glass sphere)
 */
function CleanAvatar({
  displayName,
  avatarUrl,
  level,
  accentColor = '#8661ff',
  isDarkMode = true,
  onAvatarClick,
  avatarFrame = 'default',
  avatarEffect = 'glow',
  levelBadge = 'flat',
  colorMode = 'accent' as ColorMode,
}: {
  displayName: string
  avatarUrl?: string
  level: number
  accentColor?: string
  isDarkMode?: boolean
  onAvatarClick?: () => void
  avatarFrame?: AvatarFrameStyle
  avatarEffect?: AvatarEffectStyle
  levelBadge?: LevelBadgeStyle
  colorMode?: ColorMode
}) {
  const [showBurst, setShowBurst] = useState(false)
  const palette = getColorPalette(colorMode, accentColor)

  const handleClick = () => {
    setShowBurst(true)
    setTimeout(() => setShowBurst(false), 800)
    onAvatarClick?.()
  }

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'

  // ── Render Frame ──
  const renderFrame = () => {
    switch (avatarFrame) {
      case 'metallic':
        return (
          <>
            {/* Chrome ring - triple layer for depth */}
            <div className="absolute rounded-full"
              style={{
                width: 154, height: 154,
                ...(colorMode === 'accent'
                  ? { backgroundImage: `conic-gradient(from 0deg, #888 0%, #fff 10%, #999 20%, #ddd 30%, #777 40%, #eee 55%, #888 65%, #fff 80%, #999 90%, #888 100%)` }
                  : paletteAnimatedBg(colorMode, accentColor, 124)),
                boxShadow: colorMode === 'accent'
                  ? '0 0 20px rgba(200,200,200,0.3), inset 0 0 4px rgba(255,255,255,0.5)'
                  : `0 0 15px ${palette[0]}25, 0 0 30px ${palette[1]}10`,
                animation: colorMode === 'accent' ? 'av-chrome-spin 8s linear infinite' : 'color-shift-flow 12s ease infinite',
              }} />
            {/* Inner cutout mask */}
            <div className="absolute rounded-full"
              style={{
                width: 146, height: 146,
                backgroundColor: isDarkMode ? '#0d0820' : '#f5f5f5',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              }} />
            {/* Specular highlight sweep */}
            <div className="absolute rounded-full overflow-hidden" style={{ width: 154, height: 154 }}>
              <div className="absolute"
                style={{
                  width: '30%', height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'av-specular-sweep 3s ease-in-out infinite',
                  left: '-30%',
                }} />
            </div>
          </>
        )
      case 'faction':
        return (
          <>
            {/* Outer energy ring */}
            <div className="absolute rounded-full"
              style={{
                width: 164, height: 164,
                border: `2px solid ${accentColor}30`,
                boxShadow: `0 0 15px ${accentColor}20`,
                animation: 'av-faction-outer 3s ease-in-out infinite',
              }} />
            {/* Inner bright ring */}
            <div className="absolute rounded-full"
              style={{
                width: 152, height: 152,
                border: `3px solid ${palette[0]}90`,
                boxShadow: `0 0 15px ${palette[0]}30, inset 0 0 12px ${palette[0]}0a`,
              }} />
            {/* Flowing color overlay on inner ring */}
            {colorMode !== 'accent' && (
              <div className="absolute rounded-full overflow-hidden" style={{ width: 152, height: 152 }}>
                <div className="absolute inset-0 rounded-full"
                  style={{
                    ...paletteAnimatedBg(colorMode, accentColor, 124),
                    opacity: 0.25,
                    mixBlendMode: 'screen' as const,
                  }} />
              </div>
            )}
            {/* Energy flow between rings */}
            <div className="absolute rounded-full overflow-hidden" style={{ width: 164, height: 164 }}>
              <div className="absolute w-full h-full"
                style={{
                  background: colorMode === 'accent'
                    ? `conic-gradient(from 0deg, transparent 0%, ${accentColor}30 15%, transparent 30%, ${accentColor}20 45%, transparent 60%)`
                    : paletteConicGradient(colorMode, accentColor, 0),
                  animation: 'av-faction-flow 4s linear infinite',
                }} />
            </div>
            {/* Corner accent dots (cardinal directions) */}
            {[0, 90, 180, 270].map((deg, i) => (
              <div key={deg} className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: palette[i % palette.length],
                  boxShadow: `0 0 4px ${palette[i % palette.length]}60`,
                  top: '50%', left: '50%',
                  transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-82px)`,
                  animation: `av-dot-pulse 2s ease-in-out infinite ${deg / 360}s`,
                }} />
            ))}
          </>
        )
      case 'animated':
        return (
          <>
            {/* Base ring */}
            <div className="absolute rounded-full"
              style={{
                width: 152, height: 152,
                borderWidth: 3, borderStyle: 'solid',
                borderColor: colorMode === 'accent' ? accentColor : 'transparent',
                borderImage: colorMode === 'accent' ? 'none' : `${paletteGradient(colorMode, accentColor)} 1`,
                boxShadow: `0 0 20px ${palette[0]}50`,
              }} />
            {/* Orbiting arc 1 */}
            <svg className="absolute pointer-events-none" width="180" height="180" viewBox="0 0 180 180"
              style={{ animation: 'av-orbit 5s linear infinite' }}>
              <defs>
                <linearGradient id="arcGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
                  <stop offset="50%" stopColor={accentColor} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                </linearGradient>
              </defs>
              <circle cx="90" cy="90" r="84" fill="none" stroke="url(#arcGrad1)" strokeWidth="2.5"
                strokeDasharray="40 488" strokeLinecap="round" />
            </svg>
            {/* Orbiting arc 2 (counter-rotate) */}
            <svg className="absolute pointer-events-none" width="172" height="172" viewBox="0 0 172 172"
              style={{ animation: 'av-orbit-reverse 7s linear infinite', left: 4, top: 4 }}>
              <circle cx="86" cy="86" r="82" fill="none" stroke={accentColor} strokeWidth="1.5"
                strokeDasharray="25 490" strokeLinecap="round" opacity="0.5" />
            </svg>
            {/* Orbiting spark particles */}
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="absolute" style={{ width: 180, height: 180, animation: `av-orbit ${4 + i * 0.7}s linear infinite ${i * 0.4}s` }}>
                <div className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: palette[i % palette.length],
                    boxShadow: `0 0 6px ${palette[i % palette.length]}, 0 0 12px ${palette[i % palette.length]}60`,
                    top: 0, left: '50%', transform: 'translateX(-50%)',
                  }} />
              </div>
            ))}
            {/* Pulsing outer boundary */}
            <div className="absolute rounded-full"
              style={{
                width: 180, height: 180,
                border: `1px solid ${accentColor}15`,
                animation: 'av-boundary-pulse 3s ease-in-out infinite',
              }} />
          </>
        )
      default: // 'default'
        return (
          <div className="absolute rounded-full"
            style={{
              width: 150, height: 150,
              border: `3px solid ${accentColor}60`,
              boxShadow: `0 0 15px ${accentColor}30`,
            }} />
        )
    }
  }

  // ── Render Effect ──
  const renderEffect = () => {
    switch (avatarEffect) {
      case 'glow':
        return (
          <div className="absolute rounded-full"
            style={{
              width: 160, height: 160,
              backgroundColor: accentColor,
              opacity: 0.25,
              filter: 'blur(35px)',
              animation: 'av-glow-breathe 3s ease-in-out infinite',
            }} />
        )
      case 'pulse':
        return (
          <>
            {/* Three staggered sonar rings */}
            {[0, 0.7, 1.4].map((delay, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  width: 150, height: 150,
                  border: `${3 - i}px solid ${palette[i % palette.length]}`,
                  opacity: 0,
                  animation: `av-sonar-ring 2.5s ease-out infinite ${delay}s`,
                }} />
            ))}
            {/* Center glow */}
            <div className="absolute rounded-full"
              style={{
                width: 140, height: 140,
                backgroundColor: accentColor,
                opacity: 0.1,
                filter: 'blur(20px)',
                animation: 'av-glow-breathe 2.5s ease-in-out infinite',
              }} />
          </>
        )
      case 'aura':
        return (
          <>
            {/* Multi-layer aurora vortex */}
            <div className="absolute rounded-full"
              style={{
                width: 200, height: 200,
                background: colorMode === 'accent'
                  ? `conic-gradient(from 0deg, 
                      ${accentColor}00 0%, ${accentColor}30 12%, ${accentColor}00 25%, 
                      ${accentColor}20 37%, ${accentColor}00 50%, 
                      ${accentColor}35 62%, ${accentColor}00 75%, 
                      ${accentColor}15 87%, ${accentColor}00 100%)`
                  : (() => {
                      const p = palette
                      return `conic-gradient(from 0deg, 
                        ${p[0]}00 0%, ${p[0]}40 12%, ${p[1]}00 25%, 
                        ${p[1]}30 37%, ${p[2]}00 50%, 
                        ${p[2]}45 62%, ${p[3 % p.length]}00 75%, 
                        ${p[3 % p.length]}20 87%, ${p[0]}00 100%)`
                    })(),
                animation: 'av-aura-spin 6s linear infinite',
                filter: 'blur(12px)',
              }} />
            <div className="absolute rounded-full"
              style={{
                width: 190, height: 190,
                background: colorMode === 'accent'
                  ? `conic-gradient(from 180deg, 
                      ${accentColor}00 0%, ${accentColor}20 15%, ${accentColor}00 30%, 
                      ${accentColor}25 50%, ${accentColor}00 65%, 
                      ${accentColor}15 80%, ${accentColor}00 100%)`
                  : (() => {
                      const p = palette
                      return `conic-gradient(from 180deg, 
                        ${p[1]}00 0%, ${p[2]}25 15%, ${p[3 % p.length]}00 30%, 
                        ${p[0]}30 50%, ${p[1]}00 65%, 
                        ${p[2]}20 80%, ${p[1]}00 100%)`
                    })(),
                animation: 'av-aura-spin-reverse 8s linear infinite',
                filter: 'blur(8px)',
              }} />
            {/* Inner radiance */}
            <div className="absolute rounded-full"
              style={{
                width: 170, height: 170,
                ...(colorMode === 'accent'
                  ? { backgroundColor: accentColor }
                  : paletteAnimatedBg(colorMode, accentColor, 124)),
                opacity: 0.06,
                filter: 'blur(35px)',
                animation: colorMode === 'accent' 
                  ? 'av-glow-breathe 4s ease-in-out infinite'
                  : 'av-glow-breathe 4s ease-in-out infinite, color-shift-flow 12s ease infinite',
              }} />
            {/* Orbiting sparkle dots */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="absolute"
                style={{
                  width: 4, height: 4,
                  top: '50%', left: '50%',
                  transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-95px)`,
                }}>
                <div className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: colorMode === 'accent' ? 'white' : palette[i % palette.length],
                    boxShadow: `0 0 3px ${palette[i % palette.length]}80, 0 0 6px ${palette[i % palette.length]}40`,
                    animation: `av-sparkle-twinkle 2s ease-in-out infinite ${i * 0.25}s`,
                  }} />
              </div>
            ))}
          </>
        )
      case 'orbit':
        return (
          <>
            {/* Orbital rings — three tilted planes */}
            <svg className="absolute pointer-events-none" width="200" height="200" viewBox="0 0 200 200"
              style={{ animation: 'av-void-orbit-1 6s linear infinite' }}>
              <ellipse cx="100" cy="100" rx="90" ry="30" fill="none"
                stroke={palette[0]} strokeWidth="0.8" opacity="0.3"
                strokeDasharray="6 8" />
            </svg>
            <svg className="absolute pointer-events-none" width="200" height="200" viewBox="0 0 200 200"
              style={{ animation: 'av-void-orbit-2 8s linear infinite', transform: 'rotateX(60deg) rotateZ(30deg)' }}>
              <ellipse cx="100" cy="100" rx="85" ry="25" fill="none"
                stroke={palette[1] || palette[0]} strokeWidth="0.8" opacity="0.25"
                strokeDasharray="4 10" />
            </svg>
            <svg className="absolute pointer-events-none" width="200" height="200" viewBox="0 0 200 200"
              style={{ animation: 'av-void-orbit-3 10s linear infinite', transform: 'rotateX(50deg) rotateZ(-45deg)' }}>
              <ellipse cx="100" cy="100" rx="95" ry="20" fill="none"
                stroke={palette[Math.min(2, palette.length - 1)]} strokeWidth="0.6" opacity="0.2"
                strokeDasharray="3 12" />
            </svg>
            {/* Orbiting particles (3 on different orbits) */}
            {[0, 1, 2].map(i => (
              <div key={i} className="absolute"
                style={{
                  width: 200, height: 200,
                  animation: `av-void-particle-orbit-${i} ${5 + i * 1.5}s linear infinite`,
                }}>
                <div className="absolute rounded-full"
                  style={{
                    width: 4 - i * 0.5,
                    height: 4 - i * 0.5,
                    top: i === 0 ? '2%' : i === 1 ? '8%' : '5%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: palette[i % palette.length],
                    boxShadow: `0 0 6px ${palette[i % palette.length]}, 0 0 12px ${palette[i % palette.length]}50`,
                  }} />
              </div>
            ))}
            {/* Center subtle glow */}
            <div className="absolute rounded-full"
              style={{
                width: 160, height: 160,
                backgroundColor: palette[0],
                opacity: 0.08,
                filter: 'blur(30px)',
                animation: 'av-glow-breathe 4s ease-in-out infinite',
              }} />
          </>
        )
      case 'ripple':
        return (
          <>
            {/* Expanding water rings from avatar center */}
            {[0, 1, 2].map(i => (
              <div key={`ripple-${i}`} className="absolute rounded-full"
                style={{
                  width: 120 + i * 30,
                  height: 120 + i * 30,
                  border: `1px solid ${palette[i % palette.length]}${i === 0 ? '35' : '20'}`,
                  animation: `av-sea-ripple ${3 + i * 0.8}s ease-out infinite ${i * 1}s`,
                }} />
            ))}
            {/* Subtle surface shimmer */}
            <div className="absolute rounded-full overflow-hidden"
              style={{ width: 160, height: 160 }}>
              <div className="absolute inset-0"
                style={{
                  backgroundImage: `linear-gradient(160deg, transparent 40%, ${palette[0]}15 50%, transparent 60%)`,
                  backgroundSize: '200% 200%',
                  animation: 'av-sea-shimmer 3s ease-in-out infinite',
                }} />
            </div>
            {/* Tiny bubble accents */}
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = (i * 72) * (Math.PI / 180)
              const radius = 55 + (i % 2) * 15
              return (
                <div key={`av-bubble-${i}`} className="absolute rounded-full"
                  style={{
                    width: 3 - (i % 2) * 0.5,
                    height: 3 - (i % 2) * 0.5,
                    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
                    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
                    transform: 'translate(-50%, -50%)',
                    border: `0.5px solid ${palette[i % palette.length]}50`,
                    backgroundColor: `${palette[i % palette.length]}15`,
                    animation: `av-sea-bubble-float ${2.5 + (i % 3) * 0.5}s ease-in-out infinite ${i * 0.4}s`,
                  }} />
              )
            })}
            {/* Underwater ambient glow */}
            <div className="absolute rounded-full"
              style={{
                width: 140, height: 140,
                backgroundColor: palette[0],
                opacity: 0.06,
                filter: 'blur(25px)',
                animation: 'av-glow-breathe 5s ease-in-out infinite',
              }} />
          </>
        )
      case 'spores':
        return (
          <>
            {/* Floating spore particles around the avatar */}
            {Array.from({ length: 14 }).map((_, i) => {
              const angle = (i / 14) * Math.PI * 2
              const baseRadius = 38 + (i % 3) * 8
              const sporeSize = 2 + (i % 3) * 1.5
              return (
                <div key={`spore-${i}`} className="absolute rounded-full"
                  style={{
                    width: sporeSize,
                    height: sporeSize,
                    left: `calc(50% + ${Math.cos(angle) * baseRadius}px)`,
                    top: `calc(50% + ${Math.sin(angle) * baseRadius}px)`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: `${palette[i % palette.length]}60`,
                    boxShadow: `0 0 ${sporeSize * 2}px ${palette[i % palette.length]}40`,
                    animation: `av-spore-float-${i % 3} ${3 + (i % 4)}s ease-in-out infinite ${i * 0.3}s`,
                  }} />
              )
            })}
            {/* Thin connecting threads (like mycelium) */}
            <svg className="absolute" style={{ width: 120, height: 120, left: 'calc(50% - 60px)', top: 'calc(50% - 60px)' }}>
              {[0, 1, 2, 3].map((i) => {
                const a1 = (i / 4) * Math.PI * 2
                const a2 = ((i + 1) / 4) * Math.PI * 2
                const r = 45
                return (
                  <path key={`thread-${i}`}
                    d={`M${60 + Math.cos(a1) * r},${60 + Math.sin(a1) * r} Q60,60 ${60 + Math.cos(a2) * r},${60 + Math.sin(a2) * r}`}
                    fill="none"
                    stroke={`${palette[i % palette.length]}20`}
                    strokeWidth="0.5"
                    style={{ animation: `av-spore-thread 6s ease-in-out infinite ${i * 1.5}s` }} />
                )
              })}
            </svg>
            {/* Central forest glow */}
            <div className="absolute rounded-full"
              style={{
                width: 130, height: 130,
                backgroundColor: palette[0],
                opacity: 0.07,
                filter: 'blur(25px)',
                animation: 'av-glow-breathe 6s ease-in-out infinite',
              }} />
          </>
        )
      case 'halo':
        return (
          <>
            {/* Halo ring above avatar — conic gradient rotation */}
            <div className="absolute"
              style={{
                width: 100, height: 28,
                top: -18,
                left: 'calc(50% - 50px)',
                borderRadius: '50%',
                background: `conic-gradient(from 0deg, ${palette[0]}60, ${palette[Math.min(1, palette.length - 1)]}40, ${palette[0]}60, transparent, ${palette[0]}60)`,
                animation: 'av-halo-rotate 4s linear infinite',
                filter: 'blur(2px)',
              }} />
            {/* Inner halo glow */}
            <div className="absolute"
              style={{
                width: 80, height: 20,
                top: -14,
                left: 'calc(50% - 40px)',
                borderRadius: '50%',
                boxShadow: `0 0 15px ${palette[0]}50, 0 0 30px ${palette[0]}25`,
                animation: 'av-halo-glow 3s ease-in-out infinite',
              }} />
            {/* Sunray beams radiating outward */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * 360
              const rayLength = 44 + (i % 3) * 6
              return (
                <div key={`ray-${i}`} className="absolute"
                  style={{
                    width: 1.5,
                    height: rayLength,
                    left: 'calc(50% - 0.75px)',
                    top: `calc(50% - ${rayLength}px)`,
                    background: `linear-gradient(180deg, ${palette[i % palette.length]}00, ${palette[i % palette.length]}30, ${palette[i % palette.length]}00)`,
                    transformOrigin: `0.75px ${rayLength}px`,
                    transform: `rotate(${angle}deg)`,
                    animation: `av-halo-ray-pulse ${2 + (i % 3) * 0.5}s ease-in-out infinite ${i * 0.25}s`,
                  }} />
              )
            })}
            {/* Warm glow behind avatar */}
            <div className="absolute rounded-full"
              style={{
                width: 140, height: 140,
                backgroundColor: palette[0],
                opacity: 0.08,
                filter: 'blur(25px)',
                animation: 'av-glow-breathe 5s ease-in-out infinite',
              }} />
          </>
        )
      default:
        return null
    }
  }

  // ── Level Badge ──
  const renderLevelBadge = () => {
    switch (levelBadge) {
      case 'shield':
        return (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2" style={{ width: 56, height: 44 }}>
            <svg viewBox="0 0 56 44" fill="none" className="absolute inset-0 w-full h-full" style={{ filter: `drop-shadow(0 2px 6px ${accentColor}80)` }}>
              {/* Shield body */}
              <path d="M28 2 L52 8 L48 32 L28 42 L8 32 L4 8 Z" fill={accentColor} />
              {/* Inner inset */}
              <path d="M28 6 L47 11 L44 30 L28 38 L12 30 L9 11 Z" fill={`${accentColor}40`} />
              {/* Highlight */}
              <path d="M28 6 L47 11 L44 20 L28 18 L12 20 L9 11 Z" fill="rgba(255,255,255,0.2)" />
              {/* Top accent */}
              <path d="M22 2 L28 0 L34 2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-extrabold text-sm pt-1"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
              {level}
            </span>
          </div>
        )
      case 'crest':
        return (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <div className="relative">
              {/* Wing left */}
              <svg className="absolute -left-5 top-1/2 -translate-y-1/2" width="24" height="20" viewBox="0 0 24 20">
                <path d="M24 10 Q20 2 8 0 Q2 0 0 4 Q4 8 10 10 Q4 12 0 16 Q2 20 8 20 Q20 18 24 10Z" 
                  fill={accentColor} opacity="0.5" />
                <path d="M24 10 Q20 4 12 2 Q8 4 14 10 Q8 16 12 18 Q20 16 24 10Z" 
                  fill={accentColor} opacity="0.3" />
              </svg>
              {/* Wing right */}
              <svg className="absolute -right-5 top-1/2 -translate-y-1/2" width="24" height="20" viewBox="0 0 24 20" style={{ transform: 'translateY(-50%) scaleX(-1)' }}>
                <path d="M24 10 Q20 2 8 0 Q2 0 0 4 Q4 8 10 10 Q4 12 0 16 Q2 20 8 20 Q20 18 24 10Z" 
                  fill={accentColor} opacity="0.5" />
                <path d="M24 10 Q20 4 12 2 Q8 4 14 10 Q8 16 12 18 Q20 16 24 10Z" 
                  fill={accentColor} opacity="0.3" />
              </svg>
              {/* Main plate */}
              <div className="relative px-5 py-1.5 rounded-lg text-white font-extrabold text-sm"
                style={{
                  background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}bb 100%)`,
                  boxShadow: `0 0 20px ${accentColor}80, 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)`,
                  border: `1px solid rgba(255,255,255,0.2)`,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}>
                <span className="relative z-10">Level {level}</span>
                {/* Shimmer across plate */}
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                  <div className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      backgroundSize: '200% 100%',
                      animation: 'av-badge-shimmer 3s ease-in-out infinite',
                    }} />
                </div>
              </div>
              {/* Crown jewel on top */}
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3"
                style={{
                  background: `radial-gradient(circle, white, ${accentColor})`,
                  borderRadius: '50%',
                  boxShadow: `0 0 8px ${accentColor}, 0 0 16px ${accentColor}60`,
                }} />
            </div>
          </div>
        )
      case 'orb':
        return (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
            <div className="relative w-14 h-14 flex items-center justify-center"
              style={{ animation: 'av-orb-float 3s ease-in-out infinite' }}>
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
                  animation: 'av-glow-breathe 2s ease-in-out infinite',
                }} />
              {/* The orb */}
              <div className="relative w-11 h-11 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, 
                    rgba(255,255,255,0.8) 0%, 
                    ${accentColor}cc 30%, 
                    ${accentColor} 60%, 
                    ${accentColor}88 100%)`,
                  boxShadow: `
                    0 0 30px ${accentColor}80, 
                    0 0 60px ${accentColor}30,
                    inset 0 -4px 10px rgba(0,0,0,0.3), 
                    inset 0 4px 10px rgba(255,255,255,0.4)`,
                }}>
                <span className="text-white font-black text-base relative z-10"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.6)' }}>
                  {level}
                </span>
                {/* Glass highlight */}
                <div className="absolute rounded-full"
                  style={{
                    width: '70%', height: '40%',
                    top: '10%', left: '15%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
                    borderRadius: '50%',
                  }} />
              </div>
              {/* Tiny orbiting ring */}
              <svg className="absolute pointer-events-none" width="56" height="56" viewBox="0 0 56 56"
                style={{ animation: 'av-orbit 4s linear infinite' }}>
                <circle cx="28" cy="28" r="25" fill="none" stroke={accentColor} strokeWidth="0.5"
                  strokeDasharray="4 20" opacity="0.4" />
              </svg>
            </div>
          </div>
        )
      default: // flat
        return (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white font-bold text-sm"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}80` }}>
            Level {level}
          </div>
        )
    }
  }

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 200, height: 200 }}
      onClick={handleClick}
    >
      {/* Effect layer (behind everything) */}
      {renderEffect()}

      {/* Frame layer */}
      {renderFrame()}

      {/* Avatar image */}
      <div className="relative rounded-full overflow-hidden"
        style={{
          width: 130, height: 130,
          border: `3px solid ${borderColor}`,
          boxShadow: avatarFrame !== 'default' ? `inset 0 0 20px rgba(0,0,0,0.2)` : 'none',
        }}>
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold"
            style={{ backgroundColor: `${accentColor}40`, color: isDarkMode ? 'white' : '#1a1a2e' }}>
            {initials}
          </div>
        )}
      </div>

      {/* Level badge */}
      {renderLevelBadge()}

      {/* Click burst effect */}
      {showBurst && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute left-1/2 top-1/2 rounded-full animate-av-burst"
              style={{
                width: i % 3 === 0 ? 4 : 2,
                height: i % 3 === 0 ? 4 : 2,
                backgroundColor: palette[i % palette.length],
                boxShadow: `0 0 6px ${palette[i % palette.length]}`,
                '--burst-angle': `${i * 22.5}deg`,
                '--burst-dist': `${60 + (i % 3) * 20}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes av-chrome-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes av-specular-sweep { 0%,100% { left: -30%; } 50% { left: 100%; } }
        @keyframes av-faction-outer { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.04); opacity: 1; } }
        @keyframes av-faction-flow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes av-dot-pulse { 0%,100% { transform: translate(-50%,-50%) rotate(var(--_deg, 0deg)) translateY(-82px) scale(1); opacity: 0.6; } 50% { transform: translate(-50%,-50%) rotate(var(--_deg, 0deg)) translateY(-82px) scale(1.5); opacity: 1; } }
        @keyframes av-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes av-orbit-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes av-boundary-pulse { 0%,100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.02); } }
        @keyframes av-glow-breathe { 0%,100% { opacity: 0.15; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.08); } }
        @keyframes av-sonar-ring { 0% { transform: scale(0.9); opacity: 0.6; } 100% { transform: scale(1.35); opacity: 0; } }
        @keyframes av-aura-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes av-aura-spin-reverse { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        @keyframes av-sparkle-twinkle { 0%,100% { opacity: 0.2; transform: scale(0.5); } 50% { opacity: 1; transform: scale(1.5); } }
        @keyframes av-badge-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes av-orb-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes av-burst {
          0% { transform: translate(-50%,-50%) rotate(var(--burst-angle)) translateY(0) scale(1); opacity: 1; }
          100% { transform: translate(-50%,-50%) rotate(var(--burst-angle)) translateY(calc(-1 * var(--burst-dist))) scale(0); opacity: 0; }
        }
        .animate-av-burst { animation: av-burst 0.8s ease-out forwards; }
        @keyframes av-void-orbit-1 { 0% { transform: rotateX(60deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateZ(360deg); } }
        @keyframes av-void-orbit-2 { 0% { transform: rotateX(60deg) rotateY(30deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateY(30deg) rotateZ(360deg); } }
        @keyframes av-void-orbit-3 { 0% { transform: rotateX(60deg) rotateY(-30deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateY(-30deg) rotateZ(360deg); } }
        @keyframes av-void-particle-orbit-0 { 0% { transform: rotateX(60deg) rotateZ(0deg) translateX(56px) scale(1); opacity:0.9; } 50% { opacity:0.4; } 100% { transform: rotateX(60deg) rotateZ(360deg) translateX(56px) scale(1); opacity:0.9; } }
        @keyframes av-void-particle-orbit-1 { 0% { transform: rotateX(60deg) rotateY(30deg) rotateZ(0deg) translateX(52px) scale(0.8); opacity:0.8; } 50% { opacity:0.3; } 100% { transform: rotateX(60deg) rotateY(30deg) rotateZ(360deg) translateX(52px) scale(0.8); opacity:0.8; } }
        @keyframes av-void-particle-orbit-2 { 0% { transform: rotateX(60deg) rotateY(-30deg) rotateZ(0deg) translateX(48px) scale(0.6); opacity:0.7; } 50% { opacity:0.25; } 100% { transform: rotateX(60deg) rotateY(-30deg) rotateZ(360deg) translateX(48px) scale(0.6); opacity:0.7; } }
        @keyframes av-sea-ripple {
          0% { transform: scale(0.8); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes av-sea-shimmer {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
        @keyframes av-sea-bubble-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) translateY(-8px); opacity: 0.7; }
        }
        @keyframes av-spore-float-0 {
          0%, 100% { transform: translate(-50%, -50%) translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) translateY(-10px) scale(1.3); opacity: 0.8; }
        }
        @keyframes av-spore-float-1 {
          0%, 100% { transform: translate(-50%, -50%) translateX(0) scale(1); opacity: 0.35; }
          50% { transform: translate(-50%, -50%) translateX(8px) translateY(-5px) scale(1.2); opacity: 0.75; }
        }
        @keyframes av-spore-float-2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0.3; }
          35% { transform: translate(-50%, -50%) translate(-6px, -8px) scale(1.25); opacity: 0.7; }
          70% { transform: translate(-50%, -50%) translate(5px, -3px) scale(1.1); opacity: 0.6; }
        }
        @keyframes av-spore-thread {
          0%, 100% { opacity: 0.15; stroke-dashoffset: 0; }
          50% { opacity: 0.4; stroke-dashoffset: 10; }
        }
        @keyframes av-halo-rotate {
          0% { transform: rotateX(65deg) rotate(0deg); }
          100% { transform: rotateX(65deg) rotate(360deg); }
        }
        @keyframes av-halo-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes av-halo-ray-pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        @keyframes color-shift-flow {
          0% { background-position: 0% 82%; }
          50% { background-position: 100% 19%; }
          100% { background-position: 0% 82%; }
        }
      `}</style>
    </div>
  )
}

/**
 * CleanProgressBar — XP bar with escalating skin tiers
 * clean (solid fill) → shimmer (traveling light) → energy (plasma flow + edge sparks) → segmented (individual cells with cascade fill)
 */
function CleanProgressBar({
  progress,
  currentXP,
  xpToNextLevel,
  level,
  accentColor = '#8661ff',
  isDarkMode = true,
  xpBarSkin = 'shimmer' as XPBarSkin,
  colorMode = 'accent' as ColorMode,
}: {
  progress: number
  currentXP: number
  xpToNextLevel: number
  level: number
  accentColor?: string
  isDarkMode?: boolean
  xpBarSkin?: XPBarSkin
  colorMode?: ColorMode
}) {
  const [displayProgress, setDisplayProgress] = useState(0)
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textColorMuted = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
  const palette = getColorPalette(colorMode, accentColor)

  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])

  const segments = 12
  const filledSegments = Math.floor((displayProgress / 100) * segments)
  const partialFill = ((displayProgress / 100) * segments) - filledSegments

  return (
    <div className="w-full">
      {/* Level labels */}
      <div className="flex justify-between items-center mb-2 text-sm">
        <span style={{ color: textColorMuted }}>Level {level}</span>
        <span style={{ color: textColor }} className="font-medium">
          {currentXP.toLocaleString('sv-SE')} / {xpToNextLevel.toLocaleString('sv-SE')} XP
        </span>
        <span style={{ color: textColorMuted }}>Level {level + 1}</span>
      </div>

      {xpBarSkin === 'segmented' ? (
        /* ═══ TIER 4: Segmented — individual glowing cells ═══ */
        <div className="relative">
          <div className="flex gap-0.5">
            {[...Array(segments)].map((_, i) => {
              const isFilled = i < filledSegments
              const isPartial = i === filledSegments
              const isLeading = i === filledSegments - 1
              return (
                <div key={i} className="flex-1 h-7 rounded-md overflow-hidden relative"
                  style={{
                    backgroundColor: `${palette[0]}10`,
                    border: `1px solid ${isFilled ? `${palette[i % palette.length]}40` : `${palette[0]}10`}`,
                    transition: 'all 0.3s ease',
                    transitionDelay: `${i * 30}ms`,
                  }}>
                  {/* Fill */}
                  <div className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                    style={{
                      width: isFilled ? '100%' : (isPartial ? `${partialFill * 100}%` : '0%'),
                      ...(isFilled ? paletteAnimatedBg(colorMode, accentColor, 180 + i * 30) : { backgroundColor: palette[i % palette.length] }),
                      boxShadow: isFilled ? `0 0 12px ${palette[i % palette.length]}50, inset 0 1px 0 rgba(255,255,255,0.3)` : 'none',
                      transitionDelay: `${i * 30}ms`,
                    }} />
                  {/* Glass highlight */}
                  {isFilled && (
                    <div className="absolute inset-x-0 top-0 h-1/3 rounded-t-md"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)' }} />
                  )}
                  {/* Leading edge glow */}
                  {isLeading && (
                    <div className="absolute right-0 inset-y-0 w-2"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.6))`,
                        animation: 'xp-seg-leading 1.5s ease-in-out infinite',
                      }} />
                  )}
                </div>
              )
            })}
          </div>
          {/* Floating percentage indicator */}
          {displayProgress > 0 && (
            <div className="absolute -top-7 transition-all duration-1000"
              style={{
                left: `${displayProgress}%`,
                transform: 'translateX(-50%)',
              }}>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  ...paletteAnimatedBg(colorMode, accentColor, 90),
                  color: 'white',
                  boxShadow: `0 0 6px ${palette[0]}35`,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                {Math.round(displayProgress)}%
              </span>
            </div>
          )}
        </div>
      ) : (
        /* ═══ Continuous Bars ═══ */
        <div className="relative h-7 rounded-full overflow-hidden"
          style={{
            backgroundColor: `${palette[0]}15`,
            boxShadow: xpBarSkin === 'energy' ? `inset 0 2px 4px rgba(0,0,0,0.3)` : 'none',
          }}>
          {/* Track texture (energy only) */}
          {xpBarSkin === 'energy' && (
            <div className="absolute inset-0 rounded-full"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 20px, ${palette[0]}08 20px, ${palette[0]}08 21px)`,
              }} />
          )}

          {/* Fill bar */}
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${displayProgress}%`,
              ...paletteAnimatedBg(colorMode, accentColor, 90),
              boxShadow: xpBarSkin === 'energy'
                ? `0 0 12px ${palette[0]}50, 0 0 25px ${palette[1] || palette[0]}18, inset 0 0 6px rgba(255,255,255,0.08)`
                : `0 0 10px ${palette[0]}30`,
            }}>

            {/* ── TIER 1: Clean — just a glass highlight ── */}
            {xpBarSkin === 'clean' && (
              <div className="absolute inset-x-0 top-0 h-1/2"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }} />
            )}

            {/* ── TIER 2: Shimmer — traveling light band ── */}
            {xpBarSkin === 'shimmer' && (
              <>
                <div className="absolute inset-x-0 top-0 h-1/2"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)' }} />
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                    backgroundSize: '300% 100%',
                    animation: 'xp-shimmer 2.5s ease-in-out infinite',
                  }} />
              </>
            )}

            {/* ── TIER 3: Energy — plasma with flowing particles ── */}
            {xpBarSkin === 'energy' && (
              <>
                {/* Plasma flow lines */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(110deg, 
                      transparent, transparent 6px, 
                      rgba(255,255,255,0.08) 6px, rgba(255,255,255,0.08) 7px,
                      transparent 7px, transparent 12px,
                      rgba(255,255,255,0.12) 12px, rgba(255,255,255,0.12) 13px)`,
                    animation: 'xp-plasma-flow 1s linear infinite',
                  }} />
                {/* Bright energy wave */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)`,
                    backgroundSize: '40% 100%',
                    animation: 'xp-energy-wave 2s ease-in-out infinite',
                  }} />
                {/* Hot core glow */}
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.15) 100%)',
                  }} />
                {/* Sparks at leading edge */}
                <div className="absolute right-0 top-0 bottom-0 w-4"
                  style={{
                    background: `radial-gradient(circle at right, rgba(255,255,255,0.6) 0%, transparent 70%)`,
                    animation: 'xp-edge-spark 0.8s ease-in-out infinite',
                  }} />
              </>
            )}

            {/* ── TIER 4: Warp — hyperspace speed streaks ── */}
            {xpBarSkin === 'warp' && (
              <>
                {/* Deep space base glow */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)`,
                  }} />
                {/* Speed streaks layer 1 — thin fast lines */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg,
                      transparent 0px, transparent 2px,
                      rgba(255,255,255,0.25) 2px, rgba(255,255,255,0.25) 3px,
                      transparent 3px, transparent 7px)`,
                    animation: 'xp-warp-streak-1 0.4s linear infinite',
                  }} />
                {/* Speed streaks layer 2 — wider slower lines */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg,
                      transparent 0px, transparent 4px,
                      rgba(255,255,255,0.12) 4px, rgba(255,255,255,0.12) 6px,
                      transparent 6px, transparent 14px)`,
                    animation: 'xp-warp-streak-2 0.7s linear infinite',
                  }} />
                {/* Central warp tunnel glow */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(0deg, transparent 20%, rgba(255,255,255,0.15) 50%, transparent 80%)`,
                    animation: 'xp-warp-pulse 1.5s ease-in-out infinite',
                  }} />
                {/* Stretched starfield dots */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`warp-star-${i}`} className="absolute"
                    style={{
                      top: `${10 + (i * 11) % 80}%`,
                      left: `${(i * 17) % 100}%`,
                      width: 2,
                      height: `${6 + (i % 3) * 4}px`,
                      background: `linear-gradient(180deg, transparent, rgba(255,255,255,${0.4 + (i % 3) * 0.15}), transparent)`,
                      borderRadius: 1,
                      animation: `xp-warp-star ${0.3 + (i % 4) * 0.15}s linear infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }} />
                ))}
                {/* Leading edge warp flare */}
                <div className="absolute right-0 top-0 bottom-0 w-6"
                  style={{
                    background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.7) 0%, ${palette[0]}40 40%, transparent 80%)`,
                    animation: 'xp-warp-flare 0.6s ease-in-out infinite',
                  }} />
              </>
            )}

            {/* ── TIER 5: Current — ocean wave flow ── */}
            {xpBarSkin === 'current' && (
              <>
                {/* Glass highlight */}
                <div className="absolute inset-x-0 top-0 h-1/2"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }} />
                {/* Horizontal wave pattern layer 1 */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg,
                      transparent 0px, transparent 3px,
                      rgba(255,255,255,0.12) 3px, rgba(255,255,255,0.12) 4px,
                      transparent 4px, transparent 9px)`,
                    animation: 'xp-current-wave-1 2s ease-in-out infinite',
                  }} />
                {/* Horizontal wave pattern layer 2 — offset */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(0deg,
                      transparent 0px, transparent 5px,
                      rgba(255,255,255,0.08) 5px, rgba(255,255,255,0.08) 6px,
                      transparent 6px, transparent 12px)`,
                    animation: 'xp-current-wave-2 3s ease-in-out infinite 0.5s',
                  }} />
                {/* Surface caustic sheen */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.15) 45%, transparent 55%, rgba(255,255,255,0.1) 70%, transparent 85%)`,
                    backgroundSize: '250% 100%',
                    animation: 'xp-current-caustic 4s ease-in-out infinite',
                  }} />
                {/* Deep blue bottom shadow */}
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.15) 100%)',
                  }} />
                {/* Leading edge foam */}
                <div className="absolute right-0 top-0 bottom-0 w-5"
                  style={{
                    background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.5) 0%, ${palette[0]}30 50%, transparent 80%)`,
                    animation: 'xp-current-foam 1.5s ease-in-out infinite',
                  }} />
              </>
            )}

            {/* ── TIER 6: Growth — organic vine/moss spreading ── */}
            {xpBarSkin === 'growth' && (
              <>
                {/* Base organic texture — subtle dappled light */}
                <div className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(ellipse 8px 6px at 20% 50%, rgba(255,255,255,0.12) 0%, transparent 70%),
                      radial-gradient(ellipse 6px 8px at 50% 30%, rgba(255,255,255,0.08) 0%, transparent 70%),
                      radial-gradient(ellipse 10px 5px at 80% 60%, rgba(255,255,255,0.1) 0%, transparent 70%)`,
                    animation: 'xp-growth-dapple 6s ease-in-out infinite',
                  }} />
                {/* Vine pattern — diagonal growing lines */}
                <svg className="absolute inset-0" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 300 20">
                  <path d="M0,10 C20,4 40,16 60,10 C80,4 100,16 120,10 C140,4 160,16 180,10 C200,4 220,16 240,10 C260,4 280,16 300,10"
                    fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"
                    style={{ animation: 'xp-growth-vine 8s ease-in-out infinite' }} />
                  <path d="M0,14 C25,8 50,18 75,12 C100,6 125,17 150,11 C175,5 200,16 225,10 C250,4 275,15 300,10"
                    fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"
                    style={{ animation: 'xp-growth-vine 10s ease-in-out infinite 1s' }} />
                  {/* Small leaves along the vine */}
                  {[30, 90, 150, 210, 270].map((x, i) => (
                    <ellipse key={`xp-leaf-${i}`}
                      cx={x} cy={10 + (i % 2 === 0 ? -4 : 4)}
                      rx="4" ry="2.5"
                      fill={`rgba(255,255,255,${0.08 + (i % 3) * 0.04})`}
                      transform={`rotate(${i % 2 === 0 ? 25 : -25}, ${x}, ${10 + (i % 2 === 0 ? -4 : 4)})`}
                      style={{ animation: `xp-growth-leaf-sway ${3 + i * 0.5}s ease-in-out infinite ${i * 0.4}s` }} />
                  ))}
                </svg>
                {/* Moss glow gradient from left */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, ${palette[0]}15 0%, transparent 30%, transparent 70%, ${palette[0]}10 100%)`,
                  }} />
                {/* Top highlight — soft organic */}
                <div className="absolute inset-x-0 top-0 h-1/3"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)' }} />
                {/* Leading edge — organic growth pulse */}
                <div className="absolute right-0 top-0 bottom-0 w-4"
                  style={{
                    background: `radial-gradient(ellipse at right center, ${palette[0]}50 0%, ${palette[0]}20 50%, transparent 100%)`,
                    animation: 'xp-growth-pulse 2s ease-in-out infinite',
                  }} />
              </>
            )}

            {/* ── TIER 7: Rainbow — prismatic shimmer ── */}
            {xpBarSkin === 'rainbow' && (
              <>
                {/* Prismatic rainbow overlay — rotating conic gradient */}
                <div className="absolute inset-0"
                  style={{
                    background: `linear-gradient(90deg, 
                      ${palette[0]}40 0%, 
                      ${palette[Math.min(1, palette.length - 1)]}35 20%, 
                      ${palette[Math.min(2, palette.length - 1)]}30 40%, 
                      ${palette[0]}35 60%, 
                      ${palette[Math.min(1, palette.length - 1)]}40 80%, 
                      ${palette[Math.min(2, palette.length - 1)]}35 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'xp-rainbow-shift 4s linear infinite',
                  }} />
                {/* Glass highlight */}
                <div className="absolute inset-x-0 top-0 h-1/2"
                  style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }} />
                {/* Traveling sparkle */}
                <div className="absolute top-0 bottom-0"
                  style={{
                    width: 20,
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                    animation: 'xp-rainbow-sparkle 3s ease-in-out infinite',
                  }} />
                {/* Soft prismatic edge glow */}
                <div className="absolute right-0 top-0 bottom-0 w-6"
                  style={{
                    background: `radial-gradient(ellipse at right center, rgba(255,255,255,0.5) 0%, ${palette[0]}30 50%, transparent 100%)`,
                    animation: 'xp-rainbow-edge 2s ease-in-out infinite',
                  }} />
              </>
            )}
          </div>

          {/* Leading edge marker */}
          {displayProgress > 0 && displayProgress < 100 && (
            <div className="absolute top-0 bottom-0 transition-all duration-1000"
              style={{
                left: `calc(${displayProgress}% - 2px)`,
                width: 4,
                background: xpBarSkin === 'energy'
                  ? `linear-gradient(180deg, rgba(255,255,255,0.9), ${palette[0]}, rgba(255,255,255,0.9))`
                  : `radial-gradient(circle, white 0%, ${palette[0]} 60%, transparent 100%)`,
                boxShadow: xpBarSkin === 'energy' ? `0 0 8px white, 0 0 16px ${palette[0]}` : 'none',
                filter: xpBarSkin === 'energy' ? 'blur(0.5px)' : 'none',
              }} />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes xp-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes xp-plasma-flow { 0% { transform: translateX(-13px); } 100% { transform: translateX(0); } }
        @keyframes xp-energy-wave { 0%,100% { background-position: -40% 0; } 50% { background-position: 140% 0; } }
        @keyframes xp-edge-spark { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes xp-seg-leading { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes xp-warp-streak-1 { 0% { transform: translateX(-13px); } 100% { transform: translateX(0); } }
        @keyframes xp-warp-streak-2 { 0% { transform: translateX(-14px); } 100% { transform: translateX(0); } }
        @keyframes xp-warp-pulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        @keyframes xp-warp-star { 0% { transform: translateX(-20px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateX(20px); opacity: 0; } }
        @keyframes xp-warp-flare { 0%,100% { opacity: 0.5; transform: scaleY(0.8); } 50% { opacity: 1; transform: scaleY(1.1); } }
        @keyframes xp-current-wave-1 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
        @keyframes xp-current-wave-2 { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
        @keyframes xp-current-caustic { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
        @keyframes xp-current-foam { 0%, 100% { opacity: 0.4; transform: scaleX(0.8); } 50% { opacity: 0.8; transform: scaleX(1.2); } }
        @keyframes xp-growth-dapple {
          0%, 100% { opacity: 0.7; background-position: 0% 50%; }
          50% { opacity: 1; background-position: 50% 50%; }
        }
        @keyframes xp-growth-vine {
          0% { stroke-dasharray: 600; stroke-dashoffset: 600; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes xp-growth-leaf-sway {
          0%, 100% { transform: rotate(25deg) scale(1); opacity: 0.08; }
          50% { transform: rotate(15deg) scale(1.2); opacity: 0.16; }
        }
        @keyframes xp-growth-pulse {
          0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
          50% { opacity: 0.9; transform: scaleX(1.3); }
        }
        @keyframes xp-rainbow-shift {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes xp-rainbow-sparkle {
          0% { left: -20px; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: calc(100% + 20px); opacity: 0; }
        }
        @keyframes xp-rainbow-edge {
          0%, 100% { opacity: 0.4; transform: scaleX(0.8); }
          50% { opacity: 0.9; transform: scaleX(1.2); }
        }
        @keyframes color-shift-flow {
          0% { background-position: 0% 82%; }
          50% { background-position: 100% 19%; }
          100% { background-position: 0% 82%; }
        }
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
    : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'

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
      className="relative p-4 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden"
      style={{
        transform: `perspective(500px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.03 : 1})`,
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
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}10 100%)`,
            boxShadow: isHovered ? `0 0 20px ${accentColor}40` : 'none',
          }}
        >
          <div className="w-9 h-9 flex items-center justify-center" style={{ color: accentColor }}>{icon}</div>
        </div>
        <div className="text-xl font-bold" style={{ color: textColor }}>{value}</div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: textColorMuted }}>{label}</div>
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
  // Which cosmetic setting this node unlocks (e.g. 'backgroundEffect:stars')
  cosmeticKey?: string
  // Category tag for grouping: bg, avatar, xp, divider, header, color, prestige
  cosmeticCategory?: 'root' | 'bg' | 'avatar' | 'xp' | 'divider' | 'header' | 'color' | 'prestige'
}

// Non-nullable faction type for dictionaries
type NonNullFactionId = Exclude<FactionId, null>

// Dice images per faction
const FACTION_DICE: Record<NonNullFactionId, string> = {
  forest: '/achievements/utmarkelser/lg/ic_dice.png',
  sea: '/achievements/utmarkelser/lg/ic_dice.png',
  sky: '/achievements/utmarkelser/lg/ic_dice.png',
  void: '/achievements/utmarkelser/lg/ic_dice.png',
}

// ── Theme-specific skill tree definitions ──
// Each theme has 9 nodes arranged in a 4-row tree:
//   Row 0: [Root]
//   Row 1: [Background 1] ─ [Avatar Effect] ─ [XP Bar]
//   Row 2: [Background 2] ─ [Divider] ─ [Header Frame]
//   Row 3: [Color Mode] ─── [Prestige Title]

type ThemeTreeDef = Omit<SkillNode, 'status'>[]

const THEME_SKILL_TREES: Record<NonNullFactionId, ThemeTreeDef> = {
  void: [
    { id: 'root',    label: 'Välj Void',       icon: 'star',  row: 0, col: 1, connectsFrom: [],             cosmeticCategory: 'root' },
    { id: 'bg1',     label: 'Stjärnfält',       icon: 'star',  row: 1, col: 0, connectsFrom: ['root'],       cosmeticKey: 'backgroundEffect:stars',         cosmeticCategory: 'bg' },
    { id: 'avatar',  label: 'Orbital',          icon: 'heart', row: 1, col: 1, connectsFrom: ['root'],       cosmeticKey: 'avatarEffect:orbit',             cosmeticCategory: 'avatar' },
    { id: 'xp',      label: 'Hyperspace',       icon: 'flame', row: 1, col: 2, connectsFrom: ['root'],       cosmeticKey: 'xpBarSkin:warp',                 cosmeticCategory: 'xp' },
    { id: 'bg2',     label: 'Meteorer',         icon: 'star',  row: 2, col: 0, connectsFrom: ['bg1'],        cosmeticKey: 'backgroundEffect:meteors',       cosmeticCategory: 'bg' },
    { id: 'divider', label: 'Nebulosa',         icon: 'badge', row: 2, col: 1, connectsFrom: ['avatar'],     cosmeticKey: 'sectionDivider:nebula',          cosmeticCategory: 'divider' },
    { id: 'header',  label: 'Stjärnbild',       icon: 'crown', row: 2, col: 2, connectsFrom: ['xp'],         cosmeticKey: 'headerFrame:constellation',      cosmeticCategory: 'header' },
    { id: 'color',   label: 'Galaktisk',        icon: 'gift',  row: 3, col: 0, connectsFrom: ['bg2', 'divider'], cosmeticKey: 'colorMode:galaxy',           cosmeticCategory: 'color' },
    { id: 'title',   label: 'Void Walker',      icon: 'crown', row: 3, col: 2, connectsFrom: ['divider', 'header'], cosmeticCategory: 'prestige' },
  ],
  sea: [
    { id: 'root',    label: 'Välj Hav',         icon: 'star',  row: 0, col: 1, connectsFrom: [],             cosmeticCategory: 'root' },
    { id: 'bg1',     label: 'Bubblor',          icon: 'heart', row: 1, col: 0, connectsFrom: ['root'],       cosmeticKey: 'backgroundEffect:bubbles',       cosmeticCategory: 'bg' },
    { id: 'avatar',  label: 'Vattenkrusning',   icon: 'heart', row: 1, col: 1, connectsFrom: ['root'],       cosmeticKey: 'avatarEffect:ripple',            cosmeticCategory: 'avatar' },
    { id: 'xp',      label: 'Havsström',        icon: 'flame', row: 1, col: 2, connectsFrom: ['root'],       cosmeticKey: 'xpBarSkin:current',              cosmeticCategory: 'xp' },
    { id: 'bg2',     label: 'Vågor',            icon: 'star',  row: 2, col: 0, connectsFrom: ['bg1'],        cosmeticKey: 'backgroundEffect:waves',         cosmeticCategory: 'bg' },
    { id: 'divider', label: 'Tidvatten',        icon: 'badge', row: 2, col: 1, connectsFrom: ['avatar'],     cosmeticKey: 'sectionDivider:tide',            cosmeticCategory: 'divider' },
    { id: 'header',  label: 'Korallrev',        icon: 'crown', row: 2, col: 2, connectsFrom: ['xp'],         cosmeticKey: 'headerFrame:coral',              cosmeticCategory: 'header' },
    { id: 'color',   label: 'Iskristall',       icon: 'gift',  row: 3, col: 0, connectsFrom: ['bg2', 'divider'], cosmeticKey: 'colorMode:ice',              cosmeticCategory: 'color' },
    { id: 'title',   label: 'Sea Walker',       icon: 'crown', row: 3, col: 2, connectsFrom: ['divider', 'header'], cosmeticCategory: 'prestige' },
  ],
  forest: [
    { id: 'root',    label: 'Välj Skog',        icon: 'star',  row: 0, col: 1, connectsFrom: [],             cosmeticCategory: 'root' },
    { id: 'bg1',     label: 'Löv',              icon: 'heart', row: 1, col: 0, connectsFrom: ['root'],       cosmeticKey: 'backgroundEffect:leaves',        cosmeticCategory: 'bg' },
    { id: 'avatar',  label: 'Sporer',           icon: 'heart', row: 1, col: 1, connectsFrom: ['root'],       cosmeticKey: 'avatarEffect:spores',            cosmeticCategory: 'avatar' },
    { id: 'xp',      label: 'Tillväxt',         icon: 'flame', row: 1, col: 2, connectsFrom: ['root'],       cosmeticKey: 'xpBarSkin:growth',               cosmeticCategory: 'xp' },
    { id: 'bg2',     label: 'Eldflugor',        icon: 'star',  row: 2, col: 0, connectsFrom: ['bg1'],        cosmeticKey: 'backgroundEffect:fireflies',     cosmeticCategory: 'bg' },
    { id: 'divider', label: 'Rötter',           icon: 'badge', row: 2, col: 1, connectsFrom: ['avatar'],     cosmeticKey: 'sectionDivider:roots',           cosmeticCategory: 'divider' },
    { id: 'header',  label: 'Rankor',           icon: 'crown', row: 2, col: 2, connectsFrom: ['xp'],         cosmeticKey: 'headerFrame:vines',              cosmeticCategory: 'header' },
    { id: 'color',   label: 'Giftigt Neon',     icon: 'gift',  row: 3, col: 0, connectsFrom: ['bg2', 'divider'], cosmeticKey: 'colorMode:toxic',            cosmeticCategory: 'color' },
    { id: 'title',   label: 'Forest Walker',    icon: 'crown', row: 3, col: 2, connectsFrom: ['divider', 'header'], cosmeticCategory: 'prestige' },
  ],
  sky: [
    { id: 'root',    label: 'Välj Himmel',      icon: 'star',  row: 0, col: 1, connectsFrom: [],             cosmeticCategory: 'root' },
    { id: 'bg1',     label: 'Moln',             icon: 'heart', row: 1, col: 0, connectsFrom: ['root'],       cosmeticKey: 'backgroundEffect:clouds',        cosmeticCategory: 'bg' },
    { id: 'avatar',  label: 'Gloriagloria',     icon: 'heart', row: 1, col: 1, connectsFrom: ['root'],       cosmeticKey: 'avatarEffect:halo',              cosmeticCategory: 'avatar' },
    { id: 'xp',      label: 'Regnbåge',         icon: 'flame', row: 1, col: 2, connectsFrom: ['root'],       cosmeticKey: 'xpBarSkin:rainbow',              cosmeticCategory: 'xp' },
    { id: 'bg2',     label: 'Gudastrålar',      icon: 'star',  row: 2, col: 0, connectsFrom: ['bg1'],        cosmeticKey: 'backgroundEffect:rays',          cosmeticCategory: 'bg' },
    { id: 'divider', label: 'Bris',             icon: 'badge', row: 2, col: 1, connectsFrom: ['avatar'],     cosmeticKey: 'sectionDivider:breeze',          cosmeticCategory: 'divider' },
    { id: 'header',  label: 'Norrsken',         icon: 'crown', row: 2, col: 2, connectsFrom: ['xp'],         cosmeticKey: 'headerFrame:aurora',             cosmeticCategory: 'header' },
    { id: 'color',   label: 'Solnedgång',       icon: 'gift',  row: 3, col: 0, connectsFrom: ['bg2', 'divider'], cosmeticKey: 'colorMode:sunset',           cosmeticCategory: 'color' },
    { id: 'title',   label: 'Sky Walker',       icon: 'crown', row: 3, col: 2, connectsFrom: ['divider', 'header'], cosmeticCategory: 'prestige' },
  ],
}

// Category icons for cosmetic node types
const COSMETIC_CATEGORY_ICONS: Record<string, string> = {
  root: '⭐',
  bg: '🌌',
  avatar: '✨',
  xp: '📊',
  divider: '➖',
  header: '🖼️',
  color: '🎨',
  prestige: '👑',
}

// Generate theme-specific skill tree with unlock status
function generateSkillTree(factionId: FactionId, completedCount: number): SkillNode[] {
  const nonNull = factionId || 'forest'
  const baseNodes = THEME_SKILL_TREES[nonNull as NonNullFactionId] || THEME_SKILL_TREES.forest

  // Determine status based on completedCount (sequential unlock for demo)
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
// Section Divider — escalating tiers
// line (basic) → glow (energy line + center pulse) → ornament (luxury pattern + shimmer) → fade (cinematic widescreen)
// =============================================================================

function SectionDivider({
  accentColor = '#8661ff',
  isDarkMode = true,
  label,
  dividerStyle = 'line' as SectionDividerStyle,
  colorMode = 'accent' as ColorMode,
}: {
  accentColor?: string
  isDarkMode?: boolean
  label?: string
  dividerStyle?: SectionDividerStyle
  colorMode?: ColorMode
}) {
  const lineColor = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const palette = getColorPalette(colorMode, accentColor)

  if (dividerStyle === 'fade') {
    // ── TIER 4: Cinematic widescreen divider ──
    return (
      <div className="relative my-10">
        {/* Wide gradient band */}
        <div className="relative h-12 flex items-center justify-center">
          <div className="absolute inset-0"
            style={{
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 90), opacity: 0.04 }
                : { backgroundImage: `linear-gradient(180deg, transparent, ${palette[0]}60, ${palette[Math.min(1, palette.length - 1)]}80, ${palette[0]}60, transparent)`, opacity: 0.04 }),
            }} />
          {/* Center line */}
          <div className="absolute inset-x-0 top-1/2 h-px"
            style={colorMode !== 'accent'
              ? { ...paletteAnimatedBg(colorMode, accentColor, 90), height: 2, opacity: 0.2 }
              : { backgroundImage: `linear-gradient(90deg, transparent, ${palette[0]}, ${palette[Math.min(1, palette.length - 1)]}, ${palette[0]}, transparent)`, height: 2, opacity: 0.2 }
            } />
          {/* Moving light across center */}
          <div className="absolute inset-x-0 top-1/2 h-px overflow-hidden">
            <div className="absolute h-px w-20"
              style={{
                ...(colorMode !== 'accent'
                  ? { ...paletteAnimatedBg(colorMode, accentColor, 90), opacity: 0.3 }
                  : { backgroundImage: `linear-gradient(90deg, transparent, ${palette[0]}, transparent)`, opacity: 0.3 }),
                animation: `div-fade-sweep 6s ease-in-out infinite${colorMode !== 'accent' ? ', color-shift-flow 12s ease infinite' : ''}`,
              }} />
          </div>
          {/* Label */}
          {label && (
            <div className="relative z-10 px-6">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold"
                style={{ color: `${accentColor}`, textShadow: `0 0 20px ${accentColor}40` }}>
                {label}
              </span>
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes div-fade-sweep { 0%,100% { left: -80px; } 50% { left: calc(100% + 80px); } }
          @keyframes color-shift-flow {
            0% { background-position: 0% 82%; }
            50% { background-position: 100% 19%; }
            100% { background-position: 0% 82%; }
          }
        `}</style>
      </div>
    )
  }

  if (dividerStyle === 'ornament') {
    // ── TIER 3: Luxury ornamental divider ──
    return (
      <div className="flex items-center gap-2 my-8">
        {/* Left ornament line */}
        <div className="flex-1 flex items-center">
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${palette[0]}30)` }} />
          <div className="flex items-center gap-1 px-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${palette[0]}40` }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${palette[Math.min(1, palette.length - 1)]}60` }} />
          </div>
        </div>
        
        {/* Center ornament */}
        <div className="flex items-center gap-2 px-2">
          <svg width="16" height="8" viewBox="0 0 16 8" style={{ opacity: 0.5 }}>
            <path d="M0 4 L4 0 L8 4 L4 8 Z" fill={palette[0]} />
          </svg>
          {label && (
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-1"
              style={{ color: palette[0] }}>
              {label}
            </span>
          )}
          <svg width="16" height="8" viewBox="0 0 16 8" style={{ opacity: 0.5 }}>
            <path d="M8 4 L12 0 L16 4 L12 8 Z" fill={palette[Math.min(1, palette.length - 1)]} />
          </svg>
        </div>

        {/* Right ornament line */}
        <div className="flex-1 flex items-center">
          <div className="flex items-center gap-1 px-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${palette[Math.min(1, palette.length - 1)]}60` }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: `${palette[0]}40` }} />
          </div>
          <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${palette[0]}30, transparent)` }} />
        </div>

        {/* Shimmer on the ornaments */}
        <style jsx>{`
          @keyframes div-ornament-shimmer { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        `}</style>
      </div>
    )
  }

  if (dividerStyle === 'glow') {
    // ── TIER 2: Energy glow divider ──
    return (
      <div className="relative flex items-center gap-3 my-8">
        {/* Left line with glow */}
        <div className="flex-1 relative h-px">
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent, ${palette[0]}25)` }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(90deg, transparent, ${palette[0]}15)`,
            filter: 'blur(3px)', height: 3, top: -1,
          }} />
        </div>
        
        {/* Center energy pulse */}
        <div className="relative flex items-center justify-center w-8 h-8">
          <div className="absolute w-4 h-4 rounded-full"
            style={{
              ...paletteAnimatedBg(colorMode, accentColor, 135),
              boxShadow: `0 0 8px ${palette[0]}50, 0 0 16px ${palette[Math.min(1, palette.length - 1)]}18`,
              animation: colorMode !== 'accent'
                ? 'div-glow-pulse 2s ease-in-out infinite, color-shift-flow 12s ease infinite'
                : 'div-glow-pulse 2s ease-in-out infinite',
            }} />
          <div className="absolute w-6 h-6 rounded-full"
            style={{
              border: `1px solid ${palette[0]}30`,
              animation: 'div-glow-ring 2s ease-in-out infinite',
            }} />
          {label && (
            <span className="absolute -top-5 whitespace-nowrap text-[10px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: `${accentColor}90` }}>
              {label}
            </span>
          )}
        </div>

        {/* Right line with glow */}
        <div className="flex-1 relative h-px">
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${palette[0]}25, transparent)` }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(90deg, ${palette[0]}15, transparent)`,
            filter: 'blur(3px)', height: 3, top: -1,
          }} />
        </div>

        <style jsx>{`
          @keyframes div-glow-pulse { 0%,100% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1); opacity: 1; } }
          @keyframes div-glow-ring { 0%,100% { transform: scale(1); opacity: 0.4; } 50% { transform: scale(1.3); opacity: 0.8; } }
          @keyframes color-shift-flow {
            0% { background-position: 0% 82%; }
            50% { background-position: 100% 19%; }
            100% { background-position: 0% 82%; }
          }
        `}</style>
      </div>
    )
  }

  if (dividerStyle === 'nebula') {
    // ── VOID: Nebula cloud divider ──
    return (
      <div className="relative my-10">
        <div className="relative h-16 flex items-center justify-center overflow-hidden">
          {/* Nebula cloud layers */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 40% 80% at 20% 50%, ${palette[0]}30, transparent 70%),
                radial-gradient(ellipse 35% 90% at 50% 50%, ${palette[1] || palette[0]}25, transparent 60%),
                radial-gradient(ellipse 40% 70% at 80% 50%, ${palette[Math.min(2, palette.length - 1)]}20, transparent 70%)
              `,
              animation: 'div-nebula-breathe 8s ease-in-out infinite',
            }} />
          {/* Central bright strip */}
          <div className="absolute inset-x-0 top-1/2 h-px"
            style={{
              backgroundImage: `linear-gradient(90deg, transparent 5%, ${palette[0]}40 25%, ${palette[1] || palette[0]}60 50%, ${palette[Math.min(2, palette.length - 1)]}40 75%, transparent 95%)`,
              boxShadow: `0 0 8px ${palette[0]}30`,
            }} />
          {/* Drifting star particles */}
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                width: 2, height: 2,
                left: `${10 + i * 11}%`,
                top: `${30 + (i % 3) * 20}%`,
                backgroundColor: palette[i % palette.length],
                boxShadow: `0 0 4px ${palette[i % palette.length]}80`,
                animation: `div-nebula-star ${3 + (i % 2)}s ease-in-out infinite ${i * 0.4}s`,
              }} />
          ))}
          {/* Label */}
          {label && (
            <div className="relative z-10 px-6">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold"
                style={{ 
                  color: palette[0],
                  textShadow: `0 0 15px ${palette[0]}50, 0 0 30px ${palette[0]}20`,
                }}>
                {label}
              </span>
            </div>
          )}
        </div>
        <style jsx>{`
          @keyframes div-nebula-breathe {
            0%, 100% { opacity: 0.7; transform: scaleX(1); }
            50% { opacity: 1; transform: scaleX(1.02); }
          }
          @keyframes div-nebula-star {
            0%, 100% { opacity: 0.2; transform: translateY(0); }
            50% { opacity: 0.8; transform: translateY(-3px); }
          }
        `}</style>
      </div>
    )
  }

  if (dividerStyle === 'tide') {
    // ── SEA: Flowing tide wave divider ──
    return (
      <div className="relative my-10">
        <div className="relative h-12 flex items-center justify-center overflow-hidden">
          {/* Wave path — animated SVG */}
          <svg className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-[200%]" height="24" preserveAspectRatio="none"
            style={{ animation: 'div-tide-flow 6s linear infinite' }}>
            <path d={`M0 12 Q 30 4, 60 12 T 120 12 T 180 12 T 240 12 T 300 12 T 360 12 T 420 12 T 480 12 T 540 12 T 600 12 T 660 12 T 720 12 T 780 12 T 840 12`}
              fill="none" stroke={palette[0]} strokeWidth="1.5" opacity="0.4" />
            <path d={`M0 12 Q 40 2, 80 12 T 160 12 T 240 12 T 320 12 T 400 12 T 480 12 T 560 12 T 640 12 T 720 12 T 800 12`}
              fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1" opacity="0.25" strokeDasharray="4 6" />
          </svg>
          {/* Foam highlights along the wave */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`foam-${i}`} className="absolute rounded-full"
              style={{
                width: 2 + (i % 2),
                height: 2 + (i % 2),
                top: '50%',
                left: `${10 + i * 15}%`,
                transform: 'translateY(-50%)',
                backgroundColor: palette[i % palette.length],
                opacity: 0.3,
                animation: `div-tide-foam 3s ease-in-out infinite ${i * 0.5}s`,
              }} />
          ))}
          {/* Label */}
          {label && (
            <span className="relative z-10 text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-1 rounded-full"
              style={{
                color: palette[0],
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)',
                textShadow: `0 0 8px ${palette[0]}40`,
              }}>
              {label}
            </span>
          )}
        </div>
        <style jsx>{`
          @keyframes div-tide-flow {
            0% { transform: translateX(0) translateY(-50%); }
            100% { transform: translateX(-50%) translateY(-50%); }
          }
          @keyframes div-tide-foam {
            0%, 100% { opacity: 0.15; transform: translateY(-50%) scale(0.8); }
            50% { opacity: 0.5; transform: translateY(calc(-50% - 3px)) scale(1.3); }
          }
        `}</style>
      </div>
    )
  }

  // ── Forest: Roots ──
  if (dividerStyle === 'roots') {
    return (
      <div className="relative my-8" style={{ height: 40 }}>
        {/* Central root system — intertwining paths */}
        <svg className="absolute inset-0" width="100%" height="40" viewBox="0 0 800 40" preserveAspectRatio="none">
          {/* Main root — thick, winding from left to right */}
          <path d="M0,20 C60,12 120,28 200,18 C280,8 340,30 420,20 C500,10 560,28 640,16 C720,24 760,18 800,20"
            fill="none" stroke={`${accentColor}45`} strokeWidth="2.5"
            style={{ animation: 'div-root-grow 2s ease-out forwards' }} />
          {/* Secondary root — thinner, slightly offset */}
          <path d="M0,24 C80,30 140,14 220,22 C300,30 360,12 440,24 C520,32 580,14 660,22 C740,16 780,26 800,22"
            fill="none" stroke={`${accentColor}30`} strokeWidth="1.5"
            style={{ animation: 'div-root-grow 2.5s ease-out forwards 0.3s' }} />
          {/* Thin offshoots going up/down */}
          {[80, 200, 340, 480, 620, 720].map((x, i) => (
            <path key={`offshoot-${i}`}
              d={i % 2 === 0
                ? `M${x},20 C${x + 5},10 ${x + 15},5 ${x + 20},8`
                : `M${x},22 C${x + 5},30 ${x + 15},35 ${x + 20},32`}
              fill="none" stroke={`${palette[i % palette.length]}35`} strokeWidth="1"
              style={{ animation: `div-root-grow 1s ease-out forwards ${0.5 + i * 0.2}s` }} />
          ))}
        </svg>
        {/* Small root node knots — glowing */}
        {[
          { x: '15%', y: '45%' }, { x: '35%', y: '40%' },
          { x: '55%', y: '50%' }, { x: '75%', y: '42%' }, { x: '90%', y: '48%' },
        ].map((pos, i) => (
          <div key={`knot-${i}`} className="absolute"
            style={{
              left: pos.x, top: pos.y,
              width: 5, height: 5,
              borderRadius: '50%',
              backgroundColor: `${palette[i % palette.length]}50`,
              boxShadow: `0 0 6px ${palette[i % palette.length]}30`,
              animation: `div-root-knot-pulse 4s ease-in-out infinite ${i * 0.9}s`,
              transform: 'translate(-50%, -50%)',
            }} />
        ))}
        {/* Optional label */}
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full"
              style={{
                color: `${accentColor}80`,
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
              }}>
              {label}
            </span>
          </div>
        )}
        <style jsx>{`
          @keyframes div-root-grow {
            0% { stroke-dasharray: 2000; stroke-dashoffset: 2000; opacity: 0; }
            10% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes div-root-knot-pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; }
            50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.7; }
          }
        `}</style>
      </div>
    )
  }

  // ── Sky: Breeze ──
  if (dividerStyle === 'breeze') {
    return (
      <div className="relative my-8" style={{ height: 36 }}>
        {/* Flowing wind streaks — horizontal with gentle wave */}
        <svg className="absolute inset-0" width="100%" height="36" viewBox="0 0 800 36" preserveAspectRatio="none">
          {/* Primary breeze line */}
          <path d="M0,18 C80,12 160,24 240,18 C320,12 400,24 480,18 C560,12 640,24 720,18 C760,14 800,18 800,18"
            fill="none" stroke={`${accentColor}40`} strokeWidth="1.5"
            style={{ animation: 'div-breeze-flow 6s ease-in-out infinite' }} />
          {/* Secondary breeze — offset */}
          <path d="M0,20 C100,26 200,14 300,20 C400,26 500,14 600,20 C700,26 770,18 800,20"
            fill="none" stroke={`${accentColor}25`} strokeWidth="1"
            style={{ animation: 'div-breeze-flow 8s ease-in-out infinite 1s' }} />
          {/* Thin wispy streaks */}
          <path d="M100,16 C200,13 300,19 400,16" fill="none" stroke={`${accentColor}15`} strokeWidth="0.5" />
          <path d="M400,20 C500,23 600,17 700,20" fill="none" stroke={`${accentColor}15`} strokeWidth="0.5" />
        </svg>
        {/* Floating wind particles */}
        {[
          { x: '10%', y: '30%' }, { x: '25%', y: '55%' }, { x: '42%', y: '35%' },
          { x: '58%', y: '60%' }, { x: '73%', y: '40%' }, { x: '88%', y: '50%' },
        ].map((pos, i) => (
          <div key={`wind-dot-${i}`} className="absolute"
            style={{
              left: pos.x, top: pos.y,
              width: 3 + (i % 2),
              height: 1.5,
              borderRadius: '50%',
              backgroundColor: `${palette[i % palette.length]}50`,
              boxShadow: `0 0 4px ${palette[i % palette.length]}30`,
              animation: `div-breeze-particle ${3 + i * 0.5}s ease-in-out infinite ${i * 0.4}s`,
              transform: 'translate(-50%, -50%)',
            }} />
        ))}
        {/* Optional label */}
        {label && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-0.5 rounded-full"
              style={{
                color: `${accentColor}80`,
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
              }}>
              {label}
            </span>
          </div>
        )}
        <style jsx>{`
          @keyframes div-breeze-flow {
            0% { stroke-dasharray: 12 8; stroke-dashoffset: 0; }
            50% { stroke-dasharray: 16 6; stroke-dashoffset: -20; }
            100% { stroke-dasharray: 12 8; stroke-dashoffset: -40; }
          }
          @keyframes div-breeze-particle {
            0%, 100% { transform: translate(-50%, -50%) translateX(0); opacity: 0.3; }
            50% { transform: translate(-50%, -50%) translateX(15px); opacity: 0.7; }
          }
        `}</style>
      </div>
    )
  }

  // ── TIER 1: Basic line ──
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${lineColor} 50%, transparent 100%)` }} />
      {label && (
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold"
          style={{ color: `${accentColor}60` }}>
          {label}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${lineColor} 50%, transparent 100%)` }} />
    </div>
  )
}

// =============================================================================
// Header Frame Overlay — escalating tiers  
// none → minimal (accent line) → ornate (gold filigree corners + jewels)  
// → mythic (animated runic border with sequential glow) → neon (electric arcs)
// =============================================================================

function HeaderFrameOverlay({
  frameStyle = 'none' as HeaderFrameStyle,
  accentColor = '#8661ff',
  isDarkMode = true,
  colorMode = 'accent' as ColorMode,
}: {
  frameStyle?: HeaderFrameStyle
  accentColor?: string
  isDarkMode?: boolean
  colorMode?: ColorMode
}) {
  const palette = getColorPalette(colorMode, accentColor)
  if (frameStyle === 'none') return null

  switch (frameStyle) {
    case 'minimal':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20">
          <div className="absolute inset-0 rounded-2xl"
            style={{ border: `2px solid ${accentColor}50` }} />
          {/* Subtle inner line */}
          <div className="absolute rounded-2xl"
            style={{
              inset: '3px',
              border: `1px solid ${accentColor}15`,
            }} />
        </div>
      )

    case 'ornate':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20">
          {/* Base border with gradient */}
          <div className="absolute inset-0 rounded-2xl"
            style={{ border: `1.5px solid ${accentColor}35` }} />
          {/* Corner filigree - elaborate SVGs */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(corner => {
            const isTop = corner.startsWith('t')
            const isLeft = corner.endsWith('l')
            return (
              <svg key={corner} className="absolute" width="48" height="48" viewBox="0 0 48 48"
                style={{
                  [isTop ? 'top' : 'bottom']: '0',
                  [isLeft ? 'left' : 'right']: '0',
                  transform: `${!isLeft ? 'scaleX(-1)' : ''} ${!isTop ? 'scaleY(-1)' : ''}`,
                  filter: `drop-shadow(0 0 4px ${accentColor}60)`,
                }}>
                {/* Main curl */}
                <path d="M6 42 Q6 6 42 6" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                {/* Inner curl */}
                <path d="M10 38 Q10 12 36 10" fill="none" stroke={accentColor} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
                {/* Decorative inner spiral */}
                <path d="M14 34 Q14 18 30 14" fill="none" stroke={accentColor} strokeWidth="0.8" strokeLinecap="round" opacity="0.25" />
                {/* Corner jewel */}
                <circle cx="6" cy="42" r="3" fill={accentColor} opacity="0.6" />
                <circle cx="6" cy="42" r="1.5" fill={isDarkMode ? 'white' : accentColor} opacity={isDarkMode ? 0.5 : 0.3} />
                {/* Leaf accent */}
                <ellipse cx="18" cy="36" rx="4" ry="1.5" fill={accentColor} opacity="0.15" transform="rotate(-40 18 36)" />
              </svg>
            )
          })}
          {/* Top center ornament */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="w-4 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50)` }} />
            <div className="w-4 h-4 rotate-45 rounded-sm"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}88)`,
                boxShadow: `0 0 12px ${accentColor}80, 0 0 24px ${accentColor}30`,
              }} />
            <div className="w-4 h-px" style={{ background: `linear-gradient(90deg, ${accentColor}50, transparent)` }} />
          </div>
          {/* Bottom center pendant */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div className="w-2 h-2 rotate-45 rounded-sm" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
          </div>
        </div>
      )

    case 'mythic':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-hidden">
          {/* Animated border glow */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${accentColor}60`,
              boxShadow: `0 0 20px ${accentColor}25, inset 0 0 20px ${accentColor}10`,
              animation: 'hdr-mythic-pulse 4s ease-in-out infinite',
            }} />
          {/* Sequential rune marks - top row */}
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={`t${i}`} className="absolute"
              style={{
                top: '6px', left: `${12 + i * 12}%`,
                width: 2, height: 8, borderRadius: 1,
                backgroundColor: palette[i % palette.length],
                animation: `hdr-rune-sequence 4s ease-in-out infinite ${i * 0.3}s`,
              }} />
          ))}
          {/* Sequential rune marks - bottom row */}
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={`b${i}`} className="absolute"
              style={{
                bottom: '6px', left: `${12 + i * 12}%`,
                width: 2, height: 8, borderRadius: 1,
                backgroundColor: palette[(i + 3) % palette.length],
                animation: `hdr-rune-sequence 4s ease-in-out infinite ${(i * 0.3) + 0.15}s`,
              }} />
          ))}
          {/* Side rune accents */}
          {[0, 1, 2].map(i => (
            <div key={`l${i}`} className="absolute"
              style={{
                left: '6px', top: `${25 + i * 25}%`,
                width: 8, height: 2, borderRadius: 1,
                backgroundColor: palette[i % palette.length],
                animation: `hdr-rune-sequence 4s ease-in-out infinite ${i * 0.4 + 1}s`,
              }} />
          ))}
          {[0, 1, 2].map(i => (
            <div key={`r${i}`} className="absolute"
              style={{
                right: '6px', top: `${25 + i * 25}%`,
                width: 8, height: 2, borderRadius: 1,
                backgroundColor: palette[(i + 1) % palette.length],
                animation: `hdr-rune-sequence 4s ease-in-out infinite ${i * 0.4 + 1.2}s`,
              }} />
          ))}
          {/* Traveling light along border */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute w-16 h-16"
              style={{
                background: `radial-gradient(circle, ${accentColor}60, transparent 70%)`,
                filter: 'blur(6px)',
                animation: 'hdr-light-travel 6s linear infinite',
              }} />
          </div>
          <style jsx>{`
            @keyframes hdr-mythic-pulse {
              0%, 100% { box-shadow: 0 0 20px ${accentColor}25, inset 0 0 20px ${accentColor}10; }
              50% { box-shadow: 0 0 35px ${accentColor}40, inset 0 0 30px ${accentColor}20; }
            }
            @keyframes hdr-rune-sequence {
              0%, 60%, 100% { opacity: 0.15; transform: scale(1); }
              30% { opacity: 0.9; transform: scale(1.3); }
            }
            @keyframes hdr-light-travel {
              0% { top: -16px; left: -16px; }
              25% { top: -16px; left: calc(100% - 16px); }
              50% { top: calc(100% - 16px); left: calc(100% - 16px); }
              75% { top: calc(100% - 16px); left: -16px; }
              100% { top: -16px; left: -16px; }
            }
          `}</style>
        </div>
      )

    case 'neon':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20">
          {/* Flowing color underlay for neon border */}
          {colorMode !== 'accent' && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 rounded-2xl"
                style={{
                  ...paletteAnimatedBg(colorMode, accentColor, 124),
                  opacity: 0.06,
                }} />
            </div>
          )}
          {/* Primary neon border */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${palette[0]}90`,
              boxShadow: `
                0 0 6px ${palette[0]}40, 
                0 0 14px ${palette[1] || palette[0]}20, 
                0 0 28px ${palette[Math.min(2, palette.length - 1)]}0a,
                inset 0 0 6px ${palette[0]}10,
                inset 0 0 14px ${palette[1] || palette[0]}05`,
              animation: 'hdr-neon-flicker 4s ease-in-out infinite',
            }} />
          {/* Secondary inner line */}
          <div className="absolute rounded-2xl"
            style={{
              inset: '4px',
              border: `1px solid ${palette[1] || palette[0]}30`,
              boxShadow: `inset 0 0 10px ${palette[1] || palette[0]}10`,
            }} />
          {/* Electric arc effects at corners */}
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="absolute w-6 h-6"
              style={{
                top: i < 2 ? '-2px' : 'auto',
                bottom: i >= 2 ? '-2px' : 'auto',
                left: i % 2 === 0 ? '-2px' : 'auto',
                right: i % 2 === 1 ? '-2px' : 'auto',
              }}>
              <div className="w-full h-full rounded-full"
                style={{
                  background: `radial-gradient(circle, ${palette[i % palette.length]}40, transparent 70%)`,
                  animation: `hdr-arc-pulse ${1.5 + i * 0.3}s ease-in-out infinite ${i * 0.2}s`,
                }} />
            </div>
          ))}
          {/* Sweeping neon light */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute h-full w-20"
              style={{
                ...(colorMode !== 'accent'
                  ? { ...paletteAnimatedBg(colorMode, accentColor, 90), opacity: 0.10 }
                  : { backgroundImage: `linear-gradient(90deg, transparent, ${palette[0]}cc, ${palette[Math.min(1, palette.length - 1)]}, ${palette[Math.min(2, palette.length - 1)]}cc, transparent)`, opacity: 0.10 }),
                animation: `hdr-neon-sweep 3s ease-in-out infinite${colorMode !== 'accent' ? ', color-shift-flow 12s ease infinite' : ''}`,
              }} />
          </div>
          <style jsx>{`
            @keyframes hdr-neon-flicker {
              0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { 
                opacity: 1;
                box-shadow: 0 0 6px ${accentColor}40, 0 0 14px ${accentColor}20, 0 0 28px ${accentColor}0a, inset 0 0 6px ${accentColor}10, inset 0 0 14px ${accentColor}05;
              }
              20%, 24%, 55% { 
                opacity: 0.85;
                box-shadow: 0 0 3px ${accentColor}30, 0 0 8px ${accentColor}10, inset 0 0 3px ${accentColor}08;
              }
            }
            @keyframes hdr-arc-pulse {
              0%, 100% { opacity: 0.15; transform: scale(0.8); }
              50% { opacity: 0.5; transform: scale(1.2); }
            }
            @keyframes hdr-neon-sweep {
              0% { left: -80px; }
              100% { left: calc(100% + 80px); }
            }
            @keyframes color-shift-flow {
              0% { background-position: 0% 82%; }
              50% { background-position: 100% 19%; }
              100% { background-position: 0% 82%; }
            }
          `}</style>
        </div>
      )

    case 'constellation':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-hidden">
          {/* Subtle border */}
          <div className="absolute inset-0 rounded-2xl"
            style={{ border: `1px solid ${palette[0]}25` }} />
          {/* Constellation star points along border */}
          {(() => {
            // Star positions around the header perimeter (normalised 0-1 along path)
            const stars: Array<{ x: string; y: string; size: number; delay: number }> = [
              { x: '12%', y: '6px', size: 3, delay: 0 },
              { x: '30%', y: '4px', size: 2.5, delay: 0.4 },
              { x: '50%', y: '5px', size: 3.5, delay: 0.8 },
              { x: '72%', y: '4px', size: 2, delay: 1.2 },
              { x: '88%', y: '6px', size: 3, delay: 1.6 },
              // Right side
              { x: 'calc(100% - 6px)', y: '25%', size: 2.5, delay: 2.0 },
              { x: 'calc(100% - 5px)', y: '50%', size: 3, delay: 2.4 },
              { x: 'calc(100% - 6px)', y: '75%', size: 2, delay: 2.8 },
              // Bottom
              { x: '85%', y: 'calc(100% - 5px)', size: 2.5, delay: 3.2 },
              { x: '60%', y: 'calc(100% - 6px)', size: 3, delay: 3.6 },
              { x: '35%', y: 'calc(100% - 4px)', size: 2.5, delay: 4.0 },
              { x: '15%', y: 'calc(100% - 5px)', size: 3, delay: 4.4 },
              // Left side
              { x: '5px', y: '70%', size: 2, delay: 4.8 },
              { x: '6px', y: '45%', size: 3, delay: 5.2 },
              { x: '5px', y: '20%', size: 2.5, delay: 5.6 },
            ]
            return stars.map((star, i) => (
              <div key={i} className="absolute rounded-full"
                style={{
                  left: star.x,
                  top: star.y,
                  width: star.size,
                  height: star.size,
                  backgroundColor: palette[i % palette.length],
                  boxShadow: `0 0 ${star.size * 2}px ${palette[i % palette.length]}80, 0 0 ${star.size * 4}px ${palette[i % palette.length]}30`,
                  animation: `hdr-constellation-pulse 3s ease-in-out infinite ${star.delay}s`,
                  transform: 'translate(-50%, -50%)',
                }} />
            ))
          })()}
          {/* SVG constellation lines connecting star pairs */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            {/* Top edge lines */}
            <line x1="12%" y1="6" x2="30%" y2="4" stroke={palette[0]} strokeWidth="0.5" opacity="0.2" strokeDasharray="4 3" />
            <line x1="30%" y1="4" x2="50%" y2="5" stroke={palette[1] || palette[0]} strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4" />
            <line x1="50%" y1="5" x2="72%" y2="4" stroke={palette[0]} strokeWidth="0.5" opacity="0.2" strokeDasharray="4 3" />
            <line x1="72%" y1="4" x2="88%" y2="6" stroke={palette[1] || palette[0]} strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4" />
            {/* Corner connections */}
            <line x1="12%" y1="6" x2="2%" y2="20%" stroke={palette[0]} strokeWidth="0.5" opacity="0.12" strokeDasharray="5 4" />
            <line x1="88%" y1="6" x2="98%" y2="25%" stroke={palette[0]} strokeWidth="0.5" opacity="0.12" strokeDasharray="5 4" />
          </svg>
          {/* Traveling light along constellations */}
          <div className="absolute"
            style={{
              width: 4, height: 4,
              borderRadius: '50%',
              backgroundColor: palette[0],
              boxShadow: `0 0 8px ${palette[0]}, 0 0 16px ${palette[0]}60`,
              animation: 'hdr-constellation-travel 8s linear infinite',
            }} />
          <style jsx>{`
            @keyframes hdr-constellation-pulse {
              0%, 70%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
              35% { opacity: 1; transform: translate(-50%, -50%) scale(1.4); }
            }
            @keyframes hdr-constellation-travel {
              0% { top: 6px; left: 12%; }
              15% { top: 4px; left: 30%; }
              30% { top: 5px; left: 50%; }
              45% { top: 4px; left: 72%; }
              60% { top: 6px; left: 88%; }
              75% { top: 25%; left: calc(100% - 6px); }
              90% { top: 50%; left: calc(100% - 5px); }
              100% { top: 6px; left: 12%; }
            }
          `}</style>
        </div>
      )

    case 'coral':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-hidden">
          {/* Animated underwater glow border */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${palette[0]}40`,
              boxShadow: `inset 0 0 20px ${palette[0]}15, 0 0 12px ${palette[0]}20`,
              animation: 'hdr-coral-border-pulse 5s ease-in-out infinite',
            }} />

          {/* === TOP CORAL REEF — lush branching from both corners === */}
          <svg className="absolute top-0 left-0 w-full" height="70" viewBox="0 0 400 70" preserveAspectRatio="none" style={{ transform: 'scaleY(-1)' }}>
            {/* Left coral cluster — large fan coral */}
            <path d="M0,70 Q5,40 15,25 Q20,15 12,5" fill="none" stroke={palette[0]} strokeWidth="3" opacity="0.6" />
            <path d="M0,70 Q12,35 25,20 Q32,10 28,2" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.5" />
            <path d="M8,70 Q18,42 10,28 Q5,18 15,8" fill="none" stroke={`${palette[Math.min(1, palette.length - 1)]}`} strokeWidth="2" opacity="0.45" />
            <path d="M18,70 Q28,38 20,22 Q15,12 22,3" fill="none" stroke={palette[0]} strokeWidth="1.5" opacity="0.4" />
            {/* Left coral polyp tips — glowing dots */}
            <circle cx="12" cy="5" r="3" fill={palette[0]} opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="28" cy="2" r="2.5" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
            </circle>
            <circle cx="15" cy="8" r="2" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.8s" repeatCount="indefinite" begin="1s" />
            </circle>
            <circle cx="22" cy="3" r="2" fill={palette[0]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" begin="1.5s" />
            </circle>
            {/* Center top — small accent tendrils */}
            <path d="M180,70 Q178,55 182,45 Q185,38 180,32" fill="none" stroke={palette[0]} strokeWidth="1.5" opacity="0.3" />
            <path d="M200,70 Q202,52 198,42" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1" opacity="0.25" />
            <path d="M220,70 Q222,55 218,45 Q215,38 220,32" fill="none" stroke={palette[0]} strokeWidth="1.5" opacity="0.3" />
            <circle cx="180" cy="32" r="1.5" fill={palette[0]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" begin="2s" />
            </circle>
            {/* Right coral cluster — branching */}
            <path d="M400,70 Q395,38 385,22 Q380,12 388,4" fill="none" stroke={palette[0]} strokeWidth="3" opacity="0.6" />
            <path d="M400,70 Q390,35 375,18 Q368,8 372,0" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.5" />
            <path d="M392,70 Q382,40 390,25 Q395,15 385,6" fill="none" stroke={`${palette[Math.min(1, palette.length - 1)]}`} strokeWidth="2" opacity="0.45" />
            <path d="M382,70 Q372,38 380,20 Q385,10 378,2" fill="none" stroke={palette[0]} strokeWidth="1.5" opacity="0.4" />
            <circle cx="388" cy="4" r="3" fill={palette[0]} opacity="0.7">
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3.2s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="372" cy="0" r="2.5" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" begin="0.8s" />
            </circle>
            <circle cx="385" cy="6" r="2" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite" begin="1.2s" />
            </circle>
          </svg>

          {/* === LEFT SIDE CORAL — organic growth from wall inward === */}
          <svg className="absolute top-0 left-0 h-full" width="50" viewBox="0 0 50 300" preserveAspectRatio="none" style={{ transform: 'scaleX(-1)' }}>
            <path d="M50,55 Q30,50 20,40 Q12,30 18,20" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.55" />
            <path d="M50,58 Q35,55 25,48 Q18,42 22,34" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1.8" opacity="0.4" />
            <circle cx="18" cy="20" r="2.5" fill={palette[0]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite" />
            </circle>
            <path d="M50,120 Q28,115 18,105 Q10,95 16,82" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.5" />
            <path d="M50,125 Q32,120 22,112 Q15,105 20,95" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1.5" opacity="0.4" />
            <circle cx="16" cy="82" r="2.5" fill={palette[0]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite" begin="1s" />
            </circle>
            <path d="M50,200 Q25,195 15,185 Q8,175 14,162" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="2" opacity="0.45" />
            <circle cx="14" cy="162" r="2" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.55">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.8s" repeatCount="indefinite" begin="2s" />
            </circle>
            <path d="M50,270 Q30,265 22,258 Q16,250 20,240" fill="none" stroke={palette[0]} strokeWidth="2" opacity="0.4" />
            <circle cx="20" cy="240" r="2" fill={palette[0]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.6;0.3" dur="4s" repeatCount="indefinite" begin="1.5s" />
            </circle>
          </svg>

          {/* === RIGHT SIDE CORAL — growth from wall inward === */}
          <svg className="absolute top-0 right-0 h-full" width="50" viewBox="0 0 50 300" preserveAspectRatio="none" style={{ transform: 'scaleX(-1)' }}>
            <path d="M0,70 Q20,65 30,55 Q38,45 32,35" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.55" />
            <path d="M0,74 Q15,70 25,62 Q32,55 28,45" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1.8" opacity="0.4" />
            <circle cx="32" cy="35" r="2.5" fill={palette[0]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
            </circle>
            <path d="M0,145 Q22,140 32,130 Q40,120 34,108" fill="none" stroke={palette[0]} strokeWidth="2.5" opacity="0.5" />
            <circle cx="34" cy="108" r="2.5" fill={palette[0]} opacity="0.6">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="4s" repeatCount="indefinite" begin="1.5s" />
            </circle>
            <path d="M0,225 Q18,220 28,212 Q35,205 30,195" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="2" opacity="0.45" />
            <circle cx="30" cy="195" r="2" fill={palette[Math.min(1, palette.length - 1)]} opacity="0.55">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.2s" repeatCount="indefinite" begin="2.5s" />
            </circle>
          </svg>

          {/* === BOTTOM CORAL — reef bed === */}
          <svg className="absolute bottom-0 left-0 w-full" height="50" viewBox="0 0 400 50" preserveAspectRatio="none">
            <path d="M30,50 Q35,35 25,22 Q20,15 28,8" fill="none" stroke={palette[0]} strokeWidth="2" opacity="0.45" />
            <path d="M60,50 Q55,38 62,28 Q65,22 58,15" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1.5" opacity="0.35" />
            <path d="M340,50 Q345,35 338,25 Q335,18 342,10" fill="none" stroke={palette[0]} strokeWidth="2" opacity="0.45" />
            <path d="M370,50 Q365,38 372,26 Q375,18 368,12" fill="none" stroke={palette[Math.min(1, palette.length - 1)]} strokeWidth="1.5" opacity="0.35" />
            <circle cx="28" cy="8" r="2" fill={palette[0]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" begin="0.8s" />
            </circle>
            <circle cx="342" cy="10" r="2" fill={palette[0]} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.5s" repeatCount="indefinite" begin="1.2s" />
            </circle>
          </svg>

          {/* Rising bubbles with glow — larger, more visible */}
          {[
            { x: '6%', y: '85%', size: 6, dur: 5, delay: 0 },
            { x: '10%', y: '70%', size: 4.5, dur: 6, delay: 1.2 },
            { x: '4%', y: '50%', size: 5, dur: 5.5, delay: 2.5 },
            { x: '92%', y: '80%', size: 5.5, dur: 5, delay: 0.5 },
            { x: '96%', y: '60%', size: 4, dur: 6.5, delay: 1.8 },
            { x: '90%', y: '40%', size: 6, dur: 5, delay: 3 },
            { x: '50%', y: '90%', size: 3.5, dur: 7, delay: 2 },
            { x: '15%', y: '30%', size: 4, dur: 5.5, delay: 3.5 },
            { x: '85%', y: '25%', size: 4.5, dur: 6, delay: 0.8 },
          ].map((b, i) => (
            <div key={`coral-bubble-${i}`} className="absolute rounded-full"
              style={{
                left: b.x, top: b.y,
                width: b.size, height: b.size,
                border: `1px solid ${palette[i % palette.length]}60`,
                backgroundColor: `${palette[i % palette.length]}15`,
                boxShadow: `0 0 ${b.size}px ${palette[i % palette.length]}30`,
                animation: `hdr-coral-bubble ${b.dur}s ease-in-out infinite ${b.delay}s`,
              }} />
          ))}

          {/* Underwater caustic shimmer along top */}
          <div className="absolute top-0 left-0 right-0 h-16"
            style={{
              background: `linear-gradient(180deg, ${palette[0]}12 0%, transparent 100%)`,
              animation: 'hdr-coral-caustic 4s ease-in-out infinite',
            }} />

          {/* Traveling bioluminescent light along the coral */}
          <div className="absolute"
            style={{
              width: 5, height: 5,
              borderRadius: '50%',
              backgroundColor: palette[0],
              boxShadow: `0 0 10px ${palette[0]}, 0 0 20px ${palette[0]}80, 0 0 30px ${palette[0]}40`,
              animation: 'hdr-coral-travel 12s ease-in-out infinite',
            }} />

          <style jsx>{`
            @keyframes hdr-coral-bubble {
              0%, 100% { opacity: 0.2; transform: translateY(0) scale(0.8); }
              30% { opacity: 0.7; transform: translateY(-12px) scale(1.15); }
              60% { opacity: 0.5; transform: translateY(-6px) scale(1.05); }
            }
            @keyframes hdr-coral-border-pulse {
              0%, 100% { box-shadow: inset 0 0 20px ${palette[0]}15, 0 0 12px ${palette[0]}20; }
              50% { box-shadow: inset 0 0 30px ${palette[0]}25, 0 0 20px ${palette[0]}35; }
            }
            @keyframes hdr-coral-caustic {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 0.9; }
            }
            @keyframes hdr-coral-travel {
              0% { top: 70px; left: 8px; opacity: 0; }
              5% { opacity: 1; }
              20% { top: 50px; left: 15px; }
              35% { top: 20px; left: 10px; }
              50% { top: 6px; left: 50%; }
              65% { top: 20px; left: calc(100% - 15px); }
              80% { top: 60px; left: calc(100% - 10px); }
              95% { opacity: 1; }
              100% { top: 80px; left: calc(100% - 8px); opacity: 0; }
            }
          `}</style>
        </div>
      )

    case 'vines':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
          {/* Animated glowing border — organic feel */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${palette[0]}35`,
              boxShadow: `inset 0 0 15px ${palette[0]}10, 0 0 8px ${palette[0]}15`,
              animation: 'hdr-vine-border-breathe 6s ease-in-out infinite',
            }} />

          {/* === TOP-LEFT VINE — thick main vine curling down with branches === */}
          <svg className="absolute top-0 left-0" width="90" height="100%" viewBox="0 0 90 400" preserveAspectRatio="none">
            {/* Main vine trunk */}
            <path d="M0,0 C12,25 6,55 18,85 C28,110 8,140 14,175 C20,210 6,240 12,280 C16,310 8,345 12,380 C14,395 10,400 10,400"
              fill="none" stroke={`${palette[0]}70`} strokeWidth="3.5"
              style={{ animation: 'hdr-vine-grow 3s ease-out forwards' }} />
            {/* Secondary thinner vine */}
            <path d="M0,10 C8,30 14,50 10,80 C6,105 16,130 12,160 C8,190 14,220 10,250"
              fill="none" stroke={`${palette[0]}45`} strokeWidth="2"
              style={{ animation: 'hdr-vine-grow 4s ease-out forwards 0.5s' }} />
            {/* Leaves — larger, more opaque */}
            {[35, 80, 130, 180, 235, 290, 350].map((y, j) => {
              const leafColor = palette[j % palette.length]
              const side = j % 2 === 0 ? 1 : -1
              const cx = 12 + side * 12
              return (
                <g key={`vine-leaf-l-${j}`} transform={`translate(${cx}, ${y})`}
                  style={{ animation: `hdr-vine-leaf-pop 0.6s ease-out forwards ${0.8 + j * 0.35}s`, opacity: 0 }}>
                  {/* Leaf shape — pointed oval */}
                  <ellipse cx={side * 8} cy="0" rx="10" ry="5"
                    fill={`${leafColor}50`}
                    stroke={`${leafColor}70`}
                    strokeWidth="0.8"
                    transform={`rotate(${side * 25})`} />
                  {/* Leaf vein */}
                  <line x1="0" y1="0" x2={side * 14} y2="0"
                    stroke={`${leafColor}40`} strokeWidth="0.5"
                    transform={`rotate(${side * 25})`} />
                  {/* Glow dot at base */}
                  <circle cx="0" cy="0" r="1.5"
                    fill={leafColor} opacity="0.6">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2.5 + j * 0.3}s`} repeatCount="indefinite" begin={`${j * 0.5}s`} />
                  </circle>
                </g>
              )
            })}
            {/* Curling tendrils */}
            <path d="M18,85 C28,78 35,82 30,70" fill="none" stroke={`${palette[0]}40`} strokeWidth="1" />
            <path d="M14,175 C24,168 32,172 28,160" fill="none" stroke={`${palette[0]}35`} strokeWidth="1" />
            <path d="M12,280 C22,273 30,277 26,265" fill="none" stroke={`${palette[0]}35`} strokeWidth="1" />
          </svg>

          {/* === TOP-RIGHT VINE — mirror === */}
          <svg className="absolute top-0 right-0" width="90" height="100%" viewBox="0 0 90 400" preserveAspectRatio="none">
            <path d="M90,0 C78,20 84,50 72,80 C62,105 82,135 76,170 C70,205 84,235 78,275 C74,305 82,340 78,380 C76,395 80,400 80,400"
              fill="none" stroke={`${palette[0]}70`} strokeWidth="3.5"
              style={{ animation: 'hdr-vine-grow 3.5s ease-out forwards 0.2s' }} />
            <path d="M90,15 C82,35 76,55 80,80 C84,108 74,135 78,165 C82,195 76,225 80,255"
              fill="none" stroke={`${palette[0]}45`} strokeWidth="2"
              style={{ animation: 'hdr-vine-grow 4.5s ease-out forwards 0.7s' }} />
            {[42, 90, 145, 200, 255, 310, 365].map((y, j) => {
              const leafColor = palette[(j + 1) % palette.length]
              const side = j % 2 === 0 ? -1 : 1
              const cx = 78 + side * 12
              return (
                <g key={`vine-leaf-r-${j}`} transform={`translate(${cx}, ${y})`}
                  style={{ animation: `hdr-vine-leaf-pop 0.6s ease-out forwards ${1 + j * 0.35}s`, opacity: 0 }}>
                  <ellipse cx={side * 8} cy="0" rx="10" ry="5"
                    fill={`${leafColor}50`}
                    stroke={`${leafColor}70`}
                    strokeWidth="0.8"
                    transform={`rotate(${side * -25})`} />
                  <line x1="0" y1="0" x2={side * 14} y2="0"
                    stroke={`${leafColor}40`} strokeWidth="0.5"
                    transform={`rotate(${side * -25})`} />
                  <circle cx="0" cy="0" r="1.5"
                    fill={leafColor} opacity="0.6">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2.5 + j * 0.3}s`} repeatCount="indefinite" begin={`${j * 0.5 + 0.3}s`} />
                  </circle>
                </g>
              )
            })}
            <path d="M72,80 C62,73 55,77 60,65" fill="none" stroke={`${palette[0]}40`} strokeWidth="1" />
            <path d="M76,170 C66,163 58,167 62,155" fill="none" stroke={`${palette[0]}35`} strokeWidth="1" />
          </svg>

          {/* === TOP EDGE — connecting vine garland === */}
          <svg className="absolute top-0 left-0 right-0" width="100%" height="28" viewBox="0 0 400 28" preserveAspectRatio="none">
            <path d="M0,4 C30,12 60,6 90,10 C120,14 150,5 180,8 C210,11 240,4 270,9 C300,14 330,6 360,10 C380,12 400,5 400,5"
              fill="none" stroke={`${palette[0]}55`} strokeWidth="2.5"
              style={{ animation: 'hdr-vine-grow 2.5s ease-out forwards 0.3s' }} />
            <path d="M0,8 C45,15 90,4 135,12 C180,18 225,6 270,14 C315,18 360,8 400,10"
              fill="none" stroke={`${palette[0]}35`} strokeWidth="1.5"
              style={{ animation: 'hdr-vine-grow 3s ease-out forwards 0.8s' }} />
            {/* Hanging mini-leaves from top garland */}
            {[60, 140, 200, 260, 340].map((x, i) => (
              <g key={`top-leaf-${i}`}
                style={{ animation: `hdr-vine-sway ${3 + i * 0.3}s ease-in-out infinite ${i * 0.5}s` }}>
                <ellipse cx={x} cy={14 + (i % 2) * 3} rx="5" ry="3"
                  fill={`${palette[i % palette.length]}45`}
                  stroke={`${palette[i % palette.length]}60`}
                  strokeWidth="0.5"
                  transform={`rotate(${85 + (i % 2) * 10}, ${x}, ${14 + (i % 2) * 3})`} />
              </g>
            ))}
          </svg>

          {/* === BOTTOM EDGE — root tendrils === */}
          <svg className="absolute bottom-0 left-0 right-0" width="100%" height="22" viewBox="0 0 400 22" preserveAspectRatio="none">
            <path d="M0,18 C40,10 80,16 120,11 C160,6 200,14 240,9 C280,4 320,12 360,8 C380,6 400,12 400,12"
              fill="none" stroke={`${palette[0]}45`} strokeWidth="2"
              style={{ animation: 'hdr-vine-grow 3s ease-out forwards 0.6s' }} />
          </svg>

          {/* Flowering blossoms — the epic touch */}
          {[
            { x: '8%', y: '12%', size: 10 },
            { x: '90%', y: '18%', size: 9 },
            { x: '6%', y: '50%', size: 8 },
            { x: '92%', y: '55%', size: 9 },
            { x: '7%', y: '82%', size: 8 },
            { x: '91%', y: '78%', size: 10 },
          ].map((flower, i) => {
            const flowerColor = palette[(i + 2) % palette.length]
            return (
              <div key={`bloom-${i}`} className="absolute"
                style={{
                  left: flower.x, top: flower.y,
                  width: flower.size, height: flower.size,
                  transform: 'translate(-50%, -50%)',
                }}>
                {/* Petal glow */}
                <div className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: flowerColor,
                    boxShadow: `0 0 ${flower.size}px ${flowerColor}60, 0 0 ${flower.size * 2}px ${flowerColor}30`,
                    animation: `hdr-vine-bud-bloom 4s ease-in-out infinite ${i * 0.8}s`,
                  }} />
              </div>
            )
          })}

          {/* Traveling bioluminescent sap along the vines */}
          <div className="absolute"
            style={{
              width: 4, height: 4,
              borderRadius: '50%',
              backgroundColor: palette[0],
              boxShadow: `0 0 8px ${palette[0]}, 0 0 16px ${palette[0]}80`,
              animation: 'hdr-vine-sap-travel 10s ease-in-out infinite',
            }} />
          <div className="absolute"
            style={{
              width: 3, height: 3,
              borderRadius: '50%',
              backgroundColor: palette[Math.min(1, palette.length - 1)],
              boxShadow: `0 0 6px ${palette[Math.min(1, palette.length - 1)]}, 0 0 12px ${palette[Math.min(1, palette.length - 1)]}60`,
              animation: 'hdr-vine-sap-travel-2 12s ease-in-out infinite 3s',
            }} />

          <style jsx>{`
            @keyframes hdr-vine-grow {
              0% { stroke-dasharray: 2000; stroke-dashoffset: 2000; opacity: 0; }
              10% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 1; }
            }
            @keyframes hdr-vine-leaf-pop {
              0% { opacity: 0; transform: scale(0) rotate(-20deg); }
              60% { transform: scale(1.15) rotate(5deg); }
              100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            @keyframes hdr-vine-sway {
              0%, 100% { transform: rotate(0deg); }
              50% { transform: rotate(5deg); }
            }
            @keyframes hdr-vine-bud-bloom {
              0%, 100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.2; }
              25% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
              50% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
              75% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.7; }
            }
            @keyframes hdr-vine-border-breathe {
              0%, 100% { box-shadow: inset 0 0 15px ${palette[0]}10, 0 0 8px ${palette[0]}15; }
              50% { box-shadow: inset 0 0 25px ${palette[0]}20, 0 0 15px ${palette[0]}25; }
            }
            @keyframes hdr-vine-sap-travel {
              0% { top: 0; left: 10px; opacity: 0; }
              5% { opacity: 1; }
              15% { top: 25%; left: 18px; }
              30% { top: 50%; left: 12px; }
              45% { top: 75%; left: 16px; }
              55% { top: 100%; left: 10px; opacity: 0; }
              100% { top: 100%; left: 10px; opacity: 0; }
            }
            @keyframes hdr-vine-sap-travel-2 {
              0% { top: 0; right: 10px; left: auto; opacity: 0; }
              5% { opacity: 1; }
              15% { top: 20%; right: 18px; }
              30% { top: 45%; right: 12px; }
              45% { top: 70%; right: 16px; }
              55% { top: 95%; right: 10px; opacity: 0; }
              100% { top: 95%; right: 10px; opacity: 0; }
            }
          `}</style>
        </div>
      )

    case 'aurora':
      return (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-hidden">
          {/* Warm glowing border */}
          <div className="absolute inset-0 rounded-2xl"
            style={{
              border: `2px solid ${palette[0]}35`,
              boxShadow: `inset 0 0 20px ${palette[0]}10, 0 0 12px ${palette[0]}18`,
              animation: 'hdr-aurora-border-pulse 5s ease-in-out infinite',
            }} />

          {/* === TOP AURORA BAND — flowing gradient ribbon === */}
          <div className="absolute top-0 left-0 right-0 h-24 overflow-hidden rounded-t-2xl"
            style={{
              maskImage: 'linear-gradient(180deg, black 0%, black 30%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 30%, transparent 100%)',
            }}>
            {/* Primary aurora wave */}
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${palette[0]}30 15%, 
                  ${palette[Math.min(1, palette.length - 1)]}25 30%, 
                  ${palette[0]}35 50%, 
                  ${palette[Math.min(2, palette.length - 1)]}20 70%, 
                  ${palette[0]}30 85%, 
                  transparent 100%)`,
                backgroundSize: '200% 100%',
                animation: 'hdr-aurora-flow 8s ease-in-out infinite',
                filter: 'blur(8px)',
              }} />
            {/* Secondary shimmer layer */}
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  ${palette[Math.min(1, palette.length - 1)]}20 20%, 
                  transparent 40%, 
                  ${palette[0]}25 60%, 
                  transparent 80%, 
                  ${palette[Math.min(1, palette.length - 1)]}15 100%)`,
                backgroundSize: '300% 100%',
                animation: 'hdr-aurora-flow-2 12s ease-in-out infinite',
                filter: 'blur(12px)',
              }} />
          </div>

          {/* === LEFT SIDE — subtle aurora drape === */}
          <div className="absolute top-0 left-0 bottom-0 w-12 overflow-hidden rounded-l-2xl"
            style={{
              maskImage: 'linear-gradient(90deg, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(90deg, black 0%, transparent 100%)',
            }}>
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, 
                  ${palette[0]}25 0%, 
                  ${palette[Math.min(1, palette.length - 1)]}15 30%, 
                  transparent 50%, 
                  ${palette[0]}10 70%, 
                  ${palette[Math.min(1, palette.length - 1)]}20 100%)`,
                backgroundSize: '100% 200%',
                animation: 'hdr-aurora-side 10s ease-in-out infinite',
                filter: 'blur(6px)',
              }} />
          </div>

          {/* === RIGHT SIDE — mirror aurora drape === */}
          <div className="absolute top-0 right-0 bottom-0 w-12 overflow-hidden rounded-r-2xl"
            style={{
              maskImage: 'linear-gradient(270deg, black 0%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(270deg, black 0%, transparent 100%)',
            }}>
            <div className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, 
                  ${palette[Math.min(1, palette.length - 1)]}20 0%, 
                  ${palette[0]}15 35%, 
                  transparent 55%, 
                  ${palette[Math.min(1, palette.length - 1)]}10 75%, 
                  ${palette[0]}22 100%)`,
                backgroundSize: '100% 200%',
                animation: 'hdr-aurora-side 12s ease-in-out infinite 2s',
                filter: 'blur(6px)',
              }} />
          </div>

          {/* Sparkle stars scattered along the aurora */}
          {[
            { x: '10%', y: '8%' }, { x: '25%', y: '5%' }, { x: '40%', y: '10%' },
            { x: '55%', y: '6%' }, { x: '70%', y: '9%' }, { x: '85%', y: '4%' },
            { x: '92%', y: '12%' }, { x: '5%', y: '14%' },
            { x: '3%', y: '40%' }, { x: '97%', y: '35%' },
            { x: '4%', y: '65%' }, { x: '96%', y: '60%' },
          ].map((star, i) => (
            <div key={`aurora-star-${i}`} className="absolute"
              style={{
                left: star.x, top: star.y,
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                borderRadius: '50%',
                backgroundColor: palette[i % palette.length],
                boxShadow: `0 0 ${4 + (i % 3) * 2}px ${palette[i % palette.length]}80, 0 0 ${8 + (i % 3) * 3}px ${palette[i % palette.length]}30`,
                animation: `hdr-aurora-sparkle ${2 + (i % 4) * 0.8}s ease-in-out infinite ${i * 0.6}s`,
                transform: 'translate(-50%, -50%)',
              }} />
          ))}

          {/* Traveling light along the aurora band */}
          <div className="absolute"
            style={{
              width: 6, height: 6,
              borderRadius: '50%',
              backgroundColor: palette[0],
              boxShadow: `0 0 12px ${palette[0]}, 0 0 24px ${palette[0]}80, 0 0 36px ${palette[0]}40`,
              animation: 'hdr-aurora-travel 10s ease-in-out infinite',
            }} />

          <style jsx>{`
            @keyframes hdr-aurora-flow {
              0% { background-position: 0% 0%; }
              50% { background-position: 100% 0%; }
              100% { background-position: 0% 0%; }
            }
            @keyframes hdr-aurora-flow-2 {
              0% { background-position: 100% 0%; }
              50% { background-position: 0% 0%; }
              100% { background-position: 100% 0%; }
            }
            @keyframes hdr-aurora-side {
              0% { background-position: 0% 0%; }
              50% { background-position: 0% 100%; }
              100% { background-position: 0% 0%; }
            }
            @keyframes hdr-aurora-sparkle {
              0%, 70%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
              35% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); }
            }
            @keyframes hdr-aurora-border-pulse {
              0%, 100% { box-shadow: inset 0 0 20px ${palette[0]}10, 0 0 12px ${palette[0]}18; }
              50% { box-shadow: inset 0 0 30px ${palette[0]}20, 0 0 20px ${palette[0]}30; }
            }
            @keyframes hdr-aurora-travel {
              0% { top: 10px; left: 5%; opacity: 0; }
              5% { opacity: 1; }
              25% { top: 8px; left: 30%; }
              50% { top: 12px; left: 60%; }
              75% { top: 6px; left: 85%; }
              95% { opacity: 1; }
              100% { top: 10px; left: 95%; opacity: 0; }
            }
          `}</style>
        </div>
      )

    default:
      return null
  }
}

// =============================================================================
// Background Effects Layer — escalating atmosphere
// particles (base) → gradients (aurora blobs) → noise (cinematic grain) → rays (god-rays)
// =============================================================================

function BackgroundEffectsLayer({
  effectType = 'none' as BackgroundEffectType,
  accentColor = '#8661ff',
  isDarkMode = true,
  colorMode = 'accent' as ColorMode,
}: {
  effectType?: BackgroundEffectType
  accentColor?: string
  isDarkMode?: boolean
  colorMode?: ColorMode
}) {
  if (effectType === 'none' || effectType === 'particles') return null
  const palette = getColorPalette(colorMode, accentColor)

  switch (effectType) {
    case 'gradients':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Large aurora blob 1 */}
          <div className="absolute rounded-full"
            style={{
              width: 400, height: 400,
              top: '-10%', left: '-5%',
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 160), opacity: 0.08, filter: 'blur(60px)' }
                : { backgroundImage: `radial-gradient(ellipse at center, ${palette[0]}cc, ${palette[0]}60, transparent 70%)`, opacity: 0.08, filter: 'blur(60px)' }),
              animation: colorMode !== 'accent'
                ? 'bg-aurora-1 12s ease-in-out infinite, color-shift-flow 12s ease infinite'
                : 'bg-aurora-1 12s ease-in-out infinite',
            }} />
          {/* Aurora blob 2 */}
          <div className="absolute rounded-full"
            style={{
              width: 350, height: 350,
              bottom: '-5%', right: '-10%',
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 45), opacity: 0.06, filter: 'blur(50px)' }
                : { backgroundImage: `radial-gradient(ellipse at center, ${palette[1] || palette[0]}cc, ${palette[1] || palette[0]}60, transparent 70%)`, opacity: 0.06, filter: 'blur(50px)' }),
              animation: colorMode !== 'accent'
                ? 'bg-aurora-2 15s ease-in-out infinite, color-shift-flow 15s ease infinite'
                : 'bg-aurora-2 15s ease-in-out infinite',
            }} />
          {/* Smaller accent blob */}
          <div className="absolute rounded-full"
            style={{
              width: 200, height: 200,
              top: '40%', left: '30%',
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 270), opacity: 0.05, filter: 'blur(40px)' }
                : { backgroundImage: `radial-gradient(circle, ${palette[Math.min(2, palette.length - 1)]}aa, transparent 60%)`, opacity: 0.05, filter: 'blur(40px)' }),
              animation: colorMode !== 'accent'
                ? 'bg-aurora-3 18s ease-in-out infinite, color-shift-flow 18s ease infinite'
                : 'bg-aurora-3 18s ease-in-out infinite',
            }} />
          {/* Color shift overlay */}
          <div className="absolute inset-0"
            style={{
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 124), opacity: 0.02 }
                : { backgroundImage: `linear-gradient(160deg, ${palette[0]}40 0%, transparent 40%, ${palette[Math.min(1, palette.length - 1)]}30 60%, transparent 100%)`, opacity: 0.02 }),
              animation: colorMode !== 'accent'
                ? 'color-shift-flow 20s ease infinite'
                : 'bg-color-shift 20s ease-in-out infinite',
            }} />
          <style jsx>{`
            @keyframes bg-aurora-1 { 
              0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.3; } 
              33% { transform: translate(40px, -30px) scale(1.15) rotate(5deg); opacity: 0.45; }
              66% { transform: translate(-20px, 20px) scale(0.95) rotate(-3deg); opacity: 0.25; }
            }
            @keyframes bg-aurora-2 { 
              0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; } 
              50% { transform: translate(-30px, -20px) scale(1.2); opacity: 0.4; } 
            }
            @keyframes bg-aurora-3 { 
              0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; } 
              33% { transform: translate(20px, 30px) scale(1.1); opacity: 0.35; }
              66% { transform: translate(-15px, -10px) scale(0.9); opacity: 0.15; }
            }
            @keyframes bg-color-shift { 
              0%, 100% { opacity: 1; } 
              50% { opacity: 0.3; } 
            }
            @keyframes color-shift-flow {
              0% { background-position: 0% 82%; }
              50% { background-position: 100% 19%; }
              100% { background-position: 0% 82%; }
            }
          `}</style>
        </div>
      )

    case 'noise':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Film grain */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
              opacity: isDarkMode ? 0.06 : 0.04,
              mixBlendMode: isDarkMode ? 'overlay' : 'multiply',
              animation: 'bg-grain-drift 0.4s steps(4) infinite',
            }} />
          {/* Horizontal scanlines */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: isDarkMode
                ? 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 4px)'
                : 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)',
              backgroundSize: '100% 4px',
            }} />
          {/* Vignette overlay */}
          <div className="absolute inset-0"
            style={{
              background: isDarkMode
                ? 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.3) 100%)'
                : 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 50%, rgba(0,0,0,0.06) 100%)',
            }} />
          <style jsx>{`
            @keyframes bg-grain-drift { 
              0% { transform: translate(0, 0); }
              25% { transform: translate(-1px, 1px); }
              50% { transform: translate(1px, -1px); }
              75% { transform: translate(-1px, -1px); }
              100% { transform: translate(0, 0); }
            }
          `}</style>
        </div>
      )

    case 'rays':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Volumetric god-rays from top center */}
          {[0, 1, 2, 3, 4, 5, 6].map(i => {
            const angle = -24 + i * 8
            const width = 30 + (i % 3) * 20
            const rayColor = palette[i % palette.length]
            return (
              <div key={i} className="absolute"
                style={{
                  top: '-20%',
                  left: '50%',
                  width: `${width}px`,
                  height: '140%',
                  ...(colorMode !== 'accent'
                    ? { ...paletteAnimatedBg(colorMode, accentColor, 180), opacity: 0.015 }
                    : { backgroundImage: `linear-gradient(180deg, ${rayColor} 0%, ${rayColor}80 30%, transparent 80%)`, opacity: 0.015 }),
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                  transformOrigin: 'top center',
                  animation: colorMode !== 'accent'
                    ? `bg-ray-breathe ${8 + i * 1.5}s ease-in-out infinite ${i * 0.5}s, color-shift-flow ${10 + i * 2}s ease infinite`
                    : `bg-ray-breathe ${8 + i * 1.5}s ease-in-out infinite ${i * 0.5}s`,
                }} />
            )
          })}
          {/* Central light source */}
          <div className="absolute"
            style={{
              top: '-5%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 120,
              height: 120,
              ...(colorMode !== 'accent'
                ? { ...paletteAnimatedBg(colorMode, accentColor, 124), borderRadius: '50%', opacity: 0.03 }
                : { backgroundImage: `radial-gradient(circle, ${palette[0]}cc, ${palette[1] || palette[0]}80, transparent 70%)`, borderRadius: '50%', opacity: 0.03 }),
              filter: 'blur(25px)',
              animation: colorMode !== 'accent'
                ? 'bg-source-pulse 4s ease-in-out infinite, color-shift-flow 12s ease infinite'
                : 'bg-source-pulse 4s ease-in-out infinite',
            }} />
          <style jsx>{`
            @keyframes bg-ray-breathe { 
              0%, 100% { opacity: 0.1; } 
              50% { opacity: 0.25; } 
            }
            @keyframes bg-source-pulse { 
              0%, 100% { opacity: 0.12; transform: translateX(-50%) scale(1); } 
              50% { opacity: 0.22; transform: translateX(-50%) scale(1.15); } 
            }
            @keyframes color-shift-flow {
              0% { background-position: 0% 82%; }
              50% { background-position: 100% 19%; }
              100% { background-position: 0% 82%; }
            }
          `}</style>
        </div>
      )

    case 'stars':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Far stars (small, slow twinkle) */}
          {[...Array(50)].map((_, i) => {
            const x = ((i * 37 + 13) % 100)
            const y = ((i * 53 + 7) % 100)
            const size = 1 + (i % 3) * 0.5
            const delay = (i * 0.3) % 5
            const duration = 3 + (i % 4)
            return (
              <div key={`far-${i}`} className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  backgroundColor: i % 5 === 0 ? palette[i % palette.length] : (isDarkMode ? 'white' : '#334155'),
                  opacity: 0,
                  animation: `void-star-twinkle ${duration}s ease-in-out infinite ${delay}s`,
                }} />
            )
          })}
          {/* Mid stars (colored accents with glow) */}
          {[...Array(20)].map((_, i) => {
            const x = ((i * 43 + 29) % 100)
            const y = ((i * 67 + 11) % 100)
            const size = 2 + (i % 2)
            const delay = (i * 0.5) % 4
            return (
              <div key={`mid-${i}`} className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                  backgroundColor: palette[i % palette.length],
                  boxShadow: `0 0 ${size * 3}px ${palette[i % palette.length]}60`,
                  opacity: 0,
                  animation: `void-star-twinkle ${2.5 + (i % 3)}s ease-in-out infinite ${delay}s`,
                }} />
            )
          })}
          {/* Near stars (cross-shaped, bright) */}
          {[...Array(5)].map((_, i) => {
            const x = ((i * 71 + 17) % 90) + 5
            const y = ((i * 83 + 23) % 80) + 10
            return (
              <div key={`near-${i}`} className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 6,
                  height: 6,
                }}>
                <div className="absolute inset-0" style={{
                  background: `radial-gradient(circle, ${palette[i % palette.length]} 0%, transparent 70%)`,
                  animation: `void-star-pulse ${4 + i}s ease-in-out infinite ${i * 0.8}s`,
                }} />
                <div className="absolute" style={{
                  top: '50%', left: '-100%', right: '-100%', height: 1,
                  background: `linear-gradient(90deg, transparent, ${palette[i % palette.length]}80, transparent)`,
                  transform: 'translateY(-50%)',
                }} />
                <div className="absolute" style={{
                  left: '50%', top: '-100%', bottom: '-100%', width: 1,
                  background: `linear-gradient(180deg, transparent, ${palette[i % palette.length]}80, transparent)`,
                  transform: 'translateX(-50%)',
                }} />
              </div>
            )
          })}
          {/* Deep space nebula glow */}
          <div className="absolute rounded-full"
            style={{
              width: 300, height: 300,
              top: '10%', right: '-5%',
              backgroundImage: `radial-gradient(ellipse at center, ${palette[0]}18, ${palette[1] || palette[0]}08, transparent 70%)`,
              filter: 'blur(40px)',
              animation: 'void-nebula-drift 20s ease-in-out infinite',
            }} />
          <style jsx>{`
            @keyframes void-star-twinkle {
              0%, 100% { opacity: 0.1; }
              50% { opacity: 0.7; }
            }
            @keyframes void-star-pulse {
              0%, 100% { opacity: 0.3; transform: scale(0.8); }
              50% { opacity: 0.9; transform: scale(1.2); }
            }
            @keyframes void-nebula-drift {
              0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
              50% { transform: translate(-20px, 15px) scale(1.1); opacity: 0.9; }
            }
          `}</style>
        </div>
      )

    case 'meteors':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Sparse star backdrop */}
          {[...Array(25)].map((_, i) => {
            const x = ((i * 37 + 13) % 100)
            const y = ((i * 53 + 7) % 100)
            return (
              <div key={`s-${i}`} className="absolute rounded-full"
                style={{
                  left: `${x}%`, top: `${y}%`,
                  width: 1.5, height: 1.5,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)',
                  animation: `void-star-twinkle ${3 + (i % 3)}s ease-in-out infinite ${(i * 0.4) % 5}s`,
                }} />
            )
          })}
          {/* Shooting meteors */}
          {[0, 1, 2, 3, 4].map(i => {
            const startX = 10 + i * 20
            const duration = 2 + (i % 3) * 0.8
            const delay = i * 3.5
            const width = 60 + (i % 3) * 30
            return (
              <div key={`meteor-${i}`} className="absolute"
                style={{
                  top: `${5 + (i * 13) % 40}%`,
                  left: `${startX}%`,
                  width: width,
                  height: 1.5,
                  transformOrigin: 'left center',
                  transform: 'rotate(25deg)',
                  animation: `void-meteor-shoot ${duration}s ease-in ${delay}s infinite`,
                  opacity: 0,
                }}>
                <div className="absolute inset-0 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(90deg, transparent, ${palette[i % palette.length]}60, ${palette[i % palette.length]})`,
                    boxShadow: `0 0 6px ${palette[i % palette.length]}40`,
                  }} />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: 'white',
                    boxShadow: `0 0 8px ${palette[i % palette.length]}, 0 0 16px ${palette[i % palette.length]}60`,
                  }} />
              </div>
            )
          })}
          {/* Ambient deep-space glow */}
          <div className="absolute"
            style={{
              width: 250, height: 250,
              top: '5%', left: '60%',
              backgroundImage: `radial-gradient(ellipse, ${palette[0]}12, transparent 70%)`,
              filter: 'blur(50px)',
            }} />
          <style jsx>{`
            @keyframes void-star-twinkle {
              0%, 100% { opacity: 0.1; }
              50% { opacity: 0.7; }
            }
            @keyframes void-meteor-shoot {
              0% { opacity: 0; transform: rotate(25deg) translateX(-100px); }
              10% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; transform: rotate(25deg) translateX(calc(100vw)); }
            }
          `}</style>
        </div>
      )

    case 'bubbles':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Rising bubbles — varying sizes, speeds, and wobble */}
          {Array.from({ length: 20 }).map((_, i) => {
            const size = 8 + (i % 5) * 8
            const x = ((i * 23 + 11) % 95) + 2
            const duration = 8 + (i % 6) * 3
            const delay = (i * 1.3) % 12
            const wobbleDir = (i % 3) - 1
            return (
              <div key={`bubble-${i}`} className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  left: `${x}%`,
                  bottom: '-5%',
                  border: `1.5px solid ${palette[i % palette.length]}${i % 3 === 0 ? '90' : '60'}`,
                  background: `radial-gradient(ellipse at 30% 30%, ${palette[i % palette.length]}40, ${palette[i % palette.length]}10 60%, transparent 80%)`,
                  boxShadow: `inset 0 -2px 4px ${palette[i % palette.length]}15, 0 0 8px ${palette[i % palette.length]}15`,
                  animation: `sea-bubble-rise-${i % 3} ${duration}s ease-in-out infinite ${delay}s`,
                }} />
            )
          })}
          {/* Ambient underwater glow */}
          <div className="absolute"
            style={{
              width: 300, height: 300,
              bottom: '5%', left: '30%',
              backgroundImage: `radial-gradient(ellipse, ${palette[0]}25, transparent 70%)`,
              filter: 'blur(50px)',
              animation: 'sea-ambient-drift 10s ease-in-out infinite',
            }} />
          <div className="absolute"
            style={{
              width: 200, height: 200,
              bottom: '15%', right: '15%',
              backgroundImage: `radial-gradient(ellipse, ${palette[Math.min(1, palette.length - 1)]}20, transparent 70%)`,
              filter: 'blur(40px)',
              animation: 'sea-ambient-drift 12s ease-in-out infinite 3s',
            }} />
          <style jsx>{`
            @keyframes sea-bubble-rise-0 {
              0% { transform: translateY(0) translateX(0) scale(0.4); opacity: 0; }
              8% { opacity: 0.7; transform: translateY(-5vh) translateX(0) scale(0.8); }
              50% { transform: translateY(-50vh) translateX(20px) scale(1); opacity: 0.5; }
              85% { opacity: 0.2; }
              100% { transform: translateY(-105vh) translateX(-10px) scale(0.9); opacity: 0; }
            }
            @keyframes sea-bubble-rise-1 {
              0% { transform: translateY(0) translateX(0) scale(0.3); opacity: 0; }
              10% { opacity: 0.65; transform: translateY(-8vh) translateX(0) scale(0.7); }
              50% { transform: translateY(-50vh) translateX(-15px) scale(1); opacity: 0.45; }
              90% { opacity: 0.15; }
              100% { transform: translateY(-110vh) translateX(8px) scale(0.85); opacity: 0; }
            }
            @keyframes sea-bubble-rise-2 {
              0% { transform: translateY(0) translateX(0) scale(0.5); opacity: 0; }
              12% { opacity: 0.6; transform: translateY(-6vh) translateX(0) scale(0.75); }
              50% { transform: translateY(-48vh) translateX(12px) scale(1.05); opacity: 0.4; }
              88% { opacity: 0.2; }
              100% { transform: translateY(-108vh) translateX(-5px) scale(0.8); opacity: 0; }
            }
            @keyframes sea-ambient-drift {
              0%, 100% { transform: translateX(0) scale(1); opacity: 0.6; }
              50% { transform: translateX(20px) scale(1.1); opacity: 0.9; }
            }
          `}</style>
        </div>
      )

    case 'waves':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Wave layer 1 — slowest, deepest */}
          <svg className="absolute bottom-0 left-0 w-[200%]" height="140" preserveAspectRatio="none"
            style={{ animation: 'sea-wave-drift-1 12s linear infinite' }}>
            <path d={`M0 60 Q 100 20, 200 60 T 400 60 T 600 60 T 800 60 T 1000 60 T 1200 60 T 1400 60 T 1600 60 V 140 H 0 Z`}
              fill={`${palette[0]}30`} />
            <path d={`M0 80 Q 100 50, 200 80 T 400 80 T 600 80 T 800 80 T 1000 80 T 1200 80 T 1400 80 T 1600 80 V 140 H 0 Z`}
              fill={`${palette[0]}1a`} />
          </svg>
          {/* Wave layer 2 — mid speed */}
          <svg className="absolute bottom-0 left-0 w-[200%]" height="100" preserveAspectRatio="none"
            style={{ animation: 'sea-wave-drift-2 8s linear infinite' }}>
            <path d={`M0 40 Q 80 10, 160 40 T 320 40 T 480 40 T 640 40 T 800 40 T 960 40 T 1120 40 T 1280 40 T 1440 40 T 1600 40 V 100 H 0 Z`}
              fill={`${palette[Math.min(1, palette.length - 1)]}28`} />
          </svg>
          {/* Wave layer 3 — fastest, foreground */}
          <svg className="absolute bottom-0 left-0 w-[200%]" height="70" preserveAspectRatio="none"
            style={{ animation: 'sea-wave-drift-3 6s linear infinite' }}>
            <path d={`M0 25 Q 60 5, 120 25 T 240 25 T 360 25 T 480 25 T 600 25 T 720 25 T 840 25 T 960 25 T 1080 25 T 1200 25 T 1320 25 T 1440 25 T 1600 25 V 70 H 0 Z`}
              fill={`${palette[Math.min(2, palette.length - 1)]}20`} />
          </svg>
          {/* Surface light caustics */}
          <div className="absolute bottom-0 left-0 right-0 h-40"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 12% 50% at 15% 75%, ${palette[0]}30, transparent),
                radial-gradient(ellipse 10% 45% at 40% 80%, ${palette[Math.min(1, palette.length - 1)]}25, transparent),
                radial-gradient(ellipse 14% 55% at 65% 70%, ${palette[0]}20, transparent),
                radial-gradient(ellipse 10% 40% at 85% 85%, ${palette[Math.min(2, palette.length - 1)]}25, transparent)
              `,
              animation: 'sea-caustic-shift 6s ease-in-out infinite',
            }} />
          {/* Top surface shimmer line */}
          <div className="absolute left-0 right-0" 
            style={{
              bottom: '85%',
              height: 2,
              background: `linear-gradient(90deg, transparent 10%, ${palette[0]}20 30%, ${palette[Math.min(1, palette.length - 1)]}35 50%, ${palette[0]}20 70%, transparent 90%)`,
              filter: 'blur(1px)',
              animation: 'sea-surface-shimmer 4s ease-in-out infinite',
            }} />
          <style jsx>{`
            @keyframes sea-wave-drift-1 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes sea-wave-drift-2 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes sea-wave-drift-3 { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes sea-caustic-shift {
              0%, 100% { opacity: 0.6; transform: translateX(0); }
              50% { opacity: 1; transform: translateX(10px); }
            }
            @keyframes sea-surface-shimmer {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.7; }
            }
          `}</style>
        </div>
      )

    case 'leaves':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Falling leaves — SVG leaf shapes with rotation + sway */}
          {Array.from({ length: 12 }).map((_, i) => {
            const size = 14 + (i % 4) * 6
            const x = ((i * 29 + 7) % 95) + 2
            const duration = 10 + (i % 5) * 4
            const delay = (i * 1.8) % 14
            const leafColor = palette[i % palette.length]
            return (
              <div key={`leaf-${i}`} className="absolute"
                style={{
                  left: `${x}%`,
                  top: '-8%',
                  width: size,
                  height: size,
                  animation: `forest-leaf-fall-${i % 3} ${duration}s ease-in-out infinite ${delay}s`,
                  opacity: 0,
                }}>
                <svg viewBox="0 0 24 24" width={size} height={size} style={{ filter: `drop-shadow(0 0 3px ${leafColor}40)` }}>
                  <path d={i % 3 === 0
                    ? 'M12 2 C6 6, 2 12, 6 18 C8 20, 12 22, 12 22 C12 22, 16 20, 18 18 C22 12, 18 6, 12 2Z'
                    : i % 3 === 1
                    ? 'M12 1 C8 4, 3 10, 5 16 C7 20, 12 23, 12 23 C12 23, 17 20, 19 16 C21 10, 16 4, 12 1Z'
                    : 'M12 2 C7 5, 4 11, 7 17 C9 20, 12 22, 12 22 C12 22, 15 20, 17 17 C20 11, 17 5, 12 2Z'}
                    fill={`${leafColor}${i % 2 === 0 ? '45' : '35'}`}
                    stroke={`${leafColor}50`}
                    strokeWidth="0.5" />
                  {/* Leaf vein */}
                  <path d="M12 4 L12 20" fill="none" stroke={`${leafColor}30`} strokeWidth="0.5" />
                  <path d="M12 8 L8 6" fill="none" stroke={`${leafColor}20`} strokeWidth="0.3" />
                  <path d="M12 12 L16 10" fill="none" stroke={`${leafColor}20`} strokeWidth="0.3" />
                  <path d="M12 16 L8 14" fill="none" stroke={`${leafColor}20`} strokeWidth="0.3" />
                </svg>
              </div>
            )
          })}
          {/* Ground-level ambient glow */}
          <div className="absolute bottom-0 left-0 right-0 h-40"
            style={{
              backgroundImage: `linear-gradient(0deg, ${palette[0]}12 0%, transparent 100%)`,
            }} />
          <style jsx>{`
            @keyframes forest-leaf-fall-0 {
              0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
              5% { opacity: 0.7; }
              25% { transform: translateY(25vh) translateX(30px) rotate(90deg); }
              50% { transform: translateY(50vh) translateX(-20px) rotate(200deg); opacity: 0.5; }
              75% { transform: translateY(75vh) translateX(25px) rotate(300deg); opacity: 0.3; }
              100% { transform: translateY(110vh) translateX(-10px) rotate(400deg); opacity: 0; }
            }
            @keyframes forest-leaf-fall-1 {
              0% { transform: translateY(0) translateX(0) rotate(30deg); opacity: 0; }
              8% { opacity: 0.6; }
              30% { transform: translateY(28vh) translateX(-25px) rotate(120deg); }
              55% { transform: translateY(52vh) translateX(20px) rotate(240deg); opacity: 0.45; }
              80% { transform: translateY(78vh) translateX(-15px) rotate(340deg); opacity: 0.25; }
              100% { transform: translateY(108vh) translateX(10px) rotate(440deg); opacity: 0; }
            }
            @keyframes forest-leaf-fall-2 {
              0% { transform: translateY(0) translateX(0) rotate(-20deg); opacity: 0; }
              6% { opacity: 0.65; }
              20% { transform: translateY(22vh) translateX(20px) rotate(80deg); }
              45% { transform: translateY(48vh) translateX(-30px) rotate(180deg); opacity: 0.5; }
              70% { transform: translateY(72vh) translateX(15px) rotate(280deg); opacity: 0.3; }
              100% { transform: translateY(112vh) translateX(-8px) rotate(380deg); opacity: 0; }
            }
          `}</style>
        </div>
      )

    case 'fireflies':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Firefly glow dots — random drift with opacity pulsing */}
          {Array.from({ length: 25 }).map((_, i) => {
            const x = ((i * 31 + 13) % 90) + 5
            const y = ((i * 47 + 17) % 80) + 10
            const size = 3 + (i % 3) * 2
            const driftDuration = 6 + (i % 7) * 2
            const glowDelay = (i * 0.7) % 8
            const flyColor = palette[i % palette.length]
            return (
              <div key={`firefly-${i}`} className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: size,
                  height: size,
                }}>
                {/* Core glow */}
                <div className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: flyColor,
                    boxShadow: `0 0 ${size * 2}px ${flyColor}80, 0 0 ${size * 4}px ${flyColor}40, 0 0 ${size * 6}px ${flyColor}20`,
                    animation: `forest-fly-glow ${2 + (i % 3)}s ease-in-out infinite ${glowDelay}s`,
                  }} />
                {/* Drift container */}
                <div className="absolute inset-0"
                  style={{
                    animation: `forest-fly-drift-${i % 4} ${driftDuration}s ease-in-out infinite ${glowDelay}s`,
                  }} />
              </div>
            )
          })}
          {/* Subtle ambient forest floor glow */}
          <div className="absolute bottom-0 left-0 right-0 h-48"
            style={{
              backgroundImage: `linear-gradient(0deg, ${palette[0]}0a 0%, transparent 100%)`,
            }} />
          <div className="absolute"
            style={{
              width: 200, height: 200,
              top: '30%', left: '20%',
              backgroundImage: `radial-gradient(ellipse, ${palette[0]}10, transparent 70%)`,
              filter: 'blur(40px)',
              animation: 'forest-ambient-pulse 8s ease-in-out infinite',
            }} />
          <div className="absolute"
            style={{
              width: 180, height: 180,
              top: '50%', right: '15%',
              backgroundImage: `radial-gradient(ellipse, ${palette[Math.min(1, palette.length - 1)]}0c, transparent 70%)`,
              filter: 'blur(35px)',
              animation: 'forest-ambient-pulse 10s ease-in-out infinite 3s',
            }} />
          <style jsx>{`
            @keyframes forest-fly-glow {
              0%, 100% { opacity: 0.15; transform: scale(0.6); }
              30% { opacity: 0.9; transform: scale(1.2); }
              50% { opacity: 0.7; transform: scale(1); }
              70% { opacity: 0.95; transform: scale(1.1); }
            }
            @keyframes forest-fly-drift-0 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(15px, -10px); }
              50% { transform: translate(-8px, -18px); }
              75% { transform: translate(10px, 5px); }
            }
            @keyframes forest-fly-drift-1 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(-12px, 8px); }
              50% { transform: translate(10px, 15px); }
              75% { transform: translate(-6px, -12px); }
            }
            @keyframes forest-fly-drift-2 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(8px, 12px); }
              50% { transform: translate(-15px, -5px); }
              75% { transform: translate(12px, -8px); }
            }
            @keyframes forest-fly-drift-3 {
              0%, 100% { transform: translate(0, 0); }
              25% { transform: translate(-10px, -15px); }
              50% { transform: translate(12px, 8px); }
              75% { transform: translate(-5px, 12px); }
            }
            @keyframes forest-ambient-pulse {
              0%, 100% { opacity: 0.4; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.15); }
            }
          `}</style>
        </div>
      )

    case 'clouds':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Drifting cloud layers — soft blurred ellipses at different depths */}
          {[
            { x: -5, y: 12, w: 280, h: 80, opacity: 0.08, dur: 45, delay: 0, blur: 40 },
            { x: 15, y: 35, w: 220, h: 65, opacity: 0.1, dur: 55, delay: -10, blur: 35 },
            { x: 60, y: 55, w: 300, h: 90, opacity: 0.07, dur: 50, delay: -25, blur: 45 },
            { x: -20, y: 72, w: 250, h: 70, opacity: 0.09, dur: 60, delay: -15, blur: 38 },
            { x: 40, y: 20, w: 180, h: 55, opacity: 0.12, dur: 40, delay: -30, blur: 30 },
            { x: 70, y: 80, w: 200, h: 60, opacity: 0.06, dur: 65, delay: -5, blur: 42 },
          ].map((cloud, i) => (
            <div key={`cloud-${i}`} className="absolute"
              style={{
                left: `${cloud.x}%`,
                top: `${cloud.y}%`,
                width: cloud.w,
                height: cloud.h,
                borderRadius: '50%',
                background: `radial-gradient(ellipse, ${palette[i % palette.length]}${Math.round(cloud.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
                filter: `blur(${cloud.blur}px)`,
                animation: `sky-cloud-drift-${i % 3} ${cloud.dur}s linear infinite ${cloud.delay}s`,
              }} />
          ))}
          {/* Wispy thin cloud streaks */}
          {[
            { x: 10, y: 25, w: 350, h: 3, opacity: 0.06, dur: 35, delay: 0 },
            { x: -15, y: 48, w: 400, h: 2.5, opacity: 0.05, dur: 42, delay: -8 },
            { x: 25, y: 68, w: 320, h: 2, opacity: 0.04, dur: 38, delay: -18 },
          ].map((streak, i) => (
            <div key={`streak-${i}`} className="absolute"
              style={{
                left: `${streak.x}%`,
                top: `${streak.y}%`,
                width: streak.w,
                height: streak.h,
                background: `linear-gradient(90deg, transparent, ${palette[0]}${Math.round(streak.opacity * 255).toString(16).padStart(2, '0')}, transparent)`,
                filter: 'blur(8px)',
                animation: `sky-cloud-drift-${(i + 1) % 3} ${streak.dur}s linear infinite ${streak.delay}s`,
              }} />
          ))}
          {/* Subtle sunlight rays peeking through clouds */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: '60%',
              height: '50%',
              background: `conic-gradient(from 180deg at 50% 0%, transparent 35%, ${palette[0]}08 42%, transparent 44%, transparent 46%, ${palette[0]}06 50%, transparent 54%, transparent 56%, ${palette[0]}08 58%, transparent 65%)`,
              filter: 'blur(15px)',
              animation: 'sky-sunray-pulse 8s ease-in-out infinite',
            }} />
          {/* Warm atmospheric glow */}
          <div className="absolute top-0 left-0 right-0 h-40"
            style={{
              backgroundImage: `linear-gradient(180deg, ${palette[0]}0a 0%, transparent 100%)`,
            }} />
          <style jsx>{`
            @keyframes sky-cloud-drift-0 {
              0% { transform: translateX(0); }
              100% { transform: translateX(120px); }
            }
            @keyframes sky-cloud-drift-1 {
              0% { transform: translateX(0); }
              100% { transform: translateX(-100px); }
            }
            @keyframes sky-cloud-drift-2 {
              0% { transform: translateX(0); }
              100% { transform: translateX(80px); }
            }
            @keyframes sky-sunray-pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </div>
      )

    default:
      return null
  }
}

// =============================================================================
// Faction Status Banner
// =============================================================================

function FactionStatusBanner({
  factionName,
  level,
  memberSince,
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  factionName: string
  level: number
  memberSince: string
  accentColor?: string
  isDarkMode?: boolean
}) {
  const textColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'
  const memberDate = new Date(memberSince)
  const formattedDate = memberDate.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' })

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 rounded-xl backdrop-blur-sm"
      style={{
        background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
        />
        <span className="text-xs font-medium" style={{ color: accentColor }}>
          {factionName}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: textColor }}>
          Medlem sedan {formattedDate}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
          }}
        >
          Rang {Math.floor(level / 5) + 1}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Badge Showcase — Real composed badges displayed large & proud
// =============================================================================

// Pick a curated set from the global badge library for the Journey showcase
// We mark some as unlocked (earned) and some as locked (not yet earned)
const JOURNEY_BADGES: {
  achievement: (typeof mockAchievements)[number]
  unlocked: boolean
  earnedDate?: string
  featured?: boolean
}[] = [
  // Featured hero badge — the most impressive recent unlock
  { achievement: mockAchievements.find(a => a.id === 'gold-series-lvl4')!, unlocked: true, earnedDate: '2026-02-08', featured: true },
  // Unlocked badges
  { achievement: mockAchievements.find(a => a.id === 'shield-ruby-lvl4')!, unlocked: true, earnedDate: '2026-02-05' },
  { achievement: mockAchievements.find(a => a.id === 'diamond-amethyst-lvl3')!, unlocked: true, earnedDate: '2026-01-28' },
  { achievement: mockAchievements.find(a => a.id === 'circle-emerald-lvl4')!, unlocked: true, earnedDate: '2026-01-20' },
  { achievement: mockAchievements.find(a => a.id === 'hexagon-arctic-lvl3')!, unlocked: true, earnedDate: '2026-01-15' },
  { achievement: mockAchievements.find(a => a.id === 'gold-series-lvl3')!, unlocked: true, earnedDate: '2026-01-10' },
  { achievement: mockAchievements.find(a => a.id === 'shield-ruby-lvl3')!, unlocked: true, earnedDate: '2026-01-05' },
  { achievement: mockAchievements.find(a => a.id === 'circle-emerald-lvl3')!, unlocked: true, earnedDate: '2025-12-20' },
  // Locked badges — next goals
  { achievement: mockAchievements.find(a => a.id === 'diamond-amethyst-lvl4')!, unlocked: false },
  { achievement: mockAchievements.find(a => a.id === 'hexagon-arctic-lvl4')!, unlocked: false },
  { achievement: mockAchievements.find(a => a.id === 'gold-series-lvl2')!, unlocked: false },
  { achievement: mockAchievements.find(a => a.id === 'shield-ruby-lvl2')!, unlocked: false },
].filter(b => b.achievement) // Safety filter

function resolveTheme(themeId?: string | null) {
  return themes.find(t => t.id === themeId)
}

function BadgeShowcase({
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  accentColor?: string
  isDarkMode?: boolean
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'

  const unlockedCount = JOURNEY_BADGES.filter(b => b.unlocked).length
  const featured = JOURNEY_BADGES.find(b => b.featured)
  const rest = JOURNEY_BADGES.filter(b => !b.featured)
  const selected = selectedId ? JOURNEY_BADGES.find(b => b.achievement.id === selectedId) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: textColor }}>Utmärkelser</h3>
        <span className="text-xs" style={{ color: textMuted }}>{unlockedCount}/{JOURNEY_BADGES.length} upplåsta</span>
      </div>

      {/* ── Featured Hero Badge ── */}
      {featured && (
        <div
          className="relative flex flex-col items-center py-8 mb-6 rounded-2xl overflow-hidden"
          style={{
            background: isDarkMode
              ? 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.02) 0%, transparent 70%)',
          }}
        >
          {/* Ambient glow behind hero badge */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accentColor}25 0%, ${accentColor}08 40%, transparent 70%)`,
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />

          {/* Sparkle particles around hero */}
          {[...Array(6)].map((_, i) => {
            const angle = (i * 60) * (Math.PI / 180)
            const radius = 90 + (i % 2) * 20
            const x = Math.round(Math.cos(angle) * radius * 100) / 100
            const y = Math.round(Math.sin(angle) * radius * 100) / 100
            return (
              <div
                key={`sparkle-${i}`}
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px - 10px)`,
                  background: accentColor,
                  opacity: 0.4,
                  animation: `pulse ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            )
          })}

          {/* The hero badge — BIG, no borders, no box */}
          <div
            className="relative transition-transform duration-500 hover:scale-110 cursor-pointer"
            onClick={() => setSelectedId(selectedId === featured.achievement.id ? null : featured.achievement.id)}
          >
            <BadgePreviewEnhanced
              icon={featured.achievement.icon}
              theme={resolveTheme(featured.achievement.icon.themeId)}
              size="lg"
              showGlow={true}
            />
          </div>

          {/* Hero badge name */}
          <div className="mt-4 text-center">
            <h4 className="text-base font-bold" style={{ color: textColor }}>
              {featured.achievement.title}
            </h4>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              {featured.achievement.subtitle}
            </p>
            {featured.earnedDate && (
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                <span className="text-[10px] font-medium tracking-wide uppercase" style={{ color: accentColor }}>
                  Upplåst {featured.earnedDate}
                </span>
              </div>
            )}
          </div>

          {/* Coin reward pill */}
          <div
            className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{
              background: isDarkMode ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.08)',
              border: `1px solid rgba(245,166,35,0.2)`,
            }}
          >
            <Image src="/icons/app-nav/dicecoin_v2.webp" alt="coins" width={14} height={14} />
            <span className="text-xs font-semibold" style={{ color: '#f5a623' }}>
              {featured.achievement.rewardCoins}
            </span>
          </div>
        </div>
      )}

      {/* ── Badge Grid — Large, proud, no card borders ── */}
      <div className="grid grid-cols-3 gap-2">
        {rest.map((badge) => {
          const isHovered = hoveredId === badge.achievement.id
          const isSelected = selectedId === badge.achievement.id
          const theme = resolveTheme(badge.achievement.icon.themeId)

          return (
            <div
              key={badge.achievement.id}
              className="relative flex flex-col items-center py-4 rounded-xl transition-all duration-300 cursor-pointer"
              style={{
                background: isHovered || isSelected
                  ? (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)')
                  : 'transparent',
              }}
              onMouseEnter={() => setHoveredId(badge.achievement.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedId(isSelected ? null : badge.achievement.id)}
            >
              {/* Badge rendered large, no box, no border */}
              <div
                className={cn(
                  "relative transition-all duration-300",
                  !badge.unlocked && "grayscale opacity-40",
                  isHovered && badge.unlocked && "scale-110",
                )}
              >
                <BadgePreviewEnhanced
                  icon={badge.achievement.icon}
                  theme={theme}
                  size="md"
                  showGlow={badge.unlocked && isHovered}
                />

                {/* Lock overlay for locked badges */}
                {!badge.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        background: isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill={isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}>
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Badge title — clean, no box */}
              <span
                className={cn(
                  "text-[11px] font-medium mt-2 text-center leading-tight transition-opacity duration-300",
                  !badge.unlocked && "opacity-40",
                )}
                style={{ color: isHovered ? textColor : textMuted }}
              >
                {badge.achievement.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Selected Badge Detail Overlay ── */}
      {selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedId(null)}
          />
          {/* Detail card — centered overlay */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[340px] max-w-[90vw] rounded-2xl p-6"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: isDarkMode ? '0 24px 80px rgba(0,0,0,0.5)' : '0 24px 80px rgba(0,0,0,0.15)',
            }}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: textMuted,
              }}
              onClick={() => setSelectedId(null)}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>

            {/* Badge — big and centered */}
            <div className="flex justify-center mb-4">
              <div className={cn(!selected.unlocked && "grayscale opacity-50")}>
                <BadgePreviewEnhanced
                  icon={selected.achievement.icon}
                  theme={resolveTheme(selected.achievement.icon.themeId)}
                  size="lg"
                  showGlow={selected.unlocked}
                />
              </div>
            </div>

            {/* Info */}
            <div className="text-center">
              <h4 className="text-lg font-bold" style={{ color: textColor }}>
                {selected.achievement.title}
              </h4>
              <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                {selected.achievement.subtitle}
              </p>
              <p className="text-sm mt-3 leading-relaxed" style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                {selected.achievement.description}
              </p>

              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <Image src="/icons/app-nav/dicecoin_v2.webp" alt="coins" width={16} height={16} />
                  <span className="text-sm font-semibold" style={{ color: '#f5a623' }}>
                    {selected.achievement.rewardCoins}
                  </span>
                </div>
                {selected.unlocked && selected.earnedDate && (
                  <span className="text-xs" style={{ color: textMuted }}>
                    Upplåst {selected.earnedDate}
                  </span>
                )}
                {!selected.unlocked && (
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{
                    color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                    background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  }}>
                    Ej upplåst
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// DiceCoin Vault — Dramatic coin showcase with floating animation
// =============================================================================

function DiceCoinVault({
  balance = 1250,
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  balance?: number
  accentColor?: string
  isDarkMode?: boolean
}) {
  const [displayBalance, setDisplayBalance] = useState(0)
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const goldAccent = '#f5a623'

  // Animate counter on mount
  useEffect(() => {
    let frame: number
    const duration = 1500
    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayBalance(Math.floor(eased * balance))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [balance])

  const transactions = [
    { label: 'Kurs slutförd', amount: +150, time: 'Idag' },
    { label: 'Butikköp: Ram', amount: -200, time: 'Igår' },
    { label: 'Streak-bonus ×7', amount: +75, time: '2d sedan' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: textColor }}>DiceCoin</h3>
        <span className="text-xs" style={{ color: textMuted }}>Valuta</span>
      </div>

      {/* Vault card */}
      <div
        className="relative rounded-2xl overflow-hidden p-6"
        style={{
          background: isDarkMode
            ? `linear-gradient(135deg, ${accentColor}14 0%, ${accentColor}06 50%, ${accentColor}08 100%)`
            : `linear-gradient(135deg, ${accentColor}0a 0%, ${accentColor}04 50%, ${accentColor}06 100%)`,
          border: `1px solid ${accentColor}${isDarkMode ? '25' : '18'}`,
          boxShadow: `0 0 40px ${accentColor}15, inset 0 1px 0 ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
        }}
      >
        {/* Floating mini coins */}
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: `${15 + i * 18}%`,
              top: `${10 + (i % 3) * 20}%`,
              width: 16 + (i % 3) * 6,
              height: 16 + (i % 3) * 6,
              opacity: 0.15 + (i % 3) * 0.05,
              animation: `vault-float-${i % 3} ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          >
            <Image
              src="/icons/app-nav/dicecoin_v2.webp"
              alt=""
              width={22}
              height={22}
              className="w-full h-full object-contain"
            />
          </div>
        ))}

        {/* Center illustration + balance */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Main DiceCoin illustration with glow */}
          <div className="relative mb-3">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${goldAccent}25 0%, transparent 60%)`,
                transform: 'scale(2)',
                animation: 'vault-pulse 3s ease-in-out infinite',
              }}
            />
            <div className="relative" style={{ width: 100, height: 100 }}>
              <Image
                src="/icons/journey/account_dicecoin_webp.webp"
                alt="DiceCoin"
                width={100}
                height={100}
                className="object-contain drop-shadow-lg"
                style={{
                  filter: `drop-shadow(0 4px 16px ${goldAccent}50)`,
                  animation: 'vault-coin-bounce 2.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>

          {/* Balance counter */}
          <div
            className="text-3xl font-black tabular-nums tracking-tight"
            style={{
              color: textColor,
              textShadow: `0 0 20px ${goldAccent}30`,
            }}
          >
            {displayBalance.toLocaleString('sv-SE')}
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5" style={{ color: goldAccent }}>
            DiceCoin
          </p>
        </div>

        {/* Recent transactions */}
        <div className="relative z-10 mt-5 space-y-2">
          {transactions.map((tx, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg"
              style={{
                background: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{
                    backgroundColor: tx.amount > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: tx.amount > 0 ? '#22c55e' : '#ef4444',
                  }}
                >
                  {tx.amount > 0 ? '↑' : '↓'}
                </div>
                <span className="text-[11px]" style={{ color: textColor }}>{tx.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold tabular-nums"
                  style={{ color: tx.amount > 0 ? '#22c55e' : '#ef4444' }}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
                <span className="text-[9px]" style={{ color: textMuted }}>{tx.time}</span>
              </div>
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes vault-float-0 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(15deg); } }
          @keyframes vault-float-1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(-10deg); } }
          @keyframes vault-float-2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-8px) rotate(20deg); } }
          @keyframes vault-pulse { 0%,100% { opacity: 0.4; transform: scale(2.5); } 50% { opacity: 0.7; transform: scale(3); } }
          @keyframes vault-coin-bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            40% { transform: translateY(-10px) scale(1.03); }
            60% { transform: translateY(-4px) scale(1.01); }
          }
        `}</style>
      </div>
    </div>
  )
}

// =============================================================================
// Shop Showcase — Premium featured items with spotlight
// =============================================================================

const MOCK_SHOP_ITEMS = [
  { id: 's1', name: 'Neon-ram', price: 300, category: 'Ram', rarity: 'rare' as const, img: '/achievements/utmarkelser/lg/ic_dobblestar.png' },
  { id: 's2', name: 'Kosmisk titel', price: 500, category: 'Titel', rarity: 'epic' as const, img: '/achievements/utmarkelser/lg/ic_crown.png' },
  { id: 's3', name: 'Partikel-effekt', price: 750, category: 'Effekt', rarity: 'legendary' as const, img: '/achievements/utmarkelser/lg/ic_flash.png' },
]

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

function ShopShowcase({
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  accentColor?: string
  isDarkMode?: boolean
}) {
  const [activeIndex, setActiveIndex] = useState(1)
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'

  // Auto-rotate spotlight
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % MOCK_SHOP_ITEMS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const activeRarityColor = RARITY_COLORS[MOCK_SHOP_ITEMS[activeIndex].rarity]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: textColor }}>Butik</h3>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Utvalda</span>
      </div>

      {/* Shop hero illustration skeleton + showcase */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: isDarkMode
            ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.005) 100%)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        }}
      >
        {/* ── Shop Hero Illustration Skeleton ── */}
        <div className="relative flex flex-col items-center pt-6 pb-4">
          {/* Soft ambient glow behind illustration */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 50% 20%, ${accentColor}12 0%, transparent 100%)`,
            }}
          />

          {/* Skeleton placeholder for shop illustration (replace with real 3D asset) */}
          <div
            className="relative w-36 h-36 rounded-2xl flex items-center justify-center overflow-hidden"
          >
            <Image
              src="/icons/journey/butik_webp.webp"
              alt="Butik"
              width={144}
              height={144}
              className="object-contain drop-shadow-lg"
              style={{
                filter: `drop-shadow(0 4px 12px ${accentColor}30)`,
              }}
            />
          </div>

          {/* "Handla med DiceCoin" tagline */}
          <p className="mt-3 text-xs font-medium" style={{ color: textMuted }}>
            Handla med dina DiceCoins
          </p>
        </div>

        {/* Divider */}
        <div className="mx-6" style={{ height: 1, background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }} />

        {/* ── Featured Items Row ── */}
        <div className="relative px-4 pt-4 pb-6">
          {/* Soft glow behind active item — radial gradient that fades naturally */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none transition-all duration-1000"
            style={{
              background: `radial-gradient(ellipse 40% 80% at 50% 0%, ${activeRarityColor}12 0%, ${activeRarityColor}04 40%, transparent 100%)`,
            }}
          />

          <div className="relative z-10 flex items-end justify-center gap-6">
            {MOCK_SHOP_ITEMS.map((item, i) => {
              const isActive = i === activeIndex
              const rarityColor = RARITY_COLORS[item.rarity]

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col items-center transition-all duration-500 cursor-pointer",
                  )}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    transform: isActive ? 'scale(1.08) translateY(-4px)' : 'scale(0.92)',
                    opacity: isActive ? 1 : 0.5,
                  }}
                >
                  {/* Item image */}
                  <div
                    className="relative rounded-xl p-3 mb-2 transition-all duration-500"
                    style={{
                      background: isActive
                        ? `radial-gradient(circle at 50% 80%, ${rarityColor}20, transparent 70%)`
                        : 'transparent',
                    }}
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: `0 0 24px ${rarityColor}15` }}
                      />
                    )}
                    <Image
                      src={item.img}
                      alt={item.name}
                      width={isActive ? 44 : 32}
                      height={isActive ? 44 : 32}
                      className="object-contain transition-all duration-500"
                      style={{
                        filter: isActive ? `drop-shadow(0 0 8px ${rarityColor}50)` : 'none',
                        animation: isActive ? 'shop-float 3s ease-in-out infinite' : 'none',
                      }}
                    />
                  </div>

                  {/* Item name + price */}
                  <p className="text-[11px] font-medium text-center" style={{ color: isActive ? textColor : textMuted }}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-3 h-3 relative">
                      <Image src="/icons/app-nav/dicecoin_v2.webp" alt="" width={12} height={12} className="object-contain" />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: isActive ? '#f5a623' : textMuted }}>{item.price}</span>
                  </div>

                  {/* Rarity pill */}
                  <div
                    className="mt-1 px-2 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold"
                    style={{
                      backgroundColor: `${rarityColor}20`,
                      color: rarityColor,
                      opacity: isActive ? 1 : 0.4,
                    }}
                  >
                    {item.rarity}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Navigation dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {MOCK_SHOP_ITEMS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i === activeIndex ? RARITY_COLORS[MOCK_SHOP_ITEMS[i].rarity] : (isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                  transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)',
                  boxShadow: i === activeIndex ? `0 0 8px ${RARITY_COLORS[MOCK_SHOP_ITEMS[i].rarity]}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <style jsx>{`
          @keyframes shop-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes shop-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </div>
  )
}

// =============================================================================
// Course Journey Path — Winding learning road
// =============================================================================

const MOCK_COURSES = [
  { id: 'k1', name: 'Grundkurs', status: 'completed' as const, xp: 200, lessons: 8 },
  { id: 'k2', name: 'Lekar & övningar', status: 'active' as const, xp: 350, lessons: 12, progress: 0.6 },
  { id: 'k3', name: 'Ledarskap', status: 'locked' as const, xp: 500, lessons: 10 },
  { id: 'k4', name: 'Avancerat', status: 'locked' as const, xp: 750, lessons: 15 },
]

function CourseJourneyPath({
  accentColor = '#8661ff',
  isDarkMode = true,
}: {
  accentColor?: string
  isDarkMode?: boolean
}) {
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icons/journey/kurs_webp.webp"
            alt="Kurser"
            width={64}
            height={64}
            className="w-16 h-16 object-contain"
          />
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>Kurser</h3>
        </div>
        <span className="text-xs" style={{ color: textMuted }}>Din lärresa</span>
      </div>

      <div className="relative">
        {MOCK_COURSES.map((course, i) => {
          const isCompleted = course.status === 'completed'
          const isActive = course.status === 'active'
          const isLocked = course.status === 'locked'
          const statusColor = isCompleted ? '#22c55e' : (isActive ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'))
          const isLast = i === MOCK_COURSES.length - 1

          return (
            <div key={course.id} className="relative flex gap-4">
              {/* Path line + node */}
              <div className="flex flex-col items-center" style={{ width: 32 }}>
                {/* Node */}
                <div
                  className={cn(
                    "relative w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all",
                    isActive && "animate-pulse"
                  )}
                  style={{
                    background: isCompleted
                      ? `linear-gradient(135deg, ${statusColor}, ${statusColor}cc)`
                      : (isActive
                        ? `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`
                        : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')),
                    border: `2px solid ${statusColor}`,
                    boxShadow: (isCompleted || isActive) ? `0 0 15px ${statusColor}40` : 'none',
                  }}
                >
                  {isCompleted ? (
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  ) : isActive ? (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
                    />
                  ) : (
                    <svg viewBox="0 0 24 24" fill={isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'} className="w-4 h-4">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  )}
                </div>

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className="w-0.5 flex-1 my-1"
                    style={{
                      background: isCompleted
                        ? `linear-gradient(180deg, ${statusColor} 0%, ${MOCK_COURSES[i + 1].status === 'completed' ? statusColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)')} 100%)`
                        : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      minHeight: 24,
                    }}
                  />
                )}
              </div>

              {/* Course card */}
              <div
                className={cn(
                  "flex-1 rounded-xl p-3 mb-3 transition-all",
                  isLocked && "opacity-40"
                )}
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${accentColor}10 0%, ${accentColor}05 100%)`
                    : (isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${isActive ? `${accentColor}30` : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')}`,
                  boxShadow: isActive ? `0 0 20px ${accentColor}10` : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: isLocked ? textMuted : textColor }}>
                      {course.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>
                      {course.lessons} lektioner • {course.xp} XP
                    </p>
                  </div>
                  {isCompleted && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                      Klar
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${accentColor}20`, color: accentColor }}>
                      Pågår
                    </span>
                  )}
                </div>

                {/* Active course progress bar */}
                {isActive && course.progress !== undefined && (
                  <div className="mt-2">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: `${accentColor}15` }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${course.progress * 100}%`,
                          backgroundColor: accentColor,
                          boxShadow: `0 0 8px ${accentColor}60`,
                        }}
                      />
                    </div>
                    <p className="text-[9px] mt-1 text-right" style={{ color: accentColor }}>
                      {Math.round(course.progress * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Skill Tree Connection Lines (SVG)
// =============================================================================

function SkillTreeConnections({
  skillTree,
  accentColor,
  isDarkMode,
  maxCol,
}: {
  skillTree: SkillNode[]
  accentColor: string
  isDarkMode: boolean
  maxCol: number
}) {
  // Grid cell dimensions matching the grid: 90px cells, 10px col gap, 24px row gap
  const cellW = 90
  const cellH = 78
  const gapX = 10
  const gapY = 24

  const getCenterX = (col: number) => col * (cellW + gapX) + cellW / 2
  const getCenterY = (row: number) => row * (cellH + gapY) + cellH / 2

  const totalW = (maxCol + 1) * cellW + maxCol * gapX
  // Determine max row from tree
  const maxRow = Math.max(...skillTree.map(n => n.row))
  const totalH = (maxRow + 1) * cellH + maxRow * gapY

  const lineColor = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'

  return (
    <svg
      className="absolute pointer-events-none"
      width={totalW}
      height={totalH}
      style={{ zIndex: 1, left: 16, top: 12 }}
    >
      {skillTree.map((node) =>
        (node.connectsFrom || []).map((fromId) => {
          const fromNode = skillTree.find(n => n.id === fromId)
          if (!fromNode) return null

          const x1 = getCenterX(fromNode.col)
          const y1 = getCenterY(fromNode.row) + cellH / 2 - 4
          const x2 = getCenterX(node.col)
          const y2 = getCenterY(node.row) - cellH / 2 + 4

          const isActive = fromNode.status === 'completed'
          const midY = (y1 + y2) / 2

          return (
            <g key={`${fromId}-${node.id}`}>
              {/* Glow layer for active connections */}
              {isActive && (
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={4}
                  opacity={0.2}
                  style={{ filter: `blur(4px)` }}
                />
              )}
              {/* Main line */}
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={isActive ? accentColor : lineColor}
                strokeWidth={isActive ? 2 : 1}
                strokeDasharray={isActive ? 'none' : '4 4'}
                opacity={isActive ? 0.8 : 0.5}
              />
              {/* Animated dot on active connections */}
              {isActive && (
                <circle r={3} fill={accentColor}>
                  <animateMotion
                    dur="3s"
                    repeatCount="indefinite"
                    path={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  />
                </circle>
              )}
            </g>
          )
        })
      )}
    </svg>
  )
}

// =============================================================================
// Skill Tree Inline Component (expands inside header container)
// =============================================================================

function SkillTreeInline({
  currentFaction,
  viewingFaction,
  onFactionChange,
  completedPerFaction,
  isDarkMode,
  accentColor,
  onCosmeticApply,
  onResetDesign,
  designSettings,
}: {
  currentFaction: FactionId
  viewingFaction: FactionId
  onFactionChange: (faction: FactionId) => void
  completedPerFaction: Record<NonNullFactionId, number>
  isDarkMode: boolean
  accentColor: string
  onCosmeticApply?: (cosmeticKey: string) => void
  onResetDesign?: () => void
  designSettings?: JourneyDesignConfig
}) {
  const factions = getAllFactions()
  const factionList = Object.values(factions) as { id: FactionId; name: string }[]
  
  const viewingIndex = factionList.findIndex(f => f.id === viewingFaction)
  const viewingTheme = getFactionTheme(viewingFaction)
  const skillTree = generateSkillTree(viewingFaction, viewingFaction ? completedPerFaction[viewingFaction] || 0 : 0)

  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
  const textColor = isDarkMode ? 'white' : '#1a1a2e'
  const textMuted = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const accent = viewingTheme.accentColor

  const selectCurrentFaction = () => {
    onFactionChange(viewingFaction)
  }

  // Check if a node's cosmetic is currently active in design settings
  const isNodeActive = (node: SkillNode): boolean => {
    if (!node.cosmeticKey || !designSettings) return false
    const [category, value] = node.cosmeticKey.split(':')
    if (!category || !value) return false
    return (designSettings as unknown as Record<string, string>)[category] === value
  }

  const handleNodeClick = (node: SkillNode) => {
    if (node.status === 'locked') return
    if (node.cosmeticKey && onCosmeticApply) {
      // Toggle off if already active
      if (isNodeActive(node)) {
        const [category] = node.cosmeticKey.split(':')
        if (category) {
          const defaultValue = (DEFAULT_DESIGN_CONFIG as unknown as Record<string, string>)[category]
          onCosmeticApply(`${category}:${defaultValue}`)
        }
      } else {
        onCosmeticApply(node.cosmeticKey)
      }
    }
  }

  const maxRow = Math.max(...skillTree.map(n => n.row))
  const maxCol = Math.max(...skillTree.map(n => n.col))

  // Tier colors — subtle background bands
  const tierColors = ['transparent', `${accent}08`, `${accent}05`, `${accent}12`]

  return (
    <div className="relative">

      {/* Faction name & select */}
      <div className="text-center mb-2">
        <h3 className="text-base font-bold mb-1.5" style={{ color: textColor }}>
          {factionList[viewingIndex]?.name || 'Neutral'}
        </h3>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={selectCurrentFaction}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: viewingFaction === currentFaction 
                ? `${accent}25` 
                : accent,
              color: viewingFaction === currentFaction ? accent : 'white',
              border: `1px solid ${accent}`,
            }}
          >
            {viewingFaction === currentFaction ? '✓ Aktivt Tema' : 'Välj Detta Tema'}
          </button>
          {onResetDesign && (
            <button
              onClick={onResetDesign}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                color: textMuted,
                border: `1px solid ${borderColor}`,
              }}
            >
              Reset design
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: textMuted }}>
          {viewingFaction ? completedPerFaction[viewingFaction] || 0 : 0} / {skillTree.length} upplåsta
        </p>
      </div>

      {/* Skill Tree Grid */}
      <div className="flex justify-center pb-1">
        <div 
          className="relative px-4 py-3 rounded-2xl"
          style={{ 
            backgroundColor: cardBg, 
            border: `1px solid ${borderColor}`,
            width: `${(maxCol + 1) * 90 + maxCol * 10 + 32}px`,
          }}
        >
          <SkillTreeConnections
            skillTree={skillTree}
            accentColor={accent}
            isDarkMode={isDarkMode}
            maxCol={maxCol}
          />
          <div 
            className="relative grid"
            style={{ 
              gridTemplateColumns: `repeat(${maxCol + 1}, 90px)`,
              gap: '24px 10px',
              zIndex: 10,
            }}
          >
            {Array.from({ length: maxRow + 1 }).map((_, rowIndex) => (
              <div key={rowIndex} className="contents">
                {Array.from({ length: maxCol + 1 }).map((_, colIndex) => {
                  const node = skillTree.find(n => n.row === rowIndex && n.col === colIndex)
                  
                  if (!node) {
                    return <div key={`empty-${rowIndex}-${colIndex}`} className="w-[90px] h-[78px]" />
                  }

                  const isUnlocked = node.status === 'completed' || node.status === 'available'
                  const isLocked = node.status === 'locked'
                  const isPrestige = node.cosmeticCategory === 'prestige'
                  const isActive = isNodeActive(node)
                  const meta = node.cosmeticKey ? COSMETIC_META[node.cosmeticKey as keyof typeof COSMETIC_META] : null
                  const rarityColor = meta ? RARITY_BADGE_COLORS[meta.rarity] : accent

                  return (
                    <div
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={cn(
                        "relative w-[90px] h-[78px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all",
                        isUnlocked && "cursor-pointer hover:scale-105",
                        isLocked && "opacity-40"
                      )}
                      style={{
                        backgroundColor: isActive
                          ? `${accent}35`
                          : isUnlocked 
                            ? `${accent}15` 
                            : isPrestige && !isLocked
                              ? `${accent}10`
                              : tierColors[rowIndex] || (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                        border: isActive
                          ? `2px solid ${accent}`
                          : isPrestige 
                            ? `2px solid ${isLocked ? borderColor : `${accent}60`}`
                            : `1px solid ${isUnlocked ? `${accent}50` : borderColor}`,
                        boxShadow: isActive 
                          ? `0 0 18px ${accent}40, inset 0 0 12px ${accent}15` 
                          : isPrestige && !isLocked 
                            ? `0 0 20px ${accent}15`
                            : 'none',
                      }}
                      title={node.cosmeticKey 
                        ? `${meta?.rarity?.toUpperCase() || ''} — ${meta?.unlock || 'Tema-specifik'}\n${isActive ? 'Klicka för att avaktivera' : 'Klicka för att aktivera'}`
                        : node.label}
                    >
                      {/* Node icon — larger */}
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ 
                          color: isActive ? accent : isUnlocked ? `${accent}cc` : (isLocked ? textMuted : textColor),
                          backgroundColor: isActive ? `${accent}25` : 'transparent',
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

                      {/* Node label */}
                      <span 
                        className={cn(
                          "text-[10px] font-medium text-center leading-tight px-1",
                          isPrestige && "font-bold"
                        )}
                        style={{ color: isLocked ? textMuted : isPrestige ? accent : textColor }}
                      >
                        {node.label}
                      </span>

                      {/* Rarity dot */}
                      {meta && !isLocked && (
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: rarityColor, boxShadow: `0 0 4px ${rarityColor}` }} />
                      )}

                      {/* Active indicator — shown when this cosmetic is currently displayed */}
                      {isActive && (
                        <div 
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                          style={{ 
                            backgroundColor: accent,
                            color: 'white',
                            boxShadow: `0 0 8px ${accent}60`,
                          }}
                        >
                          ✓
                        </div>
                      )}

                      {/* Prestige glow ring */}
                      {isPrestige && isActive && (
                        <div className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{
                            animation: 'skill-prestige-glow 2s ease-in-out infinite',
                            boxShadow: `0 0 20px ${accent}40, 0 0 40px ${accent}20`,
                          }} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <style jsx>{`
            @keyframes skill-prestige-glow {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
          `}</style>
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

// =============================================================================
// Cosmetic Tier Select (for settings panel) — shows progression with tier numbers
// =============================================================================

const RARITY_LABELS: Record<string, string> = {
  common: 'Bas',
  rare: 'Sällsynt',
  epic: 'Episk',
  prestige: 'Prestige',
}

function CosmeticSelect({
  label,
  category,
  value,
  options,
  onChange,
}: {
  label: string
  category: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  const activeIndex = options.findIndex(o => o.value === value)

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">{label}</h4>
      <div className="space-y-1">
        {options.map((opt, i) => {
          const metaKey = `${category}:${opt.value}` as keyof typeof COSMETIC_META
          const meta = COSMETIC_META[metaKey]
          const isActive = value === opt.value
          const rarityColor = meta ? RARITY_BADGE_COLORS[meta.rarity] : '#9ca3af'
          const isUpgrade = i > activeIndex
          const isDowngrade = i < activeIndex
          const tierNum = i + 1

          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200",
                isActive
                  ? "bg-primary/15 ring-1 ring-primary/40"
                  : "hover:bg-muted/80"
              )}
            >
              {/* Tier indicator */}
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black transition-all",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )}
                style={{
                  backgroundColor: isActive ? accentForCategory(meta) : 'transparent',
                  border: isActive ? 'none' : `1px solid ${rarityColor}40`,
                  boxShadow: isActive ? `0 0 8px ${accentForCategory(meta)}60` : 'none',
                }}>
                {tierNum === 1 ? 'I' : tierNum === 2 ? 'II' : tierNum === 3 ? 'III' : tierNum === 4 ? 'IV' : 'V'}
              </div>

              {/* Label and meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {opt.label}
                  </span>
                  {meta && meta.rarity !== 'common' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${rarityColor}15`,
                        color: rarityColor,
                        border: `1px solid ${rarityColor}30`,
                      }}>
                      {RARITY_LABELS[meta.rarity] || meta.rarity}
                    </span>
                  )}
                </div>
                {meta && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {meta.unlock}
                  </span>
                )}
              </div>

              {/* Arrow indicators */}
              {!isActive && (
                <span className={cn(
                  "text-[10px] flex-shrink-0",
                  isUpgrade ? "text-green-500" : "text-muted-foreground/40"
                )}>
                  {isUpgrade ? '↑' : isDowngrade ? '↓' : ''}
                </span>
              )}
              {isActive && (
                <span className="text-primary text-xs flex-shrink-0">●</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function accentForCategory(meta: { rarity: string; unlock: string; exclusive?: boolean } | undefined): string {
  if (!meta) return '#9ca3af'
  return RARITY_BADGE_COLORS[meta.rarity] || '#9ca3af'
}

// =============================================================================
// Theme Unlock Overview — collapsible section showing what each theme unlocks
// =============================================================================

const THEME_OVERVIEW: { id: NonNullFactionId; emoji: string; name: string; color: string; unlocks: { category: string; label: string; key: string }[] }[] = [
  {
    id: 'void', emoji: '✦', name: 'Void', color: '#7c3aed',
    unlocks: [
      { category: '🌌 Bakgrund', label: 'Stjärnfält', key: 'backgroundEffect:stars' },
      { category: '✨ Avatar', label: 'Orbital', key: 'avatarEffect:orbit' },
      { category: '📊 XP-bar', label: 'Hyperspace', key: 'xpBarSkin:warp' },
      { category: '🌌 Bakgrund', label: 'Meteorer', key: 'backgroundEffect:meteors' },
      { category: '➖ Divider', label: 'Nebulosa', key: 'sectionDivider:nebula' },
      { category: '🖼️ Header', label: 'Stjärnbild', key: 'headerFrame:constellation' },
      { category: '🎨 Färgläge', label: 'Galaktisk', key: 'colorMode:galaxy' },
      { category: '👑 Titel', label: 'Void Walker', key: '' },
    ],
  },
  {
    id: 'sea', emoji: '🌊', name: 'Hav', color: '#0ea5e9',
    unlocks: [
      { category: '🌌 Bakgrund', label: 'Bubblor', key: 'backgroundEffect:bubbles' },
      { category: '✨ Avatar', label: 'Vattenkrusning', key: 'avatarEffect:ripple' },
      { category: '📊 XP-bar', label: 'Havsström', key: 'xpBarSkin:current' },
      { category: '🌌 Bakgrund', label: 'Vågor', key: 'backgroundEffect:waves' },
      { category: '➖ Divider', label: 'Tidvatten', key: 'sectionDivider:tide' },
      { category: '🖼️ Header', label: 'Korallrev', key: 'headerFrame:coral' },
      { category: '🎨 Färgläge', label: 'Iskristall', key: 'colorMode:ice' },
      { category: '👑 Titel', label: 'Sea Walker', key: '' },
    ],
  },
  {
    id: 'forest', emoji: '🌿', name: 'Skog', color: '#10b981',
    unlocks: [
      { category: '🌌 Bakgrund', label: 'Löv', key: 'backgroundEffect:leaves' },
      { category: '✨ Avatar', label: 'Sporer', key: 'avatarEffect:spores' },
      { category: '📊 XP-bar', label: 'Tillväxt', key: 'xpBarSkin:growth' },
      { category: '🌌 Bakgrund', label: 'Eldflugor', key: 'backgroundEffect:fireflies' },
      { category: '➖ Divider', label: 'Rötter', key: 'sectionDivider:roots' },
      { category: '🖼️ Header', label: 'Rankor', key: 'headerFrame:vines' },
      { category: '🎨 Färgläge', label: 'Giftigt Neon', key: 'colorMode:toxic' },
      { category: '👑 Titel', label: 'Forest Walker', key: '' },
    ],
  },
  {
    id: 'sky', emoji: '☀️', name: 'Himmel', color: '#f59e0b',
    unlocks: [
      { category: '🌌 Bakgrund', label: 'Moln', key: 'backgroundEffect:clouds' },
      { category: '✨ Avatar', label: 'Gloriagloria', key: 'avatarEffect:halo' },
      { category: '📊 XP-bar', label: 'Regnbåge', key: 'xpBarSkin:rainbow' },
      { category: '🌌 Bakgrund', label: 'Gudastrålar', key: 'backgroundEffect:rays' },
      { category: '➖ Divider', label: 'Bris', key: 'sectionDivider:breeze' },
      { category: '🖼️ Header', label: 'Norrsken', key: 'headerFrame:aurora' },
      { category: '🎨 Färgläge', label: 'Solnedgång', key: 'colorMode:sunset' },
      { category: '👑 Titel', label: 'Sky Walker', key: '' },
    ],
  },
]

function ThemeUnlockOverview({ currentDesign }: { currentDesign: JourneyDesignConfig }) {
  const [expandedTheme, setExpandedTheme] = useState<NonNullFactionId | null>(null)

  // Check if a cosmetic is currently active
  const isActive = (key: string) => {
    if (!key) return false
    const [category, value] = key.split(':')
    return category && value && (currentDesign as unknown as Record<string, string>)[category] === value
  }

  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">📦 Tema-upplåsningar</h4>
      <div className="space-y-1">
        {THEME_OVERVIEW.map(theme => {
          const isExpanded = expandedTheme === theme.id
          const activeCount = theme.unlocks.filter(u => isActive(u.key)).length

          return (
            <div key={theme.id}>
              <button
                onClick={() => setExpandedTheme(isExpanded ? null : theme.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:bg-muted/60"
                style={{
                  backgroundColor: isExpanded ? `${theme.color}10` : 'transparent',
                  border: `1px solid ${isExpanded ? `${theme.color}30` : 'transparent'}`,
                }}
              >
                <span className="text-sm">{theme.emoji}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: theme.color }}>
                  {theme.name}
                </span>
                {activeCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
                    {activeCount} aktiva
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{theme.unlocks.length} items</span>
                <svg 
                  viewBox="0 0 24 24" fill="currentColor" 
                  className="w-4 h-4 text-muted-foreground transition-transform"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                </svg>
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 mb-2 space-y-0.5">
                  {theme.unlocks.map((unlock, i) => {
                    const active = isActive(unlock.key)
                    const meta = unlock.key ? COSMETIC_META[unlock.key as keyof typeof COSMETIC_META] : null

                    return (
                      <div key={i}
                        className="flex items-center gap-2 px-2 py-1 rounded-md text-[10px]"
                        style={{
                          backgroundColor: active ? `${theme.color}15` : 'transparent',
                        }}
                      >
                        <span className="text-muted-foreground w-16 flex-shrink-0 truncate">{unlock.category}</span>
                        <span className={cn("font-medium flex-1", active && "font-bold")}
                          style={{ color: active ? theme.color : undefined }}>
                          {unlock.label}
                        </span>
                        {active && (
                          <span className="text-[8px] font-bold" style={{ color: theme.color }}>
                            ✓ AKTIV
                          </span>
                        )}
                        {meta && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: RARITY_BADGE_COLORS[meta.rarity] }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Journey Settings Panel
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
          🎨 Miljö / Tema
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* COSMETIC DESIGN LAYER                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="border-t border-border pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">
          💎 Design Skill Tree — Kosmetik
        </h3>
        <p className="text-[10px] text-muted-foreground/50 mb-4">
          Varje tier är en uppgradering. Högre = mer imponerande.
        </p>

        {/* ── Quick presets ── */}
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">⚡ Snabbval</h4>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[
              { label: 'Nybörjare', preset: { ...DEFAULT_DESIGN_CONFIG, avatarEffect: 'none' as const, backgroundEffect: 'none' as const, colorMode: 'accent' as const } },
              { label: 'Avancerad', preset: { headerFrame: 'ornate' as const, avatarFrame: 'faction' as const, avatarEffect: 'pulse' as const, levelBadge: 'shield' as const, xpBarSkin: 'energy' as const, backgroundEffect: 'gradients' as const, sectionDivider: 'ornament' as const, colorMode: 'duo' as const } },
              { label: 'Prestige', preset: { headerFrame: 'mythic' as const, avatarFrame: 'animated' as const, avatarEffect: 'aura' as const, levelBadge: 'orb' as const, xpBarSkin: 'segmented' as const, backgroundEffect: 'rays' as const, sectionDivider: 'fade' as const, colorMode: 'rainbow' as const } },
            ].map(p => (
              <button key={p.label}
                onClick={() => onChange({ design: p.preset })}
                className="px-2 py-1.5 rounded-md text-[10px] font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-all hover:ring-1 hover:ring-primary/30"
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* ── Theme presets ── */}
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">🎭 Tema-paket</h4>
          <div className="grid grid-cols-2 gap-1">
            {([
              { label: '✦ Void', color: '#7c3aed', preset: { headerFrame: 'constellation' as const, avatarFrame: 'animated' as const, avatarEffect: 'orbit' as const, levelBadge: 'orb' as const, xpBarSkin: 'warp' as const, backgroundEffect: 'stars' as const, sectionDivider: 'nebula' as const, colorMode: 'galaxy' as const } },
              { label: '🌊 Hav', color: '#0ea5e9', preset: { headerFrame: 'coral' as const, avatarFrame: 'animated' as const, avatarEffect: 'ripple' as const, levelBadge: 'orb' as const, xpBarSkin: 'current' as const, backgroundEffect: 'bubbles' as const, sectionDivider: 'tide' as const, colorMode: 'ice' as const } },
              { label: '🌿 Skog', color: '#10b981', preset: { headerFrame: 'vines' as const, avatarFrame: 'animated' as const, avatarEffect: 'spores' as const, levelBadge: 'orb' as const, xpBarSkin: 'growth' as const, backgroundEffect: 'leaves' as const, sectionDivider: 'roots' as const, colorMode: 'toxic' as const } },
              { label: '☀️ Himmel', color: '#f59e0b', preset: { headerFrame: 'aurora' as const, avatarFrame: 'animated' as const, avatarEffect: 'halo' as const, levelBadge: 'orb' as const, xpBarSkin: 'rainbow' as const, backgroundEffect: 'clouds' as const, sectionDivider: 'breeze' as const, colorMode: 'sunset' as const } },
            ]).map(p => (
              <button key={p.label}
                onClick={() => onChange({ design: p.preset })}
                className="px-2 py-1.5 rounded-md text-[10px] font-medium transition-all hover:ring-1"
                style={{
                  backgroundColor: `${p.color}15`,
                  color: p.color,
                  border: `1px solid ${p.color}30`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Theme unlock overview (collapsible) ── */}
        <ThemeUnlockOverview currentDesign={settings.design} />

        {/* Header Frame */}
        <CosmeticSelect
          label="🖼️ Ramstil (Header)"
          category="headerFrame"
          value={settings.design.headerFrame}
          options={[
            { value: 'none', label: 'Ingen ram' },
            { value: 'minimal', label: 'Tunn accent' },
            { value: 'ornate', label: 'Guldfiligran' },
            { value: 'mythic', label: 'Runisk glöd' },
            { value: 'neon', label: 'Elektrisk neon' },
            { value: 'constellation', label: '✦ Stjärnbild' },
            { value: 'coral', label: '🌊 Korallrev' },
            { value: 'vines', label: '🌿 Rankor' },
            { value: 'aurora', label: '☀️ Norrsken' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, headerFrame: v as HeaderFrameStyle } })}
        />

        {/* Avatar Frame */}
        <CosmeticSelect
          label="🛡️ Avatarram"
          category="avatarFrame"
          value={settings.design.avatarFrame}
          options={[
            { value: 'default', label: 'Enkel ring' },
            { value: 'metallic', label: 'Kromsken' },
            { value: 'faction', label: 'Energi-dubbelring' },
            { value: 'animated', label: 'Orbiterande arcs' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, avatarFrame: v as AvatarFrameStyle } })}
        />

        {/* Avatar Effect */}
        <CosmeticSelect
          label="✨ Avatareffekt"
          category="avatarEffect"
          value={settings.design.avatarEffect}
          options={[
            { value: 'none', label: 'Ingen effekt' },
            { value: 'glow', label: 'Mjukt sken' },
            { value: 'pulse', label: 'Sonarringar' },
            { value: 'aura', label: 'Aurora-vortex' },
            { value: 'orbit', label: '✦ Orbital' },
            { value: 'ripple', label: '🌊 Vattenkrusning' },
            { value: 'spores', label: '🌿 Sporer' },
            { value: 'halo', label: '☀️ Gloriagloria' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, avatarEffect: v as AvatarEffectStyle } })}
        />

        {/* Level Badge */}
        <CosmeticSelect
          label="🎖️ Level-emblem"
          category="levelBadge"
          value={settings.design.levelBadge}
          options={[
            { value: 'flat', label: 'Textpill' },
            { value: 'shield', label: 'Heraldisk sköld' },
            { value: 'crest', label: 'Bevingad platta' },
            { value: 'orb', label: 'Svävande glödsfär' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, levelBadge: v as LevelBadgeStyle } })}
        />

        {/* XP Bar Skin */}
        <CosmeticSelect
          label="📊 XP-bar"
          category="xpBarSkin"
          value={settings.design.xpBarSkin}
          options={[
            { value: 'clean', label: 'Solid fyllning' },
            { value: 'shimmer', label: 'Vandrande ljus' },
            { value: 'energy', label: 'Plasmaflöde' },
            { value: 'segmented', label: 'Glödande celler' },
            { value: 'warp', label: '✦ Hyperspace' },
            { value: 'current', label: '🌊 Havsström' },
            { value: 'growth', label: '🌿 Tillväxt' },
            { value: 'rainbow', label: '☀️ Regnbåge' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, xpBarSkin: v as XPBarSkin } })}
        />

        {/* Background Effect */}
        <CosmeticSelect
          label="🌌 Bakgrundseffekt"
          category="backgroundEffect"
          value={settings.design.backgroundEffect}
          options={[
            { value: 'none', label: 'Ren bakgrund' },
            { value: 'particles', label: 'Svävande partiklar' },
            { value: 'gradients', label: 'Aurora-blobbar' },
            { value: 'noise', label: 'Filmkorn + scanlines' },
            { value: 'rays', label: 'Gudastrålar' },
            { value: 'stars', label: '✦ Stjärnfält' },
            { value: 'meteors', label: '✦ Meteorer' },
            { value: 'bubbles', label: '🌊 Bubblor' },
            { value: 'waves', label: '🌊 Vågor' },
            { value: 'leaves', label: '🌿 Löv' },
            { value: 'fireflies', label: '🌿 Eldflugor' },
            { value: 'clouds', label: '☀️ Moln' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, backgroundEffect: v as BackgroundEffectType } })}
        />

        {/* Section Divider */}
        <CosmeticSelect
          label="➖ Sektionsavdelare"
          category="sectionDivider"
          value={settings.design.sectionDivider}
          options={[
            { value: 'line', label: 'Tunn linje' },
            { value: 'glow', label: 'Energipuls' },
            { value: 'ornament', label: 'Diamantmönster' },
            { value: 'fade', label: 'Filmiskt band' },
            { value: 'nebula', label: '✦ Nebulosa' },
            { value: 'tide', label: '🌊 Tidvatten' },
            { value: 'roots', label: '🌿 Rötter' },
            { value: 'breeze', label: '☀️ Bris' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, sectionDivider: v as SectionDividerStyle } })}
        />

        {/* Color Mode */}
        <CosmeticSelect
          label="🎨 Färgläge"
          category="colorMode"
          value={settings.design.colorMode}
          options={[
            { value: 'accent', label: 'Enfärgad (accent)' },
            { value: 'duo', label: 'Komplementärt par' },
            { value: 'rainbow', label: 'Regnbågsspektrum' },
            { value: 'fire', label: 'Eldflamma' },
            { value: 'ice', label: 'Iskristall' },
            { value: 'toxic', label: 'Giftigt neon' },
            { value: 'sunset', label: 'Solnedgång' },
            { value: 'galaxy', label: 'Galaktisk nebulosa' },
          ]}
          onChange={(v) => onChange({ design: { ...settings.design, colorMode: v as ColorMode } })}
        />
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
    design: { ...DEFAULT_DESIGN_CONFIG },
  })

  // Skill Tree state
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false)
  const [completedPerFaction, _setCompletedPerFaction] = useState<Record<NonNullFactionId, number>>({
    forest: 1,
    sea: 0,
    sky: 5,
    void: 2,
  })

  // Faction browsing state (lifted from SkillTreeInline so arrows can sit next to avatar)
  const allFactions = getAllFactions()
  const factionList = Object.values(allFactions) as { id: FactionId; name: string }[]
  const [viewingFaction, setViewingFaction] = useState<FactionId>((settings.selectedFaction as FactionId) || 'forest')
  const viewingIndex = factionList.findIndex(f => f.id === viewingFaction)
  const viewingThemeForArrows = getFactionTheme(viewingFaction)

  const navigateFactionParent = (direction: 'prev' | 'next') => {
    let newIndex = direction === 'prev' ? viewingIndex - 1 : viewingIndex + 1
    if (newIndex < 0) newIndex = factionList.length - 1
    if (newIndex >= factionList.length) newIndex = 0
    setViewingFaction(factionList[newIndex].id)
  }

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
    // Clean light backgrounds with subtle hue tinting from the faction accent
    gradientFrom: (() => {
      const hsl = hexToHSL(baseTheme.accentColor)
      return hslToHex(hsl.h, Math.min(hsl.s * 0.25, 20), 97) // near-white with hint of hue
    })(),
    gradientTo: (() => {
      const hsl = hexToHSL(baseTheme.accentColor)
      return hslToHex(hsl.h, Math.min(hsl.s * 0.2, 15), 94) // slightly warmer white
    })(),
    glowColor: `${baseTheme.accentColor}15`,
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
      <div className="relative min-h-[700px] rounded-2xl" style={{ overflow: 'clip' }}>
        {/* Background Layer - always the base gradient */}
        <div 
          className="absolute inset-0 transition-colors duration-1000"
          style={{
            background: `linear-gradient(180deg, ${theme.gradientFrom} 0%, ${theme.gradientTo} 100%)`,
          }}
        />

        {/* Background effects — sticky so they stay visible during scroll */}
        <div className="sticky top-0 z-[2] pointer-events-none" style={{ height: 0, overflow: 'visible' }}>
          <div className="absolute inset-x-0 top-0" style={{ height: '100vh' }}>
            {/* Particle field (only when background is 'particles') */}
            {settings.particleCount > 0 && (settings.design.backgroundEffect === 'particles' || settings.design.backgroundEffect === 'none') && (
              <CleanParticleField
                particleCount={settings.particleCount}
                accentColor={theme.accentColor}
                isDarkMode={settings.isDarkMode}
                colorMode={settings.design.colorMode}
              />
            )}

            {/* Background Effects Layer */}
            <BackgroundEffectsLayer
              effectType={settings.design.backgroundEffect}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
              colorMode={settings.design.colorMode}
            />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg mx-auto pt-12 px-4 pb-16">
          
          {/* ========== HEADER GLASS CONTAINER ========== */}
          <div 
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: settings.headerStyle === 'image' && settings.headerImageUrl 
                ? 'transparent' 
                : (settings.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${settings.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
              boxShadow: isSkillTreeOpen
                ? `0 0 50px ${theme.glowColor}60, inset 0 1px 0 ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'}`
                : `0 0 30px ${theme.glowColor}40, inset 0 1px 0 ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'}`,
              marginBottom: isSkillTreeOpen ? 0 : 40,
              transition: 'box-shadow 500ms ease, margin-bottom 500ms ease',
            }}
          >
            {/* Optional header image background */}
            {settings.headerStyle === 'image' && settings.headerImageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={settings.headerImageUrl} 
                  alt="Header background" 
                  className="absolute w-full object-cover"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: isSkillTreeOpen ? 120 : '100%',
                    transition: 'height 500ms ease',
                    maskImage: isSkillTreeOpen 
                      ? 'linear-gradient(to bottom, black 40%, transparent 100%)' 
                      : 'none',
                    WebkitMaskImage: isSkillTreeOpen 
                      ? 'linear-gradient(to bottom, black 40%, transparent 100%)' 
                      : 'none',
                  }}
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

            {/* Header Frame Overlay */}
            <HeaderFrameOverlay
              frameStyle={settings.design.headerFrame}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
              colorMode={settings.design.colorMode}
            />

            {/* Header content */}
            <div className="relative z-10 px-6" style={{ 
              paddingTop: isSkillTreeOpen ? 16 : 40,
              paddingBottom: isSkillTreeOpen ? 8 : 40,
              transition: 'padding 400ms ease',
            }}>
              {/* Close button — top-right corner, only when expanded */}
              <button
                onClick={() => setIsSkillTreeOpen(false)}
                className="absolute right-3 top-3 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 z-30"
                style={{
                  opacity: isSkillTreeOpen ? 1 : 0,
                  pointerEvents: isSkillTreeOpen ? 'auto' : 'none',
                  backgroundColor: settings.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: settings.isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                  border: `1px solid ${settings.isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                  backdropFilter: 'blur(8px)',
                  transition: 'opacity 300ms ease, transform 150ms ease',
                }}
              >
                ✕
              </button>

              {/* Avatar row — with faction arrows flanking when expanded */}
              <div className="flex items-center justify-center gap-3">
                {/* Prev faction arrow */}
                <button
                  onClick={() => navigateFactionParent('prev')}
                  className="flex-shrink-0 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{
                    width: 44,
                    height: 44,
                    opacity: isSkillTreeOpen ? 1 : 0,
                    pointerEvents: isSkillTreeOpen ? 'auto' : 'none',
                    transform: isSkillTreeOpen ? 'translateX(0)' : 'translateX(20px)',
                    color: viewingThemeForArrows.accentColor,
                    backgroundColor: `${viewingThemeForArrows.accentColor}15`,
                    border: `1.5px solid ${viewingThemeForArrows.accentColor}35`,
                    transition: 'opacity 300ms ease 150ms, transform 300ms ease 150ms, background-color 200ms ease, border-color 200ms ease',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>

                {/* Avatar — shrinks and moves up when expanded */}
                <div 
                  style={{
                    marginBottom: isSkillTreeOpen ? 0 : 16,
                    transform: isSkillTreeOpen ? 'scale(0.55)' : 'scale(1)',
                    transformOrigin: 'top center',
                    transition: 'transform 400ms ease, margin-bottom 400ms ease',
                  }}
                >
                  <CleanAvatar
                    displayName={journey.displayName}
                    avatarUrl={journey.avatarUrl}
                    level={journey.level}
                    accentColor={theme.accentColor}
                    isDarkMode={settings.isDarkMode}
                    onAvatarClick={() => setIsSkillTreeOpen(!isSkillTreeOpen)}
                    avatarFrame={settings.design.avatarFrame}
                    avatarEffect={settings.design.avatarEffect}
                    levelBadge={settings.design.levelBadge}
                    colorMode={settings.design.colorMode}
                  />
                </div>

                {/* Next faction arrow */}
                <button
                  onClick={() => navigateFactionParent('next')}
                  className="flex-shrink-0 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                  style={{
                    width: 44,
                    height: 44,
                    opacity: isSkillTreeOpen ? 1 : 0,
                    pointerEvents: isSkillTreeOpen ? 'auto' : 'none',
                    transform: isSkillTreeOpen ? 'translateX(0)' : 'translateX(-20px)',
                    color: viewingThemeForArrows.accentColor,
                    backgroundColor: `${viewingThemeForArrows.accentColor}15`,
                    border: `1.5px solid ${viewingThemeForArrows.accentColor}35`,
                    transition: 'opacity 300ms ease 150ms, transform 300ms ease 150ms, background-color 200ms ease, border-color 200ms ease',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                  </svg>
                </button>
              </div>

              {/* Name + Faction tag — fade out when expanded */}
              <div style={{
                opacity: isSkillTreeOpen ? 0 : 1,
                maxHeight: isSkillTreeOpen ? 0 : 120,
                overflow: 'hidden',
                transition: 'opacity 250ms ease, max-height 400ms ease',
                pointerEvents: isSkillTreeOpen ? 'none' : 'auto',
              }}>
                <h2 
                  className="text-center text-2xl font-bold"
                  style={{ color: textColor }}
                >
                  {journey.displayName}
                </h2>

                {theme.name && theme.name !== 'Neutral' && (
                  <div className="flex justify-center mt-2">
                    <span
                      className="text-[11px] px-3 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: `${theme.accentColor}20`,
                        color: theme.accentColor,
                        border: `1px solid ${theme.accentColor}30`,
                      }}
                    >
                      {theme.name}
                    </span>
                  </div>
                )}

                <p
                  className="text-center text-[10px] mt-3 opacity-0 hover:opacity-100 transition-opacity duration-500"
                  style={{ color: settings.isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}
                >
                  Tryck på din avatar för Design Tree
                </p>
              </div>

              {/* Skill Tree Inline — fade in when expanded */}
              <div style={{
                opacity: isSkillTreeOpen ? 1 : 0,
                maxHeight: isSkillTreeOpen ? 2000 : 0,
                overflow: isSkillTreeOpen ? 'visible' : 'hidden',
                transform: isSkillTreeOpen ? 'translateY(0)' : 'translateY(15px)',
                transition: isSkillTreeOpen 
                  ? 'opacity 400ms ease 200ms, max-height 500ms ease, transform 400ms ease 200ms' 
                  : 'opacity 200ms ease, max-height 400ms ease 100ms, transform 200ms ease',
                pointerEvents: isSkillTreeOpen ? 'auto' : 'none',
              }}>
                {isSkillTreeOpen && (
                  <SkillTreeInline
                    currentFaction={(settings.selectedFaction as FactionId) || 'forest'}
                    viewingFaction={viewingFaction}
                    onFactionChange={(faction) => {
                      handleSettingsChange({ selectedFaction: faction })
                      setViewingFaction(faction)
                    }}
                    completedPerFaction={completedPerFaction}
                    isDarkMode={settings.isDarkMode}
                    accentColor={theme.accentColor}
                    designSettings={settings.design}
                    onCosmeticApply={(cosmeticKey) => {
                      // Parse "category:value" and apply to design settings
                      const [category, value] = cosmeticKey.split(':')
                      if (category && value) {
                        handleSettingsChange({ design: { ...settings.design, [category]: value } })
                      }
                    }}
                    onResetDesign={() => {
                      handleSettingsChange({ design: { ...DEFAULT_DESIGN_CONFIG } })
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {/* ========== END HEADER GLASS CONTAINER ========== */}

          {/* ========== PAGE CONTENT — hidden when skill tree is open ========== */}
          <div style={{
            opacity: isSkillTreeOpen ? 0 : 1,
            maxHeight: isSkillTreeOpen ? 0 : 9999,
            overflow: 'hidden',
            transition: isSkillTreeOpen 
              ? 'opacity 200ms ease, max-height 400ms ease 100ms' 
              : 'opacity 400ms ease 300ms, max-height 500ms ease 200ms',
            pointerEvents: isSkillTreeOpen ? 'none' : 'auto',
          }}>

          {/* Faction Status Banner */}
          <div className="mb-6">
            <FactionStatusBanner
              factionName={theme.name || 'Neutral'}
              level={journey.level}
              memberSince={journey.memberSince}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <CleanProgressBar
              progress={settings.mockXPProgress}
              currentXP={journey.currentXP}
              xpToNextLevel={journey.xpToNextLevel}
              level={journey.level}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
              xpBarSkin={settings.design.xpBarSkin}
              colorMode={settings.design.colorMode}
            />
          </div>

          {/* ── Section: Stats ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} label="Statistik" dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <CleanStatCard
              icon={<Image src="/icons/journey/dicecoin_webp.webp" alt="DiceCoin" width={36} height={36} className="w-9 h-9 object-contain" />}
              label="DiceCoin"
              value={journey.totalCoins.toLocaleString('sv-SE')}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanStatCard
              icon={<Image src="/icons/journey/utmarkelser_v2_webp.webp" alt="Utmärkelser" width={36} height={36} className="w-9 h-9 object-contain" />}
              label="Utmärkelser"
              value={journey.badgeCount}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
            <CleanStatCard
              icon={<Image src="/icons/journey/streak_webp.webp" alt="Streak" width={36} height={36} className="w-9 h-9 object-contain" />}
              label="Streak"
              value={`${journey.currentStreak}d`}
              accentColor={theme.accentColor}
              isDarkMode={settings.isDarkMode}
            />
          </div>

          {/* Milestone Badge */}
          {journey.nextMilestone && (
            <div className="mt-6">
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

          {/* ── Section: Achievements Constellation ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} label="Utmärkelser" dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

          <BadgeShowcase
            accentColor={theme.accentColor}
            isDarkMode={settings.isDarkMode}
          />

          {/* ── Section: DiceCoin Vault ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} label="DiceCoin" dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

          <DiceCoinVault
            balance={journey.totalCoins}
            accentColor={theme.accentColor}
            isDarkMode={settings.isDarkMode}
          />

          {/* ── Section: Courses ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} label="Kurser" dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

          <CourseJourneyPath
            accentColor={theme.accentColor}
            isDarkMode={settings.isDarkMode}
          />

          {/* ── Section: Shop Showcase ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} label="Butik" dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

          <ShopShowcase
            accentColor={theme.accentColor}
            isDarkMode={settings.isDarkMode}
          />

          {/* ── Section: Actions ── */}
          <SectionDivider accentColor={theme.accentColor} isDarkMode={settings.isDarkMode} dividerStyle={settings.design.sectionDivider} colorMode={settings.design.colorMode} />

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
          {/* ========== END PAGE CONTENT ========== */}

        </div>
      </div>

      {/* Info footer */}
      <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">
          ✅ Ren CSS & React — inga externa bibliotek •
          Achievement-konstellation, DiceCoin-vault med animerad räknare, Butik-spotlight med rarity,
          Kursresa med path-nodes, faction-theming, glow, shimmer, 3D-effekter
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Klicka på avataren → Skill Tree • Butiken roterar automatiskt •
          Sektioner: Hero → Status → Progress → Stats → Achievements → DiceCoin → Courses → Shop → Actions
        </p>
      </div>
    </SandboxShell>
  )
}
