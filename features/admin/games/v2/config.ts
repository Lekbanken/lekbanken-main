/**
 * Game Admin Configuration
 * 
 * This module provides config-driven definitions for game types, purposes,
 * play modes, and other extensible categories. This allows the UI to be
 * data-driven rather than hardcoded, making it easier to add new game types
 * or modify existing ones without code changes.
 * 
 * ARCHITECTURE NOTES:
 * - All configs are designed to be loadable from a database in the future
 * - Icons are referenced by string keys to allow for server-side rendering
 * - Colors follow the design system conventions
 */

import type { PlayMode, ValidationState, EnergyLevel, LocationType } from './types';

// ============================================================================
// GAME TYPE DEFINITIONS
// ============================================================================

/**
 * Game type configuration
 * These represent the high-level categories of games (not play modes)
 */
export type GameTypeConfig = {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultPlayMode: PlayMode;
  requiredFeatures: string[];
  optionalFeatures: string[];
  sortOrder: number;
};

export const GAME_TYPE_CONFIGS: GameTypeConfig[] = [
  {
    key: 'activity',
    label: 'Aktivitet',
    description: 'Enkla lekar och aktiviteter utan digital interaktion',
    icon: 'puzzle-piece',
    color: '#10b981',
    defaultPlayMode: 'basic',
    requiredFeatures: ['steps'],
    optionalFeatures: ['materials', 'phases'],
    sortOrder: 1,
  },
  {
    key: 'escape_room',
    label: 'Escape Room',
    description: 'Komplexa spel med gåtor, triggers och artifacts',
    icon: 'key',
    color: '#f59e0b',
    defaultPlayMode: 'participants',
    requiredFeatures: ['steps', 'phases', 'artifacts', 'triggers'],
    optionalFeatures: ['roles', 'board'],
    sortOrder: 2,
  },
  {
    key: 'conversation_cards',
    label: 'Samtalkort',
    description: 'Kortspel för diskussion och reflektion',
    icon: 'chat-bubble',
    color: '#3b82f6',
    defaultPlayMode: 'facilitated',
    requiredFeatures: ['artifacts'],
    optionalFeatures: ['phases', 'board'],
    sortOrder: 3,
  },
  {
    key: 'quiz',
    label: 'Quiz',
    description: 'Frågesporter med poäng och svar',
    icon: 'question-mark-circle',
    color: '#8b5cf6',
    defaultPlayMode: 'facilitated',
    requiredFeatures: ['steps', 'phases'],
    optionalFeatures: ['artifacts', 'board'],
    sortOrder: 4,
  },
  {
    key: 'role_play',
    label: 'Rollspel',
    description: 'Spel där deltagare tar olika roller',
    icon: 'users',
    color: '#ec4899',
    defaultPlayMode: 'participants',
    requiredFeatures: ['roles', 'phases'],
    optionalFeatures: ['artifacts', 'triggers', 'board'],
    sortOrder: 5,
  },
  {
    key: 'outdoor',
    label: 'Utomhuslek',
    description: 'Fysiska aktiviteter för utomhusbruk',
    icon: 'sun',
    color: '#22c55e',
    defaultPlayMode: 'basic',
    requiredFeatures: ['steps', 'materials'],
    optionalFeatures: ['phases'],
    sortOrder: 6,
  },
  {
    key: 'team_building',
    label: 'Teambuilding',
    description: 'Aktiviteter för att stärka grupper',
    icon: 'user-group',
    color: '#06b6d4',
    defaultPlayMode: 'facilitated',
    requiredFeatures: ['steps', 'phases'],
    optionalFeatures: ['roles', 'materials', 'board'],
    sortOrder: 7,
  },
];

// ============================================================================
// PLAY MODE EXTENDED CONFIGURATION
// ============================================================================

export type PlayModeConfig = {
  key: PlayMode;
  label: string;
  labelShort: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  requiredForPublish: string[];
  uiSections: string[];
  sortOrder: number;
};

