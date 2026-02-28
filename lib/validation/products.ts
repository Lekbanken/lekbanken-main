import type { Database } from '@/types/supabase'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ValidationResult = { ok: true } | { ok: false; errors: string[] }
type ValidateMode = 'create' | 'update'

const allowedStatuses = ['active', 'inactive']

function pushIf(errors: string[], condition: boolean, message: string) {
  if (condition) errors.push(message)
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

export function validateProductPayload(
  payload: Partial<ProductInsert>,
  options: { mode?: ValidateMode } = {}
): ValidationResult {
  const mode = options.mode || 'create'
  const errors: string[] = []

  if (mode === 'create') {
    pushIf(errors, !payload.name || payload.name.trim().length === 0, 'name is required')
    pushIf(errors, !payload.product_key || payload.product_key.trim().length === 0, 'product_key is required')
    pushIf(errors, !payload.category || payload.category.trim().length === 0, 'category is required')
  } else {
    if (payload.name !== undefined && payload.name.trim().length === 0) {
      errors.push('name cannot be empty')
    }
    if (payload.category !== undefined && payload.category.trim().length === 0) {
      errors.push('category cannot be empty')
    }
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    errors.push(`status must be one of: ${allowedStatuses.join(', ')}`)
  }

  if (payload.capabilities !== undefined && !isArray(payload.capabilities)) {
    errors.push('capabilities must be an array')
  }

  if (payload.product_key !== undefined) {
    if (payload.product_key === null || payload.product_key.trim().length === 0) {
      errors.push('product_key cannot be empty')
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}
