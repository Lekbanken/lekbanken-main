// Admin shared components
// Export all shared components for consistent admin UI

export { AdminPageHeader } from './AdminPageHeader';
export { AdminPageLayout, AdminSection, AdminGrid } from './AdminPageLayout';
export { AdminStatCard, AdminStatGrid } from './AdminStatCard';
export { AdminDataTable, AdminTableToolbar, AdminPagination } from './AdminDataTable';
export { AdminExportButton } from './AdminExportButton';
export { 
  AdminBulkActions, 
  useTableSelection,
  bulkActionPresets,
  type BulkAction,
} from './AdminBulkActions';
export { 
  AdminErrorState, 
  AdminEmptyState, 
  AdminFilterSelect,
  AdminCard,
} from './AdminStates';
export { 
  AdminBreadcrumbs, 
  buildBreadcrumbsFromPath, 
  adminLabelMap,
  type BreadcrumbItem,
} from './AdminBreadcrumbs';
export { 
  AdminConfirmDialog, 
  useConfirmDialog,
} from './AdminConfirmDialog';

// Status badges
export {
  ProductStatusBadge,
  StripeSyncStatusBadge,
  HealthStatusBadge,
  StripeLinkageBadge,
  type ProductStatus,
  type StripeSyncStatus,
  type HealthStatus,
  type StripeLinkageStatus,
} from './StatusBadges';

// Field components
export {
  FieldLabel,
  ReadOnlyField,
  FieldGroup,
  InfoBox,
} from './FieldComponents';

// Diff view
export {
  DiffView,
  DiffRow,
  type DiffItem,
} from './DiffView';