export const PLAY_MODE_CONFIGS: PlayModeConfig[] = [
  {
    key: 'basic',
    label: 'Enkel lek',
    labelShort: 'Enkel',
    description: 'Traditionella lekar med steg och material. Ingen digital interaktion.',
    icon: 'puzzle-piece',
    color: '#10b981',
    features: ['steps', 'materials'],
    requiredForPublish: ['name', 'short_description', 'steps'],
    uiSections: ['grundinfo', 'steg', 'material', 'media'],
    sortOrder: 1,
  },
  {
    key: 'facilitated',
    label: 'Ledd aktivitet',
    labelShort: 'Ledd',
    description: 'Lekar med faser, timer och eventuellt en publik tavla.',
    icon: 'user-group',
    color: '#2563eb',
    features: ['steps', 'materials', 'phases', 'timer', 'board'],
    requiredForPublish: ['name', 'short_description', 'steps', 'phases'],
    uiSections: ['grundinfo', 'steg', 'faser', 'material', 'tavla', 'media'],
    sortOrder: 2,
  },
  {
    key: 'participants',
    label: 'Deltagarlek',
    labelShort: 'Deltagare',
    description: 'Fullständiga interaktiva lekar med roller, artifacts och triggers.',
    icon: 'sparkles',
    color: '#a855f7',
    features: ['steps', 'materials', 'phases', 'roles', 'artifacts', 'triggers', 'board'],
    requiredForPublish: ['name', 'short_description', 'steps', 'phases', 'roles'],
    uiSections: ['grundinfo', 'steg', 'faser', 'roller', 'artifacts', 'triggers', 'tavla', 'material', 'media'],
    sortOrder: 3,
  },
];

// ============================================================================
// VALIDATION STATE CONFIGURATION
// ============================================================================

export type ValidationStateConfig = {
  key: ValidationState;
  label: string;
  description: string;
  icon: string;
  color: string;
  severity: 'success' | 'warning' | 'error' | 'info';
};

export const VALIDATION_STATE_CONFIGS: ValidationStateConfig[] = [
  {
    key: 'valid',
    label: 'Godkänd',
    description: 'Alla valideringskontroller passerade',
    icon: 'check-circle',
    color: '#10b981',
    severity: 'success',
  },
  {
    key: 'warnings',
    label: 'Varningar',
    description: 'Spelbart men har kvalitetsvarningar',
    icon: 'exclamation-triangle',
    color: '#f59e0b',
    severity: 'warning',
  },
  {
    key: 'errors',
    label: 'Fel',
    description: 'Har fel som förhindrar publicering',
    icon: 'x-circle',
    color: '#ef4444',
    severity: 'error',
  },
  {
    key: 'pending',
    label: 'Väntar',
    description: 'Validering har inte körts än',
    icon: 'clock',
    color: '#6b7280',
    severity: 'info',
  },
  {
    key: 'outdated',
    label: 'Inaktuell',
    description: 'Schema har ändrats sedan senaste validering',
    icon: 'information-circle',
    color: '#6b7280',
    severity: 'info',
  },
];

// ============================================================================
// ENERGY LEVEL CONFIGURATION
// ============================================================================

export type EnergyLevelConfig = {
  key: EnergyLevel;
  label: string;
  description: string;
  icon: string;
  color: string;
};

export const ENERGY_LEVEL_CONFIGS: EnergyLevelConfig[] = [
  {
    key: 'low',
    label: 'Låg',
    description: 'Lugna aktiviteter som kräver lite fysisk ansträngning',
    icon: 'minus',
    color: '#22c55e',
  },
  {
    key: 'medium',
    label: 'Medel',
    description: 'Aktiviteter med måttlig fysisk aktivitet',
    icon: 'equals',
    color: '#eab308',
  },
  {
    key: 'high',
    label: 'Hög',
    description: 'Energikrävande aktiviteter med mycket rörelse',
    icon: 'bolt',
    color: '#ef4444',
  },
];

// ============================================================================
// LOCATION TYPE CONFIGURATION
// ============================================================================

export type LocationTypeConfig = {
  key: LocationType | 'both';
  label: string;
  description: string;
  icon: string;
};

