/**
 * Marketing Admin Types
 */

import type {
  MarketingFeature,
  MarketingUpdate,
  FeatureAudience,
  FeatureUseCase,
  FeatureContext,
  FeatureStatus,
  UpdateType,
  UpdateStatus,
} from '@/lib/marketing/types';

// Re-export domain types
export type {
  MarketingFeature,
  MarketingUpdate,
  FeatureAudience,
  FeatureUseCase,
  FeatureContext,
  FeatureStatus,
  UpdateType,
  UpdateStatus,
};

// Admin-specific types
export type AdminTab = 'features' | 'updates';

export interface FeatureFormData {
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  imageUrl: string;
  audience: FeatureAudience;
  useCase: FeatureUseCase;
  context: FeatureContext;
  tags: string[];
  relatedGamesCount: number;
  priority: number;
  isFeatured: boolean;
  status: FeatureStatus;
}

export interface UpdateFormData {
  type: UpdateType;
  title: string;
  body: string;
  imageUrl: string;
  tags: string[];
  publishedAt: string;
  status: UpdateStatus;
}

export const EMPTY_FEATURE_FORM: FeatureFormData = {
  title: '',
  subtitle: '',
  description: '',
  iconName: '',
  imageUrl: '',
  audience: 'all',
  useCase: 'planning',
  context: 'any',
  tags: [],
  relatedGamesCount: 0,
  priority: 0,
  isFeatured: false,
  status: 'draft',
};

export const EMPTY_UPDATE_FORM: UpdateFormData = {
  type: 'feature',
  title: '',
  body: '',
  imageUrl: '',
  tags: [],
  publishedAt: '',
  status: 'draft',
};
