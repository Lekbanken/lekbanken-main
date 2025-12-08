import type { Database } from '@/types/supabase'

type PlanVisibility = Database['public']['Enums']['plan_visibility_enum']
type PlanBlockType = Database['public']['Enums']['plan_block_type_enum']

type PlanPayload = Partial<Database['public']['Tables']['plans']['Insert']> & {
  visibility?: PlanVisibility
}

type PlanBlockPayload = Partial<Database['public']['Tables']['plan_blocks']['Insert']>

type ValidationResult = { ok: true } | { ok: false; errors: string[] }

type Mode = 'create' | 'update'

function push(errors: string[], condition: boolean, message: string) {
  if (condition) errors.push(message)
}

export function validatePlanPayload(
  payload: PlanPayload,
  options: { mode?: Mode; isSystemAdmin?: boolean } = {}
): ValidationResult {
  const mode = options.mode ?? 'create'
  const errors: string[] = []

  if (mode === 'create') {
    push(errors, !payload.name || payload.name.trim().length === 0, 'name is required')
  } else if (payload.name !== undefined && payload.name.trim().length === 0) {
    errors.push('name cannot be empty')
  }

  if (payload.visibility && !['private', 'tenant', 'public'].includes(payload.visibility)) {
    errors.push('visibility must be private, tenant, or public')
  }

  if (payload.visibility === 'tenant') {
    push(errors, !payload.owner_tenant_id, 'tenant visibility requires owner_tenant_id')
  }

  if (payload.visibility === 'public' && !options.isSystemAdmin) {
    errors.push('public visibility requires system admin')
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}

export function validatePlanBlockPayload(
  payload: PlanBlockPayload,
  options: { mode?: Mode } = {}
): ValidationResult {
  const mode = options.mode ?? 'create'
  const errors: string[] = []

  if (mode === 'create') {
    push(errors, !payload.block_type, 'block_type is required')
  }

  if (payload.block_type && !['game', 'pause', 'preparation', 'custom'].includes(payload.block_type)) {
    errors.push('block_type must be one of game, pause, preparation, custom')
  }

  if (payload.block_type === 'game') {
    push(errors, !payload.game_id, 'game_id is required for game blocks')
  }

  if (payload.duration_minutes !== undefined && payload.duration_minutes !== null) {
    if (payload.duration_minutes <= 0) {
      errors.push('duration_minutes must be positive when provided')
    }
  }

  if (payload.position !== undefined && payload.position < 0) {
    errors.push('position must be zero or positive')
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}
