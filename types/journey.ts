/**
 * Journey (Resan) Domain Types
 * 
 * Defines the core data structures for the user's progression journey,
 * including factions, levels, XP, and visual theming.
 */

// =============================================================================
// Faction Types
// =============================================================================

export type FactionId = 'explorer' | 'guardian' | 'trickster' | 'sage' | null

export interface FactionTheme {
  id: FactionId
  name: string
  description: string
  
  // Primary colors
  accentColor: string           // Main accent (buttons, XP bar, highlights)
  accentColorMuted: string      // Low-opacity version for backgrounds
  
  // Scene gradient (dark, immersive)
  gradientFrom: string
  gradientTo: string
  
  // Optional effects (expansion)
  glowColor?: string            // Glow around key elements
  pattern?: string              // URL to subtle SVG pattern overlay
  
  // Icon styling hint
  iconVariant: 'sharp' | 'rounded' | 'organic'
}

// =============================================================================
// Journey State
// =============================================================================

export interface JourneyMilestone {
  type: 'level' | 'badge' | 'reward' | 'streak'
  label: string
  description?: string
  progress: number              // 0-100 percentage
  iconUrl?: string
}

export interface JourneyState {
  // Identity
  userId: string
  displayName: string
  avatarUrl?: string
  faction: FactionId
  
  // Progression
  level: number
  currentXP: number
  xpToNextLevel: number
  totalXP: number
  
  // Stats
  totalCoins: number
  badgeCount: number
  currentStreak: number         // Days in a row
  longestStreak: number
  
  // Next goal
  nextMilestone?: JourneyMilestone
  
  // Timestamps
  memberSince: string           // ISO date
  lastActive?: string           // ISO date
}

// =============================================================================
// Component Props
// =============================================================================

export interface JourneyOverviewProps {
  journey: JourneyState
  theme: FactionTheme
  /** Compact mode for Dashboard card */
  compact?: boolean
  /** Disable blur/effects for low-end devices */
  reducedMotion?: boolean
}

export interface JourneySceneProps {
  theme: FactionTheme
  children: React.ReactNode
  className?: string
  /** Show faction pattern overlay */
  showPattern?: boolean
}

export interface JourneyIdentityProps {
  journey: JourneyState
  theme: FactionTheme
  size?: 'sm' | 'md' | 'lg'
}

export interface JourneyProgressProps {
  level: number
  currentXP: number
  xpToNextLevel: number
  theme: FactionTheme
  nextMilestone?: JourneyMilestone
  animated?: boolean
}

export interface JourneyStatsProps {
  coins: number
  badges: number
  streak: number
  theme: FactionTheme
}

export interface JourneyActionsProps {
  theme: FactionTheme
  onNavigate?: (path: string) => void
}

// =============================================================================
// Sandbox Test Harness
// =============================================================================

export interface JourneySandboxState {
  selectedFaction: FactionId
  isCompact: boolean
  reducedMotion: boolean
  mockLevel: number
  mockXPProgress: number        // 0-100
}
