export type PlannerVisibility = 'private' | 'tenant' | 'public'
export type PlannerBlockType = 'game' | 'pause' | 'preparation' | 'custom'
export type PlannerStatus = 'draft' | 'published' | 'modified' | 'archived'

export type PlannerGameSummary = {
  id: string
  title: string
  shortDescription?: string | null
  durationMinutes?: number | null
  coverUrl?: string | null
  energyLevel?: string | null
  locationType?: string | null
}

export type PlannerBlock = {
  id: string
  planId: string
  position: number
  blockType: PlannerBlockType
  durationMinutes?: number | null
  title?: string | null
  notes?: string | null
  isOptional?: boolean | null
  metadata?: Record<string, unknown> | null
  game?: PlannerGameSummary | null
}

export type PlannerNote = {
  id: string
  content: string
  updatedAt: string
  updatedBy: string
}

export type PlannerNotes = {
  privateNote?: PlannerNote | null
  tenantNote?: PlannerNote | null
}

export type PlannerVersion = {
  id: string
  planId: string
  versionNumber: number
  name: string
  description?: string | null
  totalTimeMinutes: number
  publishedAt: string
  publishedBy: string
}

export type PlannerPlan = {
  id: string
  name: string
  description?: string | null
  visibility: PlannerVisibility
  status: PlannerStatus
  ownerUserId: string
  ownerTenantId?: string | null
  totalTimeMinutes?: number | null
  currentVersionId?: string | null
  currentVersion?: PlannerVersion | null
  updatedAt: string
  metadata?: Record<string, unknown> | null
  blocks: PlannerBlock[]
  notes?: PlannerNotes
}

export type PlannerPlayBlock = {
  id: string
  type: PlannerBlockType
  title: string
  durationMinutes: number | null
  notes?: string | null
  game?: {
    id: string
    title: string
    summary?: string | null
    steps: { title: string; description?: string | null; durationMinutes?: number | null }[]
    materials?: string[] | null
    coverUrl?: string | null
  }
}

export type PlannerPlayView = {
  planId: string
  name: string
  blocks: PlannerPlayBlock[]
  totalDurationMinutes: number | null
}
