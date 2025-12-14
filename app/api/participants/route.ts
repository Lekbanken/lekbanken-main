import { NextResponse } from 'next/server'

type Participant = {
  id: string
  name: string
  email?: string
  tenantId: string | null
  tenantName: string
  lastActive: string
  risk: 'none' | 'low' | 'high'
}

// Mocked participants until real data is wired
const participants: Participant[] = [
  {
    id: 'p-1',
    name: 'Nora Nilsson',
    email: 'nora@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T09:05:00Z',
    risk: 'none',
  },
  {
    id: 'p-2',
    name: 'Oskar Åhman',
    email: 'oskar@example.com',
    tenantId: '00000000-0000-0000-0000-000000000002',
    tenantName: 'Campus Nord',
    lastActive: '2025-12-11T14:00:00Z',
    risk: 'low',
  },
  {
    id: 'p-3',
    name: 'Mia Månsson',
    email: 'mia@example.com',
    tenantId: '00000000-0000-0000-0000-000000000001',
    tenantName: 'Lekbanken',
    lastActive: '2025-12-12T08:50:00Z',
    risk: 'high',
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  const filtered = tenantId ? participants.filter((p) => p.tenantId === tenantId) : participants

  return NextResponse.json({ participants: filtered })
}