export const LOCATION_TYPE_CONFIGS: LocationTypeConfig[] = [
  {
    key: 'indoor',
    label: 'Inomhus',
    description: 'Aktiviteter för inomhusbruk',
    icon: 'home',
  },
  {
    key: 'outdoor',
    label: 'Utomhus',
    description: 'Aktiviteter för utomhusbruk',
    icon: 'sun',
  },
  {
    key: 'both',
    label: 'Båda',
    description: 'Fungerar både inomhus och utomhus',
    icon: 'arrows-right-left',
  },
];

// ============================================================================
// STATUS CONFIGURATION
// ============================================================================

export type GameStatusConfig = {
  key: 'draft' | 'published';
  label: string;
  description: string;
  icon: string;
  color: string;
  canTransitionTo: ('draft' | 'published')[];
};

export const GAME_STATUS_CONFIGS: GameStatusConfig[] = [
  {
    key: 'draft',
    label: 'Utkast',
    description: 'Arbete pågår, inte synligt för användare',
    icon: 'pencil',
    color: '#6b7280',
    canTransitionTo: ['published'],
  },
  {
    key: 'published',
    label: 'Publicerad',
    description: 'Synligt för användare med rätt behörighet',
    icon: 'check-circle',
    color: '#10b981',
    canTransitionTo: ['draft'],
  },
];

// ============================================================================
// BULK ACTION CONFIGURATION
// ============================================================================

export type BulkActionConfig = {
  key: string;
  label: string;
  description: string;
  icon: string;
  variant: 'default' | 'destructive' | 'outline';
  requiresConfirmation: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
  permissions: string[];
  enabled: boolean;
};

export const BULK_ACTION_CONFIGS: BulkActionConfig[] = [
  {
    key: 'publish',
    label: 'Publicera',
    description: 'Gör valda spel synliga',
    icon: 'check-circle',
    variant: 'default',
    requiresConfirmation: true,
    confirmTitle: 'Publicera spel?',
    confirmDescription: 'Valda spel blir synliga för användare.',
    permissions: ['admin.games.publish'],
    enabled: true,
  },
  {
    key: 'unpublish',
    label: 'Avpublicera',
    description: 'Dölj valda spel',
    icon: 'eye-slash',
    variant: 'outline',
    requiresConfirmation: true,
    confirmTitle: 'Avpublicera spel?',
    confirmDescription: 'Valda spel döljs från användare.',
    permissions: ['admin.games.publish'],
    enabled: true,
  },
  {
    key: 'revalidate',
    label: 'Validera om',
    description: 'Kör validering på nytt',
    icon: 'arrow-path',
    variant: 'outline',
    requiresConfirmation: false,
    permissions: ['admin.games.edit'],
    enabled: true,
  },
  {
    key: 'export',
    label: 'Exportera',
    description: 'Exportera till CSV eller JSON',
    icon: 'arrow-down-tray',
    variant: 'outline',
    requiresConfirmation: false,
    permissions: ['admin.games.export'],
    enabled: true,
  },
  {
    key: 'archive',
    label: 'Arkivera',
    description: 'Arkivera valda spel',
    icon: 'archive-box',
    variant: 'outline',
    requiresConfirmation: true,
    confirmTitle: 'Arkivera spel?',
    confirmDescription: 'Valda spel arkiveras.',
    permissions: ['admin.games.archive'],
    enabled: true,
  },
  {
    key: 'delete',
    label: 'Ta bort',
    description: 'Ta bort valda spel permanent',
    icon: 'trash',
    variant: 'destructive',
    requiresConfirmation: true,
    confirmTitle: 'Ta bort spel permanent?',
    confirmDescription: 'Denna åtgärd kan inte ångras.',
    permissions: ['admin.games.delete'],
    enabled: true,
  },
];

// ============================================================================
// TABLE COLUMN CONFIGURATION
// ============================================================================

export type TableColumnConfig = {
  key: string;
  label: string;
  accessor: string;
  sortable: boolean;
  filterable: boolean;
  defaultVisible: boolean;
  width?: string;
  minWidth?: string;
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
};

