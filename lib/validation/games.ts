import type { Database } from '@/types/supabase'

type GameInsert = Database['public']['Tables']['games']['Insert']
type ValidationResult = { ok: true } | { ok: false; errors: string[] }

type ValidateMode = 'create' | 'update' | 'publish'

const energyLevels = ['low', 'medium', 'high']
const locationTypes = ['indoor', 'outdoor', 'both']

function pushIfPresent(errors: string[], condition: boolean, message: string) {
  if (condition) errors.push(message)
}

export function validateGamePayload(
  payload: Partial<GameInsert> & { hasCoverImage?: boolean },
  options: { mode?: ValidateMode } = {}
): ValidationResult {
  const mode = options.mode || 'create'
  const errors: string[] = []

  const requireBase = mode === 'create'
  if (requireBase) {
    pushIfPresent(errors, !payload.name || payload.name.trim().length === 0, 'name is required')
    pushIfPresent(errors, !payload.short_description || payload.short_description.trim().length === 0, 'short_description is required')
    pushIfPresent(errors, !payload.main_purpose_id, 'main_purpose_id is required')
  } else {
    // When updating, only validate provided fields
    if (payload.name !== undefined && payload.name.trim().length === 0) {
      errors.push('name cannot be empty')
    }
    if (payload.short_description !== undefined && payload.short_description.trim().length === 0) {
      errors.push('short_description cannot be empty')
    }
  }

  if (payload.energy_level && !energyLevels.includes(payload.energy_level)) {
    errors.push('energy_level must be one of: low, medium, high')
  }

  if (payload.location_type && !locationTypes.includes(payload.location_type)) {
    errors.push('location_type must be one of: indoor, outdoor, both')
  }

  if (payload.time_estimate_min !== undefined && payload.time_estimate_min !== null) {
    if (payload.time_estimate_min <= 0) {
      errors.push('time_estimate_min must be positive')
    }
  }

  if (payload.min_players !== null && payload.min_players !== undefined &&
      payload.max_players !== null && payload.max_players !== undefined &&
      payload.min_players > payload.max_players) {
    errors.push('min_players cannot exceed max_players')
  }

  if (payload.age_min !== null && payload.age_min !== undefined &&
      payload.age_max !== null && payload.age_max !== undefined &&
      payload.age_min > payload.age_max) {
    errors.push('age_min cannot exceed age_max')
  }

  if (mode === 'publish') {
    if (payload.hasCoverImage === false) {
      errors.push('cover image is required before publish')
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}
