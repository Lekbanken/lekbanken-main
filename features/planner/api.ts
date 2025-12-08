import type { PlannerPlan, PlannerPlayView } from '@/types/planner'

async function handleJson<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    const errors = (payload as any)?.errors
    const message =
      (payload as any)?.error ||
      (Array.isArray(errors) ? errors.join(', ') : undefined) ||
      res.statusText
    throw new Error(message || 'Request failed')
  }
  return (await res.json()) as T
}

export async function fetchPlans(query?: { search?: string; tenantId?: string | null }) {
  const res = await fetch('/api/plans/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 1, pageSize: 50, ...query }),
  })
  const data = await handleJson<{ plans: PlannerPlan[] }>(res)
  return data.plans
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
) {
  const res = await fetch(`/api/plans/${planId}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
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
) {
  const res = await fetch(`/api/plans/${planId}/blocks/${blockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
}

export async function deleteBlock(planId: string, blockId: string) {
  const res = await fetch(`/api/plans/${planId}/blocks/${blockId}`, {
    method: 'DELETE',
  })
  const data = await handleJson<{ plan: PlannerPlan }>(res)
  return data.plan
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

export async function fetchPlayablePlan(planId: string) {
  const res = await fetch(`/api/plans/${planId}/play`)
  const data = await handleJson<{ play: PlannerPlayView }>(res)
  return data.play
}
