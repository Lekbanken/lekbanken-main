import type { Database } from '@/types/supabase'

type ProductInsert = Database['public']['Tables']['products']['Insert']
type ValidationResult = { ok: true } | { ok: false; errors: string[] }
type ValidateMode = 'create' | 'update'

/** Matches lowercase alphanumeric slug: "teambuilding", "autism-npf" */
export const PRODUCT_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const allowedStatuses = ['active', 'inactive']

function isStr(v: unknown): v is string {
  return typeof v === 'string'
}

export function validateProductPayload(
  payload: Partial<ProductInsert>,
  options: { mode?: ValidateMode } = {}
): ValidationResult {
  const mode = options.mode || 'create'
  const errors: string[] = []

  // ── required fields (create only) ────────────────────────────
  if (mode === 'create') {
    if (!isStr(payload.name) || payload.name.trim().length === 0) {
      errors.push('name is required')
    }
    if (!isStr(payload.product_key) || payload.product_key.trim().length === 0) {
      errors.push('product_key is required')
    }
    if (!isStr(payload.category) || payload.category.trim().length === 0) {
      errors.push('category is required')
    }
  } else {
    // update: reject empty strings if the field is present
    if (payload.name !== undefined) {
      if (!isStr(payload.name) || payload.name.trim().length === 0) {
        errors.push('name cannot be empty')
      }
    }
    if (payload.category !== undefined) {
      if (!isStr(payload.category) || payload.category.trim().length === 0) {
        errors.push('category cannot be empty')
      }
    }
  }

  // ── product_key format (both create + update) ────────────────
  if (payload.product_key !== undefined) {
    if (!isStr(payload.product_key) || payload.product_key.trim().length === 0) {
      errors.push('product_key cannot be empty')
    } else if (!PRODUCT_KEY_RE.test(payload.product_key.trim().toLowerCase())) {
      errors.push('product_key must be a lowercase slug (a-z, 0-9, hyphens)')
    }
  }

  // ── status ───────────────────────────────────────────────────
  if (payload.status !== undefined) {
    if (!isStr(payload.status) || !allowedStatuses.includes(payload.status)) {
      errors.push(`status must be one of: ${allowedStatuses.join(', ')}`)
    }
  }

  // ── capabilities ─────────────────────────────────────────────
  if (payload.capabilities !== undefined) {
    if (!Array.isArray(payload.capabilities)) {
      errors.push('capabilities must be an array')
    } else if (!payload.capabilities.every((x) => typeof x === 'string')) {
      errors.push('capabilities must be string[]')
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true }
}
