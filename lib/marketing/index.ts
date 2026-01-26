/**
 * Marketing Domain - Public Exports
 */

// Types
export * from './types';

// Transformers
export { transformFeatureRow, transformUpdateRow } from './transformers';

// API (server-only)
export {
  // Public read
  getPublishedFeatures,
  getFeaturedFeatures,
  getPublishedUpdates,
  // Admin CRUD
  getAllFeatures,
  getFeatureById,
  createFeature,
  updateFeature,
  deleteFeature,
  getAllUpdates,
  getUpdateById,
  createUpdate,
  updateUpdate,
  deleteUpdate,
  publishUpdate,
} from './api';
