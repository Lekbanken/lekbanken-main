/**
 * Marketing Domain - Data Transformers
 * 
 * Transform between database rows and UI-friendly types.
 */

import type {
  MarketingFeatureRow,
  MarketingUpdateRow,
  MarketingFeature,
  MarketingUpdate,
  MarketingFeatureInput,
  MarketingUpdateInput,
} from './types';

// =============================================================================
// Feature Transformers
// =============================================================================

export function transformFeatureRow(row: MarketingFeatureRow): MarketingFeature {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    description: row.description ?? undefined,
    iconName: row.icon_name ?? undefined,
    imageUrl: row.image_url ?? undefined,
    audience: row.audience,
    useCase: row.use_case,
    context: row.context,
    tags: row.tags ?? [],
    relatedGamesCount: row.related_games_count ?? 0,
    priority: row.priority,
    isFeatured: row.is_featured,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function transformFeatureInput(input: MarketingFeatureInput): Partial<MarketingFeatureRow> {
  return {
    title: input.title,
    subtitle: input.subtitle ?? null,
    description: input.description ?? null,
    icon_name: input.iconName ?? null,
    image_url: input.imageUrl ?? null,
    audience: input.audience,
    use_case: input.useCase,
    context: input.context,
    tags: input.tags ?? [],
    related_games_count: input.relatedGamesCount ?? 0,
    priority: input.priority ?? 0,
    is_featured: input.isFeatured ?? false,
    status: input.status ?? 'draft',
  };
}

// =============================================================================
// Update Transformers
// =============================================================================

export function transformUpdateRow(row: MarketingUpdateRow): MarketingUpdate {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? undefined,
    imageUrl: row.image_url ?? undefined,
    tags: row.tags ?? [],
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function transformUpdateInput(input: MarketingUpdateInput): Partial<MarketingUpdateRow> {
  return {
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    image_url: input.imageUrl ?? null,
    tags: input.tags ?? [],
    published_at: input.publishedAt?.toISOString() ?? null,
    status: input.status ?? 'draft',
  };
}
