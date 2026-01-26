/**
 * Marketing Domain Types
 * 
 * Types for marketing features and updates displayed on public pages.
 */

// =============================================================================
// Enums / Literal Types
// =============================================================================

export type FeatureAudience = 'school' | 'business' | 'sports' | 'event' | 'all';
export type FeatureUseCase = 'planning' | 'execution' | 'export' | 'collaboration' | 'safety';
export type FeatureContext = 'indoor' | 'outdoor' | 'digital' | 'hybrid' | 'any';
export type FeatureStatus = 'draft' | 'published' | 'archived';

export type UpdateType = 'feature' | 'improvement' | 'fix' | 'milestone' | 'content';
export type UpdateStatus = 'draft' | 'published' | 'archived';

// =============================================================================
// Database Row Types
// =============================================================================

export interface MarketingFeatureRow {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon_name: string | null;
  image_url: string | null;
  audience: FeatureAudience;
  use_case: FeatureUseCase;
  context: FeatureContext;
  tags: string[];
  related_games_count: number | null;
  priority: number;
  is_featured: boolean;
  status: FeatureStatus;
  created_at: string;
  updated_at: string;
}

export interface MarketingUpdateRow {
  id: string;
  type: UpdateType;
  title: string;
  body: string | null;
  image_url: string | null;
  tags: string[];
  published_at: string | null;
  status: UpdateStatus;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// UI/Domain Types (transformed from DB rows)
// =============================================================================

export interface MarketingFeature {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  iconName?: string;
  imageUrl?: string;
  audience: FeatureAudience;
  useCase: FeatureUseCase;
  context: FeatureContext;
  tags: string[];
  relatedGamesCount: number;
  priority: number;
  isFeatured: boolean;
  status: FeatureStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketingUpdate {
  id: string;
  type: UpdateType;
  title: string;
  body?: string;
  imageUrl?: string;
  tags: string[];
  publishedAt?: Date;
  status: UpdateStatus;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface FeatureFilters {
  audience?: FeatureAudience;
  useCase?: FeatureUseCase;
  context?: FeatureContext;
  search?: string;
  status?: FeatureStatus;
  isFeatured?: boolean;
}

export interface UpdateFilters {
  type?: UpdateType;
  search?: string;
  status?: UpdateStatus;
}

// =============================================================================
// Form/Input Types (for admin CRUD)
// =============================================================================

export interface MarketingFeatureInput {
  title: string;
  subtitle?: string;
  description?: string;
  iconName?: string;
  imageUrl?: string;
  audience: FeatureAudience;
  useCase: FeatureUseCase;
  context: FeatureContext;
  tags: string[];
  relatedGamesCount?: number;
  priority?: number;
  isFeatured?: boolean;
  status?: FeatureStatus;
}

export interface MarketingUpdateInput {
  type: UpdateType;
  title: string;
  body?: string;
  imageUrl?: string;
  tags: string[];
  publishedAt?: Date;
  status?: UpdateStatus;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface FeaturesResponse {
  features: MarketingFeature[];
  total: number;
}

export interface UpdatesResponse {
  updates: MarketingUpdate[];
  total: number;
}

// =============================================================================
// Filter Options (for UI dropdowns)
// =============================================================================

export const AUDIENCE_OPTIONS: { value: FeatureAudience; label: string }[] = [
  { value: 'all', label: 'Alla' },
  { value: 'school', label: 'Skola' },
  { value: 'business', label: 'Företag' },
  { value: 'sports', label: 'Förening' },
  { value: 'event', label: 'Event' },
];

export const USE_CASE_OPTIONS: { value: FeatureUseCase; label: string }[] = [
  { value: 'planning', label: 'Planering' },
  { value: 'execution', label: 'Genomförande' },
  { value: 'export', label: 'Export' },
  { value: 'collaboration', label: 'Samarbete' },
  { value: 'safety', label: 'Säkerhet' },
];

export const CONTEXT_OPTIONS: { value: FeatureContext; label: string }[] = [
  { value: 'any', label: 'Alla miljöer' },
  { value: 'indoor', label: 'Inomhus' },
  { value: 'outdoor', label: 'Utomhus' },
  { value: 'digital', label: 'Digitalt' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const UPDATE_TYPE_OPTIONS: { value: UpdateType; label: string }[] = [
  { value: 'feature', label: 'Ny funktion' },
  { value: 'improvement', label: 'Förbättring' },
  { value: 'fix', label: 'Buggfix' },
  { value: 'milestone', label: 'Milstolpe' },
  { value: 'content', label: 'Nytt innehåll' },
];

export const STATUS_OPTIONS: { value: FeatureStatus; label: string }[] = [
  { value: 'draft', label: 'Utkast' },
  { value: 'published', label: 'Publicerad' },
  { value: 'archived', label: 'Arkiverad' },
];
