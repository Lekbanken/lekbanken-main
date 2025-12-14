import { NextResponse } from 'next/server'

type SessionRow = {
  id: string
  title: string
  tenantId: string | null
  tenantName: string
  host: string
  participants: number
  startedAt: string
  status: 'active' | 'completed' | 'flagged'
}

const sessions: SessionRow[] = [
  {
    id: 'sess-1',
    title: 'Fredagslek',
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'Lekbanken',
    host: 'Anna',
    participants: 12,
    startedAt: '2025-12-12T09:00:00Z',
    status: 'active',
  },
  {
    id: 'sess-2',
    title: 'Workshop QA',
    tenantId: '00000000-0000-0000-0000-000000000002',
    tenantName: 'Campus Nord',
    host: 'Oskar',
    participants: 8,
    startedAt: '2025-12-11T15:00:00Z',
    status: 'completed',
  },
  {
    id: 'sess-3',
    title: 'Trygghetspass',
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'Lekbanken',
    host: 'Mia',
    participants: 15,
    startedAt: '2025-12-12T08:30:00Z',
    status: 'flagged',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  const filtered = tenantId ? sessions.filter((s) => s.tenantId === tenantId) : sessions
  return NextResponse.json({ sessions: filtered })
}
