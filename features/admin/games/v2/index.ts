// Admin Games V2 - Scalable game management system
// This module provides an enhanced admin experience for managing thousands of games

// Main page component
export { GameAdminPageV2 } from './GameAdminPageV2';

// Types
export type {
  // Core types
  GameStatus,
  EnergyLevel,
  LocationType,
  PlayMode,
  VisibilityScope,
  OwnerSource,
  ValidationState,
  ImportSource,
  GameAdminRow,
  
  // Filter types
  ClassificationFilters,
  PlayExecutionFilters,
  LifecycleFilters,
  OwnershipFilters,
  TechnicalFilters,
  GameAdminFilters,
  GameSortField,
  FilterPreset,
  
  // Bulk operation types
  BulkOperationType,
  BulkOperationParams,
  BulkOperationRequest,
  BulkOperationResult,
  
  // Game card types
  GameCardTab,
  GameContentSummary,
  GameAvailability,
  GameHistoryEntry,
  GameCardDetail,
  
  // API types
  GameListResponse,
  GameDetailResponse,
  SelectOption,
  
  // Table types
  GameTableColumn,
  PlayModeMeta,
  ValidationRule,
} from './types';

// Constants
export {
  PLAY_MODE_META,
  DEFAULT_COLUMNS,
  VALIDATION_RULES,
} from './types';

// Components
export { GameCardDrawer } from './components/GameCardDrawer';
export { GameFilterPanel, GameFilterBar } from './components/GameFilterPanel';
export { GameBulkActionsBar, GameExportDialog, useBulkSelection } from './components/GameBulkActions';
