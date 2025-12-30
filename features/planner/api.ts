import type { PlannerPlan, PlannerBlock, PlannerVersion } from '@/types/planner'
import type { PlanCapabilities } from '@/lib/auth/capabilities'

type ErrorPayload = { error?: string | { code?: string; message?: string }; errors?: string[] }

type PlanWithCapabilities = PlannerPlan & { _capabilities?: PlanCapabilities }

export type PlanSearchResult = {
  plans: PlanWithCapabilities[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as ErrorPayload
    const errors = payload?.errors
    const errorObj = typeof payload?.error === 'object' ? payload.error : null
    const message =
      errorObj?.message ||
      (typeof payload?.error === 'string' ? payload.error : undefined) ||
      (Array.isArray(errors) ? errors.join(', ') : undefined) ||
      res.statusText
    throw new Error(message || 'Request failed')
  }
  return (await res.json()) as T
}

export async function fetchPlans(query?: { search?: string; tenantId?: string | null; page?: number; pageSize?: number }): Promise<PlanWithCapabilities[]> {
  const res = await fetch('/api/plans/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 1, pageSize: 50, ...query }),
  })
  const data = await handleJson<PlanSearchResult>(res)
  return data.plans
}

export async function fetchPlansWithPagination(query?: { search?: string; tenantId?: string | null; page?: number; pageSize?: number }): Promise<PlanSearchResult> {
  const res = await fetch('/api/plans/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 1, pageSize: 20, ...query }),
  })
  return handleJson<PlanSearchResult>(res)
}

export async function fetchPlan(planId: string) {
  const res = await fetch(`/api/plans/${planId}`)
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function createPlan(payload: {
  name: string
  description?: string | null
  visibility?: 'private' | 'tenant' | 'public'
  owner_tenant_id?: string | null
}) {
  const res = await fetch('/api/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function updatePlan(planId: string, payload: Partial<PlannerPlan>) {
  const res = await fetch(`/api/plans/${planId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      metadata: payload.metadata,
    }),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function updateVisibility(
  planId: string,
  payload: { visibility: 'private' | 'tenant' | 'public'; owner_tenant_id?: string | null }
) {
  const res = await fetch(`/api/plans/${planId}/visibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function addBlock(
  planId: string,
  payload: {
    block_type: 'game' | 'pause' | 'preparation' | 'custom'
    game_id?: string | null
    duration_minutes?: number | null
    title?: string | null
    notes?: string | null
    position?: number
    metadata?: Record<string, unknown> | null
    is_optional?: boolean | null
  }
): Promise<PlannerBlock> {
  const res = await fetch(`/api/plans/${planId}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ block: PlannerBlock }>(res)
  return data.block
}

export async function updateBlock(
  planId: string,
  blockId: string,
  payload: {
    block_type?: 'game' | 'pause' | 'preparation' | 'custom'
    game_id?: string | null
    duration_minutes?: number | null
    title?: string | null
    notes?: string | null
    position?: number
    metadata?: Record<string, unknown> | null
    is_optional?: boolean | null
  }
): Promise<PlannerBlock> {
  const res = await fetch(`/api/plans/${planId}/blocks/${blockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ block: PlannerBlock }>(res)
  return data.block
}

export async function deleteBlock(planId: string, blockId: string): Promise<{ deleted: boolean; id: string }> {
  const res = await fetch(`/api/plans/${planId}/blocks/${blockId}`, {
    method: 'DELETE',
  })
  const data = await handleJson<{ deleted: boolean; id: string }>(res)
  return data
}

export async function deletePlan(planId: string) {
  const res = await fetch(`/api/plans/${planId}`, {
    method: 'DELETE',
  })
  const data = await handleJson<{ deleted: boolean; id: string }>(res)
  return data
}

export async function reorderBlocks(planId: string, blockIds: string[]) {
  const res = await fetch(`/api/plans/${planId}/blocks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockIds }),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function savePrivateNote(planId: string, content: string) {
  const res = await fetch(`/api/plans/${planId}/notes/private`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  await handleJson(res)
}

export async function saveTenantNote(planId: string, content: string, tenantId?: string | null) {
  const res = await fetch(`/api/plans/${planId}/notes/tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, tenant_id: tenantId }),
  })
  await handleJson(res)
}

// NOTE: fetchPlayablePlan removed in Sprint 4 cleanup.
// Use features/play/api.ts:startRun() for new Run-based play flow.
// Legacy: fetchLegacyPlayView() still available for backward compatibility.

// -----------------------------------------------------------------------------
// Versioning API
// -----------------------------------------------------------------------------

export type PublishResult = {
  version: PlannerVersion
  plan: { id: string; status: string; currentVersionId: string }
}

export type VersionWithCurrent = PlannerVersion & { isCurrent: boolean }

export type VersionsResult = {
  versions: VersionWithCurrent[]
  currentVersionId: string | null
}

/**
 * Publish the current plan state as a new version.
 */
export async function publishPlan(planId: string): Promise<PublishResult> {
  const res = await fetch(`/api/plans/${planId}/publish`, {
    method: 'POST',
  })
  return handleJson<PublishResult>(res)
}

/**
 * Fetch all published versions of a plan.
 */
export async function fetchPlanVersions(planId: string): Promise<VersionsResult> {
  const res = await fetch(`/api/plans/${planId}/versions`)
  return handleJson<VersionsResult>(res)
}
