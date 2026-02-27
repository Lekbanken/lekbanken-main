/**
 * ArtifactTypeIcon — Shared icon renderer per artifact type.
 *
 * Extracted from BatchArtifactPanel (PR #1: Foundations).
 * Single source of truth for artifact type → icon mapping.
 * Covers all 22 ArtifactType values.
 *
 * Uses @heroicons/react/24/outline — the same icon system used
 * everywhere else in the play UI.
 */

import React from 'react';
import {
  KeyIcon,
  QuestionMarkCircleIcon,
  CircleStackIcon,
  Squares2X2Icon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  PuzzlePieceIcon,
  HashtagIcon,
  QrCodeIcon,
  LightBulbIcon,
  CubeIcon,
  MapPinIcon,
  MicrophoneIcon,
  BookmarkIcon,
  MegaphoneIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CubeTransparentIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import type { ArtifactType } from '@/types/games';

// =============================================================================
// Size mapping
// =============================================================================

const SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

// =============================================================================
// Icon mapping — all 22 types + fallback
// =============================================================================

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const ICON_MAP: Record<ArtifactType, IconComponent> = {
  // Basic content
  card: DocumentTextIcon,
  document: DocumentTextIcon,
  image: PhotoIcon,

  // Toolbelt
  conversation_cards_collection: ChatBubbleLeftRightIcon,

  // Code & Input puzzles
  keypad: KeyIcon,
  riddle: QuestionMarkCircleIcon,
  multi_answer: ListBulletIcon,

  // Media & Interaction
  audio: SpeakerWaveIcon,
  hotspot: CursorArrowRaysIcon,
  tile_puzzle: Squares2X2Icon,

  // Cryptography & Logic
  cipher: CircleStackIcon,
  logic_grid: Squares2X2Icon,

  // Special mechanics
  counter: HashtagIcon,
  qr_gate: QrCodeIcon,
  hint_container: LightBulbIcon,
  prop_confirmation: CubeIcon,
  location_check: MapPinIcon,
  sound_level: MicrophoneIcon,
  replay_marker: BookmarkIcon,

  // Session Cockpit artifacts
  signal_generator: MegaphoneIcon,
  time_bank_step: ClockIcon,
  empty_artifact: CubeTransparentIcon,
};

const FALLBACK_ICON: IconComponent = PuzzlePieceIcon;

// =============================================================================
// Component
// =============================================================================

export interface ArtifactTypeIconProps {
  /** The artifact type to render an icon for. */
  type: ArtifactType;
  /** Icon size. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes merged onto the SVG element. */
  className?: string;
}

/**
 * Renders the canonical icon for an artifact type.
 *
 * Usage:
 * ```tsx
 * <ArtifactTypeIcon type="keypad" size="md" />
 * ```
 */
export function ArtifactTypeIcon({ type, size = 'md', className }: ArtifactTypeIconProps) {
  const Icon = ICON_MAP[type] ?? FALLBACK_ICON;
  return <Icon className={`${SIZE_CLASSES[size]}${className ? ` ${className}` : ''}`} />;
}

/**
 * Get the icon component for an artifact type without rendering.
 * Useful when you need the component reference (e.g. for `React.ReactNode` maps).
 */
export function getArtifactTypeIcon(type: ArtifactType): IconComponent {
  return ICON_MAP[type] ?? FALLBACK_ICON;
}