export const TABLE_COLUMN_CONFIGS: TableColumnConfig[] = [
  { key: 'select', label: '', accessor: 'id', sortable: false, filterable: false, defaultVisible: true, width: '40px' },
  { key: 'cover', label: '', accessor: 'media', sortable: false, filterable: false, defaultVisible: true, width: '48px' },
  { key: 'name', label: 'Namn', accessor: 'name', sortable: true, filterable: true, defaultVisible: true, minWidth: '200px' },
  { key: 'play_mode', label: 'Spelläge', accessor: 'play_mode', sortable: true, filterable: true, defaultVisible: true, width: '120px' },
  { key: 'main_purpose', label: 'Syfte', accessor: 'main_purpose.name', sortable: true, filterable: true, defaultVisible: true, hideBelow: 'lg' },
  { key: 'status', label: 'Status', accessor: 'status', sortable: true, filterable: true, defaultVisible: true, width: '100px' },
  { key: 'validation_state', label: 'Validering', accessor: 'validation_state', sortable: false, filterable: true, defaultVisible: true, hideBelow: 'xl' },
  { key: 'owner', label: 'Ägare', accessor: 'owner.name', sortable: true, filterable: true, defaultVisible: true, hideBelow: 'md' },
  { key: 'step_count', label: 'Steg', accessor: 'step_count', sortable: true, filterable: false, defaultVisible: false },
  { key: 'phase_count', label: 'Faser', accessor: 'phase_count', sortable: true, filterable: false, defaultVisible: false },
  { key: 'role_count', label: 'Roller', accessor: 'role_count', sortable: true, filterable: false, defaultVisible: false },
  { key: 'created_at', label: 'Skapad', accessor: 'created_at', sortable: true, filterable: false, defaultVisible: false },
  { key: 'updated_at', label: 'Uppdaterad', accessor: 'updated_at', sortable: true, filterable: false, defaultVisible: true, hideBelow: 'lg' },
  { key: 'actions', label: '', accessor: 'id', sortable: false, filterable: false, defaultVisible: true, width: '48px' },
];

// ============================================================================
// FUTURE FEATURE FLAGS
// ============================================================================

export type FeatureFlag = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
};

export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: 'ai_tagging',
    name: 'AI-assisterad taggning',
    description: 'Automatisk taggning av spel med AI',
    enabled: false,
  },
  {
    key: 'ai_quality_scoring',
    name: 'AI-kvalitetspoäng',
    description: 'AI-baserad kvalitetsanalys av spelinnehåll',
    enabled: false,
  },
  {
    key: 'duplicate_detection',
    name: 'Duplicatdetektering',
    description: 'Hitta potentiella duplicerade spel',
    enabled: false,
  },
  {
    key: 'review_workflow',
    name: 'Granskningsflöde',
    description: 'Formellt gransknings- och godkännandeflöde',
    enabled: false,
  },
  {
    key: 'system_badges',
    name: 'Systememblem',
    description: 'Verified, Featured, Experimental badges',
    enabled: false,
  },
  {
    key: 'virtualized_list',
    name: 'Virtualiserad lista',
    description: 'Prestanda-optimerad lista för 10000+ spel',
    enabled: false,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getGameTypeConfig(key: string): GameTypeConfig | undefined {
  return GAME_TYPE_CONFIGS.find(c => c.key === key);
}

export function getPlayModeConfig(key: PlayMode): PlayModeConfig | undefined {
  return PLAY_MODE_CONFIGS.find(c => c.key === key);
}

export function getValidationStateConfig(key: ValidationState): ValidationStateConfig | undefined {
  return VALIDATION_STATE_CONFIGS.find(c => c.key === key);
}

export function getEnergyLevelConfig(key: EnergyLevel): EnergyLevelConfig | undefined {
  return ENERGY_LEVEL_CONFIGS.find(c => c.key === key);
}

export function isFeatureEnabled(key: string): boolean {
  const flag = FEATURE_FLAGS.find(f => f.key === key);
  return flag?.enabled ?? false;
}
