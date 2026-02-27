'use client'

import { useState } from 'react'
import { SandboxShell as SandboxShellV2 } from '../../components/shell/SandboxShellV2'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import type { CourseStatus, CourseDifficulty } from '@/types/learning'
import { Select } from '@/components/ui/select'

// Simplified mock type for sandbox (avoids strict typing for prototyping)
type MockCourse = {
  id: string
  tenant_id: string | null
  slug: string
  title: string
  description: string
  status: CourseStatus
  difficulty: CourseDifficulty
  tags: string[]
  content_json: Array<{ id: string; title: string; body: string }>
  quiz_json: Array<{ id: string; question: string; options: Array<{ id: string; text: string; isCorrect: boolean }> }>
  pass_score: number
  rewards_json: { dicecoin?: number; xp?: number; achievement_id?: string }
  duration_minutes: number
  version: number
  created_at: string
  updated_at: string
}

// Mock data for sandbox
const mockCourses: MockCourse[] = [
  {
    id: 'course-1',
    tenant_id: null,
    slug: 'intro-lekledare',
    title: 'Introduktion till Lekledare',
    description: 'Grundläggande kunskap för alla nya lekledare',
    status: 'active',
    difficulty: 'beginner',
    tags: ['grundkurs', 'obligatorisk'],
    content_json: [
      { id: 's1', title: 'Välkommen', body: 'Introduktion till rollen.' },
      { id: 's2', title: 'Ansvar', body: 'Dina uppgifter som lekledare.' },
    ],
    quiz_json: [
      { 
        id: 'q1', 
        question: 'Vad är viktigast för en lekledare?', 
        options: [
          { id: 'o1', text: 'Säkerhet', isCorrect: true },
          { id: 'o2', text: 'Hastighet', isCorrect: false },
        ]
      }
    ],
    pass_score: 80,
    rewards_json: { dicecoin: 100, xp: 50 },
    duration_minutes: 15,
    version: 1,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'course-2',
    tenant_id: null,
    slug: 'sakerhet-grundkurs',
    title: 'Säkerhet Grundkurs',
    description: 'Lär dig grundläggande säkerhetsrutiner',
    status: 'active',
    difficulty: 'beginner',
    tags: ['säkerhet', 'obligatorisk'],
    content_json: [
      { id: 's1', title: 'Riskbedömning', body: 'Hur du bedömer risker.' },
    ],
    quiz_json: [
      { 
        id: 'q1', 
        question: 'När ska du göra riskbedömning?', 
        options: [
          { id: 'o1', text: 'Före varje aktivitet', isCorrect: true },
          { id: 'o2', text: 'En gång per månad', isCorrect: false },
        ]
      }
    ],
    pass_score: 100,
    rewards_json: { dicecoin: 150, xp: 75, achievement_id: 'safety-certified' },
    duration_minutes: 20,
    version: 1,
    created_at: '2025-01-02T10:00:00Z',
    updated_at: '2025-01-02T10:00:00Z',
  },
  {
    id: 'course-3',
    tenant_id: null,
    slug: 'avancerad-ledarskap',
    title: 'Avancerat Ledarskap',
    description: 'Fördjupning i ledarskapsmetoder',
    status: 'draft',
    difficulty: 'advanced',
    tags: ['ledarskap', 'fördjupning'],
    content_json: [],
    quiz_json: [],
    pass_score: 70,
    rewards_json: { dicecoin: 300, xp: 150 },
    duration_minutes: 45,
    version: 1,
    created_at: '2025-01-03T10:00:00Z',
    updated_at: '2025-01-03T10:00:00Z',
  },
]

const statusConfig: Record<CourseStatus, { icon: typeof CheckCircleIcon; color: string; label: string }> = {
  active: { icon: CheckCircleIcon, color: 'text-green-500', label: 'Aktiv' },
  draft: { icon: ClockIcon, color: 'text-yellow-500', label: 'Utkast' },
  archived: { icon: ArchiveBoxIcon, color: 'text-gray-500', label: 'Arkiverad' },
}

const difficultyLabels: Record<CourseDifficulty, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
  expert: 'Expert',
}

const difficultyColors: Record<CourseDifficulty, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  advanced: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  expert: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<MockCourse[]>(mockCourses)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all')
  const [selectedCourse, setSelectedCourse] = useState<MockCourse | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna kurs?')) {
      setCourses(courses.filter(c => c.id !== id))
    }
  }

  return (
    <SandboxShellV2
      moduleId="learning"
      title="Kurser - Admin"
      description="Hantera kurser med text och quiz."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Kurser</h1>
            <p className="text-sm text-muted-foreground">
              {filteredCourses.length} av {courses.length} kurser
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCourse(null)
              setIsEditing(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <PlusIcon className="h-4 w-4" />
            Ny kurs
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Sök kurser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CourseStatus | 'all')}
              options={[
                { value: 'all', label: 'Alla status' },
                { value: 'active', label: 'Aktiva' },
                { value: 'draft', label: 'Utkast' },
                { value: 'archived', label: 'Arkiverade' },
              ]}
            />
          </div>
        </div>

        {/* Course List */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Kurs</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground sm:table-cell">Nivå</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground md:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-left text-sm font-medium text-muted-foreground lg:table-cell">Belöningar</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCourses.map((course) => {
                const StatusIcon = statusConfig[course.status].icon
                return (
                  <tr key={course.id} className="hover:bg-muted/30">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-foreground">{course.title}</div>
                        <div className="text-sm text-muted-foreground">{course.description}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {course.tags.map(tag => (
                            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${difficultyColors[course.difficulty]}`}>
                        {difficultyLabels[course.difficulty]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-4 md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className={`h-4 w-4 ${statusConfig[course.status].color}`} />
                        <span className="text-sm">{statusConfig[course.status].label}</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <div className="text-sm">
                        {course.rewards_json?.dicecoin && (
                          <span className="text-amber-600">🪙 {course.rewards_json.dicecoin}</span>
                        )}
                        {course.rewards_json?.xp && (
                          <span className="ml-2 text-blue-600">⚡ {course.rewards_json.xp} XP</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedCourse(course)
                            setIsEditing(true)
                          }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Redigera"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Ta bort"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Inga kurser hittades
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Course Editor Modal (simplified) */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-6">
              <h2 className="text-xl font-semibold text-foreground">
                {selectedCourse ? 'Redigera kurs' : 'Skapa ny kurs'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kursredigeraren kommer att implementeras i nästa steg.
              </p>
              
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground">Titel</label>
                  <input
                    type="text"
                    defaultValue={selectedCourse?.title || ''}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Kursens titel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">Beskrivning</label>
                  <textarea
                    rows={3}
                    defaultValue={selectedCourse?.description || ''}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Kort beskrivning av kursen"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Select
                      label="Nivå"
                      value={selectedCourse?.difficulty || 'beginner'}
                      options={[
                        { value: 'beginner', label: 'Nybörjare' },
                        { value: 'intermediate', label: 'Medel' },
                        { value: 'advanced', label: 'Avancerad' },
                        { value: 'expert', label: 'Expert' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">Godkänd poäng (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={selectedCourse?.pass_score || 80}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
                  <p className="text-center text-sm text-muted-foreground">
                    📝 Innehållsredigerare och Quiz-byggare kommer snart
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Spara
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SandboxShellV2>
  )
}
