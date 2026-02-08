'use client';

import type { Database } from '@/types/supabase';

// ============================================================================
// CORE GAME TYPES
// ============================================================================

export type GameStatus = Database['public']['Enums']['game_status_enum'];
export type EnergyLevel = Database['public']['Enums']['energy_level_enum'];
export type LocationType = Database['public']['Enums']['location_type_enum'];
export type PlayMode = 'basic' | 'facilitated' | 'participants';

/**
 * Visibility scope for games
 * - global: Available to all tenants
 * - tenant: Available to specific tenant(s)
 * - template: Available as a template only (for duplication)
 */
export type VisibilityScope = 'global' | 'tenant' | 'template';

/**
 * Owner/source type for games
 * - system: Created by Lekbanken (system games)
 * - imported: Created via CSV/JSON import
 * - tenant: Created by a tenant
 * - ai_generated: Created with AI assistance
 */
export type OwnerSource = 'system' | 'imported' | 'tenant' | 'ai_generated';

/**
 * Validation state for games
 */
export type ValidationState = 
  | 'valid'           // All checks passed
  | 'warnings'        // Playable but has warnings
  | 'errors'          // Has errors preventing publish
  | 'pending'         // Validation not yet run
  | 'outdated';       // Schema has changed since last validation

/**
 * Import source metadata
 */
export type ImportSource = {
  type: 'csv' | 'json' | 'manual' | 'ai';
  importedAt: string;
  importedBy?: string;
  batchId?: string;
  schemaVersion?: string;
};

/**
 * Extended game row for admin views
 */
export type GameAdminRow = {
  id: string;
  game_key: string | null;
  name: string;
  short_description: string | null;
  description: string | null;
  status: GameStatus;
  play_mode: PlayMode | null;
  
  // Classification
  category: string | null;
  energy_level: EnergyLevel | null;
  location_type: LocationType | null;
  
  // Player & time
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  
  // Relations
  owner_tenant_id: string | null;
  product_id: string | null;
  main_purpose_id: string | null;
  
  // Metadata
  game_content_version: string | null;
  created_at: string;
  updated_at: string;
  
  // Extended relations (populated by API)
  owner?: { id: string; name: string | null } | null;
  product?: { id: string; name: string | null } | null;
  main_purpose?: { id: string; name: string | null; type?: string | null } | null;
  secondary_purposes?: Array<{ 
    purpose: { id: string; name: string | null; type?: string | null } | null 
  }>;
  media?: Array<{
    kind: string;
    media: { id: string; url: string; alt_text: string | null } | null;
  }>;
  
  // Computed fields (populated by API)
  step_count?: number;
  phase_count?: number;
  role_count?: number;
  artifact_count?: number;
  trigger_count?: number;
  
  // Validation state
  validation_state?: ValidationState;
  validation_errors?: string[];
  validation_warnings?: string[];
  last_validated_at?: string;
  
  // Import metadata
  import_source?: ImportSource | null;
};

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Classification filters (game type, purpose, etc.)
 */
export type ClassificationFilters = {
  gameTypes?: string[];           // Activity, Escape Room, etc.
  mainPurposes?: string[];        // UUID[]
  subPurposes?: string[];         // UUID[]
  ageMin?: number;
  ageMax?: number;
  durationMin?: number;
  durationMax?: number;
};

/**
 * Play & execution filters
 */
export type PlayExecutionFilters = {
  playModes?: PlayMode[];
  requiredMaterials?: boolean;    // Has materials or not
  minPlayers?: number;
  maxPlayers?: number;
  locationType?: LocationType[];
  energyLevels?: EnergyLevel[];
};

/**
 * Lifecycle & quality filters
 */
export type LifecycleFilters = {
  statuses?: GameStatus[];
  hasPublishedVersion?: boolean;
  validationStates?: ValidationState[];
  needsReview?: boolean;
  hasAssets?: boolean;           // Has cover image etc.
};

/**
 * Ownership & scope filters
 */
export type OwnershipFilters = {
  ownerSources?: OwnerSource[];
  tenantIds?: string[];           // Specific tenant ownership
  isGlobal?: boolean;
  licenseTiers?: string[];
};

/**
 * Technical / admin filters
 */
export type TechnicalFilters = {
  schemaVersions?: string[];
  importSources?: ImportSource['type'][];
  hasMissingAssets?: boolean;
  hasValidationErrors?: boolean;
  gameContentVersions?: string[];
};

/**
 * Complete filter state
 */
export type GameAdminFilters = {
  // Search
  search?: string;
  
  // Filter groups
  classification?: ClassificationFilters;
  playExecution?: PlayExecutionFilters;
  lifecycle?: LifecycleFilters;
  ownership?: OwnershipFilters;
  technical?: TechnicalFilters;
  
  // Sort
  sortBy?: GameSortField;
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  page?: number;
  pageSize?: number;
};

