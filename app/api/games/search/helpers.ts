import { z } from 'zod'

export const energyLevels = ['low', 'medium', 'high'] as const
export const locationTypes = ['indoor', 'outdoor', 'both'] as const

export const searchSchema = z.object({
  search: z.string().trim().max(200).optional(),
  tenantId: z.string().uuid().optional().nullable(),
  products: z.array(z.string().uuid()).optional(),
  mainPurposes: z.array(z.string().uuid()).optional(),
  subPurposes: z.array(z.string().uuid()).optional(),
  groupSizes: z.array(z.enum(['small', 'medium', 'large'] as const)).optional(),
  energyLevels: z.array(z.enum(energyLevels)).optional(),
  environment: z.enum(locationTypes).optional(),
  minPlayers: z.number().int().positive().optional(),
  maxPlayers: z.number().int().positive().optional(),
  minTime: z.number().int().positive().optional(),
  maxTime: z.number().int().positive().optional(),
  minAge: z.number().int().positive().optional(),
  maxAge: z.number().int().positive().optional(),
  sort: z.enum(['relevance', 'newest', 'popular', 'name', 'duration', 'rating']).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(24),
  status: z.enum(['published', 'draft', 'all']).optional(),
})

export type SearchInput = z.infer<typeof searchSchema>

export function normalizeEnvironment(env?: SearchInput['environment']) {
  if (env === undefined) return undefined
  if (env === 'both') return null
  return env
}

export function buildGroupSizeOr(groupSizes: string[]) {
  if (!groupSizes.length) return null
  const clauses: string[] = []

  if (groupSizes.includes('small')) {
    clauses.push('and(min_players.lte.6)')
  }

  if (groupSizes.includes('medium')) {
    clauses.push('and(min_players.gte.6,max_players.lte.14)')
  }

  if (groupSizes.includes('large')) {
    clauses.push('and(min_players.gte.15)')
  }

  return clauses.length ? clauses.join(',') : null
}

export function computeHasMore(total: number, page: number, pageSize: number) {
  return page * pageSize < total
}