/**
 * Sortable fields
 */
export type GameSortField = 
  | 'name'
  | 'created_at'
  | 'updated_at'
  | 'status'
  | 'play_mode'
  | 'step_count'
  | 'validation_state';

/**
 * Saved filter preset
 */
export type FilterPreset = {
  id: string;
  name: string;
  description?: string;
  filters: GameAdminFilters;
  isDefault?: boolean;
  createdBy?: string;
  createdAt: string;
};

// ============================================================================
// BULK OPERATION TYPES
// ============================================================================

/**
 * Bulk operation types
 */
export type BulkOperationType =
  | 'publish'
  | 'unpublish'
  | 'change_status'
  | 'assign_purposes'
  | 'remove_purposes'
  | 'add_tags'
  | 'remove_tags'
  | 'assign_tenant_availability'
  | 'change_visibility'
  | 'export'
  | 'revalidate'
  | 'archive'
  | 'delete'
  | 'assign_cover';

/**
 * Bulk operation parameters
 */
export type BulkOperationParams = {
  publish: Record<string, never>;
  unpublish: Record<string, never>;
  change_status: { status: GameStatus };
  assign_purposes: { purposeIds: string[]; mode: 'add' | 'replace' };
  remove_purposes: { purposeIds: string[] };
  add_tags: { tags: string[] };
  remove_tags: { tags: string[] };
  assign_tenant_availability: { tenantIds: string[]; mode: 'add' | 'remove' };
  change_visibility: { scope: VisibilityScope };
  export: { format: 'csv' | 'json'; includeRelations?: boolean };
  revalidate: Record<string, never>;
  archive: Record<string, never>;
  delete: { force?: boolean };
  assign_cover: Record<string, never>;
};

/**
 * Bulk operation request
 */
export type BulkOperationRequest<T extends BulkOperationType = BulkOperationType> = {
  operation: T;
  gameIds: string[];
  params: T extends keyof BulkOperationParams ? BulkOperationParams[T] : never;
};

/**
 * Bulk operation result
 */
export type BulkOperationResult = {
  success: boolean;
  affected: number;
  failed: number;
  errors?: Array<{ gameId: string; error: string }>;
  warnings?: Array<{ gameId: string; warning: string }>;
};

// ============================================================================
// GAME CARD (DRAWER) TYPES
// ============================================================================

/**
 * Game card tabs
 */
export type GameCardTab = 
  | 'overview'
  | 'content'
  | 'availability'
  | 'metadata'
  | 'history';

/**
 * Game content summary for "Content" tab
 */
export type GameContentSummary = {
  stepCount: number;
  phaseCount: number;
  roleCount: number;
  artifactCount: number;
  triggerCount: number;
  materialCount: number;
  hasBoardConfig: boolean;
  hasLeaderScript: boolean;
  hasParticipantPrompts: boolean;
  warnings: string[];
  errors: string[];
};

/**
 * Game availability info for "Availability" tab
 */
export type GameAvailability = {
  scope: VisibilityScope;
  isGlobal: boolean;
  tenantAvailability: Array<{
    tenantId: string;
    tenantName: string;
    enabled: boolean;
  }>;
  licenseRequirements: string[];
  activeTenantCount: number;
  totalSessionsPlayed: number;
};

/**
 * Game history entry for "History" tab
 */
export type GameHistoryEntry = {
  id: string;
  timestamp: string;
  action: 'created' | 'updated' | 'published' | 'unpublished' | 'imported' | 'validated';
  userId?: string;
  userName?: string;
  details?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

/**
 * Full game detail for the card drawer
 */
export type GameCardDetail = GameAdminRow & {
  contentSummary: GameContentSummary;
  availability: GameAvailability;
  history: GameHistoryEntry[];
  builderUrl: string;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated game list response
 */
export type GameListResponse = {
  games: GameAdminRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  metadata: {
    filterCounts?: Record<string, number>;
    appliedFilters?: GameAdminFilters;
  };
};

/**
 * Game detail response
 */
export type GameDetailResponse = {
  game: GameCardDetail;
};

/**
 * Select options for dropdowns
 */
export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
};

// ============================================================================
// TABLE COLUMN CONFIGURATION
// ============================================================================

/**
 * Configurable column for the game list table
 */
export type GameTableColumn = {
  id: string;
  label: string;
  accessor: keyof GameAdminRow | ((row: GameAdminRow) => unknown);
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  visible?: boolean;
  sticky?: boolean;
};

/**
 * Default columns configuration
 */
export const DEFAULT_COLUMNS: GameTableColumn[] = [
  { id: 'select', label: '', accessor: 'id', width: '40px', sticky: true, visible: true },
  { id: 'cover', label: '', accessor: 'media', width: '48px', visible: true },
  { id: 'name', label: 'Namn', accessor: 'name', sortable: true, minWidth: '200px', visible: true },
  { id: 'play_mode', label: 'Spelläge', accessor: 'play_mode', sortable: true, width: '120px', visible: true },
  { id: 'purposes', label: 'Syften', accessor: 'main_purpose', width: '150px', visible: true, hideBelow: 'lg' },
  { id: 'status', label: 'Status', accessor: 'status', sortable: true, width: '100px', visible: true },
  { id: 'validation', label: 'Validering', accessor: 'validation_state', width: '100px', visible: true, hideBelow: 'xl' },
  { id: 'owner', label: 'Ägare', accessor: 'owner', width: '120px', visible: true, hideBelow: 'md' },
  { id: 'updated_at', label: 'Uppdaterad', accessor: 'updated_at', sortable: true, width: '140px', visible: true, hideBelow: 'lg' },
  { id: 'actions', label: '', accessor: 'id', width: '48px', align: 'right', visible: true },
];

// ============================================================================
// PLAY MODE METADATA
// ============================================================================

export type PlayModeMeta = {
  key: PlayMode;
  label: string;
  labelShort: string;
  description: string;
  color: string;
  icon: string;
  features: string[];
};

export const PLAY_MODE_META: Record<PlayMode, PlayModeMeta> = {
  basic: {
    key: 'basic',
    label: 'Enkel lek',
    labelShort: 'Enkel',
    description: 'Traditionella lekar med steg och material. Ingen digital interaktion.',
    color: '#10b981',
    icon: 'puzzle',
    features: ['steps', 'materials'],
  },
  facilitated: {
    key: 'facilitated',
    label: 'Ledd aktivitet',
    labelShort: 'Ledd',
    description: 'Lekar med faser, timer och eventuellt en publik tavla.',
    color: '#2563eb',
    icon: 'users',
    features: ['steps', 'materials', 'phases', 'timer', 'board'],
  },
  participants: {
    key: 'participants',
    label: 'Deltagarlek',
    labelShort: 'Deltagare',
    description: 'Fullständiga interaktiva lekar med roller, artifacts och triggers.',
    color: '#a855f7',
    icon: 'sparkles',
    features: ['steps', 'materials', 'phases', 'roles', 'artifacts', 'triggers', 'board'],
  },
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export type ValidationRule = {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (game: GameAdminRow) => boolean;
  message: string;
};

export const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'has_name',
    name: 'Namn krävs',
    description: 'Spelet måste ha ett namn',
    severity: 'error',
    check: (game) => !game.name || game.name.trim().length === 0,
    message: 'Spelet saknar namn',
  },
  {
    id: 'has_description',
    name: 'Beskrivning krävs',
    description: 'Spelet bör ha en kort beskrivning',
    severity: 'warning',
    check: (game) => !game.short_description || game.short_description.trim().length === 0,
    message: 'Spelet saknar kort beskrivning',
  },
  {
    id: 'has_steps',
    name: 'Steg krävs',
    description: 'Spelet bör ha minst ett steg',
    severity: 'warning',
    check: (game) => (game.step_count ?? 0) === 0,
    message: 'Spelet saknar steg',
  },
  {
    id: 'has_purpose',
    name: 'Syfte krävs',
    description: 'Spelet bör ha ett huvudsyfte',
    severity: 'warning',
    check: (game) => !game.main_purpose_id,
    message: 'Spelet saknar huvudsyfte',
  },
  {
    id: 'has_cover',
    name: 'Omslagsbild krävs för publicering',
    description: 'Publicerade spel bör ha en omslagsbild',
    severity: 'warning',
    check: (game) => 
      game.status === 'published' && 
      !(game.media?.some(m => m.kind === 'cover' && m.media?.url)),
    message: 'Publicerat spel saknar omslagsbild',
  },
  {
    id: 'facilitated_has_phases',
    name: 'Ledda aktiviteter bör ha faser',
    description: 'Spel med spelläge "ledd aktivitet" bör ha definierade faser',
    severity: 'info',
    check: (game) => game.play_mode === 'facilitated' && (game.phase_count ?? 0) === 0,
    message: 'Ledd aktivitet saknar faser',
  },
  {
    id: 'participants_has_roles',
    name: 'Deltagarlekar bör ha roller',
    description: 'Spel med spelläge "deltagarlek" bör ha definierade roller',
    severity: 'info',
    check: (game) => game.play_mode === 'participants' && (game.role_count ?? 0) === 0,
    message: 'Deltagarlek saknar roller',
  },
];
