'use client'

import { useMemo, useState } from 'react'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Switch,
  Textarea,
} from '@/components/ui'
import { AddGameButton } from '@/features/planner/components/AddGameButton'
import { GamePicker } from '@/features/planner/components/GamePicker'
import { PreviewDialog } from '@/features/planner/components/PreviewDialog'
import { ShareDialog } from '@/features/planner/components/ShareDialog'
import { VersionsDialog } from '@/features/planner/components/VersionsDialog'
import { cn } from '@/lib/utils'
import type { PlannerBlock, PlannerPlan, PlannerStatus, PlannerVisibility } from '@/types/planner'
import type { VersionWithCurrent } from '@/features/planner/api'
import {
  Bars3BottomLeftIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  EyeIcon,
  PauseIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const demoPlanId = 'plan-demo-001'

type PlanSummary = {
  id: string
  name: string
  status: PlannerStatus
  visibility: PlannerVisibility
  blocks: number
  minutes: number
  updatedAt: string
}

const planSummaries: PlanSummary[] = [
  {
    id: demoPlanId,
    name: 'Detta är en testplan',
    status: 'draft',
    visibility: 'private',
    blocks: 4,
    minutes: 40,
    updatedAt: 'Idag 10:24',
  },
  {
    id: 'plan-demo-002',
    name: 'Skattjakt i skogen',
    status: 'published',
    visibility: 'public',
    blocks: 6,
    minutes: 55,
    updatedAt: 'Igår 17:05',
  },
  {
    id: 'plan-demo-003',
    name: 'Inomhus: samarbetsstationer',
    status: 'modified',
    visibility: 'tenant',
    blocks: 5,
    minutes: 35,
    updatedAt: '2025-01-22',
  },
]

const statusLabels: Record<PlannerStatus, string> = {
  draft: 'Utkast',
  published: 'Publicerad',
  modified: 'Ändrad',
  archived: 'Arkiverad',
}

const statusBadgeVariants: Record<PlannerStatus, 'warning' | 'success' | 'primary'> = {
  draft: 'warning',
  published: 'success',
  modified: 'primary',
  archived: 'warning',
}

const visibilityLabels: Record<PlannerVisibility, string> = {
  private: 'Privat',
  tenant: 'Organisation',
  public: 'Publik',
}

const blockMeta: Record<
  PlannerBlock['blockType'],
  { label: string; className: string; icon: typeof PlayIcon }
> = {
  game: {
    label: 'Lek',
    className: 'bg-primary/10 text-primary',
    icon: PlayIcon,
  },
  pause: {
    label: 'Paus',
    className: 'bg-amber-500/10 text-amber-600',
    icon: PauseIcon,
  },
  preparation: {
    label: 'Förberedelse',
    className: 'bg-indigo-500/10 text-indigo-600',
    icon: ClipboardDocumentListIcon,
  },
  custom: {
    label: 'Notis',
    className: 'bg-slate-500/10 text-slate-600',
    icon: PencilSquareIcon,
  },
}

const seedSearchResults = [
  {
    id: 'game-1',
    slug: 'skattjakt-mini',
    time_estimate_min: 20,
    image_url: '/avatars/greenmoss.png',
    translations: [
      {
        title: 'Skattjakt Mini',
        short_description: 'Lättskött skattjakt med ledtrådar och checkpoints.',
      },
    ],
  },
  {
    id: 'game-2',
    slug: 'reflektionsrunda',
    time_estimate_min: 10,
    image_url: '/avatars/greygravel.png',
    translations: [
      {
        title: 'Reflektionsrundan',
        short_description: 'Avslutningsrunda med frågor och tryggt tempo.',
      },
    ],
  },
  {
    id: 'game-3',
    slug: 'energi-boost',
    time_estimate_min: 15,
    image_url: '/avatars/redmagma.png',
    translations: [
      {
        title: 'Energi-boost',
        short_description: 'Kort, pulshöjande lek för att väcka gruppen.',
      },
    ],
  },
]

const demoVersions: VersionWithCurrent[] = [
  {
    id: 'version-3',
    planId: demoPlanId,
    versionNumber: 3,
    name: 'Detta är en testplan',
    description: 'Nuvarande publicerad version.',
    totalTimeMinutes: 40,
    publishedAt: '2025-02-10T09:30:00Z',
    publishedBy: 'user-1',
    isCurrent: true,
  },
  {
    id: 'version-2',
    planId: demoPlanId,
    versionNumber: 2,
    name: 'Detta är en testplan',
    description: 'Förra publiceringen med kortare paus.',
    totalTimeMinutes: 35,
    publishedAt: '2025-01-18T14:00:00Z',
    publishedBy: 'user-1',
    isCurrent: false,
  },
]

const initialBlocks: PlannerBlock[] = [
  {
    id: 'block-1',
    planId: demoPlanId,
    position: 1,
    blockType: 'preparation',
    title: 'Förberedelser',
    notes: 'Sätt upp stationer och dela in lag.',
    durationMinutes: 5,
  },
  {
    id: 'block-2',
    planId: demoPlanId,
    position: 2,
    blockType: 'game',
    durationMinutes: 20,
    game: {
      id: 'game-1',
      title: 'Skattjakt Mini',
      shortDescription: 'Ledtrådar, karta och checkpoints.',
      coverUrl: '/avatars/greenmoss.png',
      energyLevel: 'medium',
      locationType: 'outdoor',
    },
  },
  {
    id: 'block-3',
    planId: demoPlanId,
    position: 3,
    blockType: 'pause',
    title: 'Vattenpaus',
    notes: 'Kort paus för vatten och omgruppering.',
    durationMinutes: 5,
  },
  {
    id: 'block-4',
    planId: demoPlanId,
    position: 4,
    blockType: 'custom',
    title: 'Reflektion',
    notes: 'Snabb runda: vad lärde vi oss?',
    durationMinutes: 10,
    isOptional: true,
  },
]

export default function PlannerSandboxPage() {
  const [selectedPlanId, setSelectedPlanId] = useState(demoPlanId)
  const [visibility, setVisibility] = useState<PlannerVisibility>('private')
  const [status, setStatus] = useState<PlannerStatus>('draft')
  const [planTitle, setPlanTitle] = useState('Detta är en testplan')
  const [planDescription, setPlanDescription] = useState(
    'Bygg sekvenser av lekar och starta direkt i Play. Här visas ett fullt planeringsflöde.'
  )
  const [blocks, setBlocks] = useState<PlannerBlock[]>(initialBlocks)
  const [showPlanList, setShowPlanList] = useState(false)
  const [showGamePicker, setShowGamePicker] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showVersionsDialog, setShowVersionsDialog] = useState(false)

  const totalMinutes = blocks.reduce((sum, block) => sum + (block.durationMinutes ?? 0), 0)

  const demoPlan: PlannerPlan = useMemo(
    () => ({
      id: demoPlanId,
      ownerUserId: 'demo-user',
      name: planTitle,
      description: planDescription,
      visibility,
      status,
      totalTimeMinutes: totalMinutes,
      updatedAt: '2025-02-10T10:24:00Z',
      blocks,
      notes: {
        privateNote: {
          id: 'note-private',
          content: 'Kom ihåg att dubbelkolla material innan start.',
          updatedAt: '2025-02-10T09:50:00Z',
          updatedBy: 'Du',
        },
        tenantNote: {
          id: 'note-tenant',
          content: 'Planen passar bra för 8-14 deltagare.',
          updatedAt: '2025-02-09T16:30:00Z',
          updatedBy: 'Team',
        },
      },
    }),
    [blocks, planDescription, planTitle, status, totalMinutes, visibility]
  )

  const planListPanel = (
    <Card className="border-border/60">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Mina planer</CardTitle>
          <Button size="sm" variant="outline" className="gap-1">
            <PlusIcon className="h-4 w-4" />
            Ny plan
          </Button>
        </div>
        <Input placeholder="Sök planer..." />
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Alla</Button>
          <Button size="sm" variant="outline">Utkast</Button>
          <Button size="sm" variant="outline">Publicerade</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {planSummaries.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlanId(plan.id)}
            className={cn(
              'flex w-full items-start justify-between rounded-xl border p-4 text-left transition',
              plan.id === selectedPlanId
                ? 'border-primary/50 bg-primary/5 shadow-sm'
                : 'border-border/60 bg-card hover:border-primary/30 hover:bg-muted/40'
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{plan.name}</span>
                <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={statusBadgeVariants[plan.status]} size="sm">
                  {statusLabels[plan.status]}
                </Badge>
                <Badge variant="outline" size="sm">
                  {visibilityLabels[plan.visibility]}
                </Badge>
                <span>{plan.blocks} block</span>
                <span>{plan.minutes} min</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{plan.updatedAt}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  )

  const handleAddBlockType = (type: PlannerBlock['blockType']) => {
    if (type === 'game') {
      setShowGamePicker(true)
      return
    }

    const newBlock: PlannerBlock = {
      id: `block-${Date.now()}`,
      planId: demoPlanId,
      position: blocks.length + 1,
      blockType: type,
      title: type === 'pause' ? 'Paus' : type === 'preparation' ? 'Förberedelse' : 'Notis',
      durationMinutes: type === 'pause' ? 5 : 10,
      notes: 'Uppdatera texten för att passa planen.',
    }
    setBlocks((prev) => [...prev, newBlock])
    setStatus('modified')
  }

  const handleGameSelected = (game: { id: string; title: string; duration: number | null }) => {
    const newBlock: PlannerBlock = {
      id: `block-${Date.now()}`,
      planId: demoPlanId,
      position: blocks.length + 1,
      blockType: 'game',
      durationMinutes: game.duration ?? 15,
      game: {
        id: game.id,
        title: game.title,
        shortDescription: 'Ny lek från biblioteket.',
        coverUrl: '/avatars/pinksky.png',
      },
    }
    setBlocks((prev) => [...prev, newBlock])
    setStatus('modified')
  }

  const handleExport = () => {
    const rows = [
      ['Position', 'Typ', 'Titel', 'Minuter'],
      ...blocks.map((block, index) => [
        String(index + 1),
        blockMeta[block.blockType].label,
        block.blockType === 'game' ? block.game?.title ?? 'Okänd lek' : block.title ?? 'Block',
        String(block.durationMinutes ?? 0),
      ]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${planTitle.replace(/\s+/g, '-').toLowerCase()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <SandboxShell
      moduleId="app-planner"
      title="Planner"
      description="Planering, blockflöde och delning i appens design"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:hidden">
          <Sheet open={showPlanList} onOpenChange={setShowPlanList}>
            <SheetTrigger asChild>
              <Button variant="outline" className="justify-between">
                Mina planer
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Mina planer</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{planListPanel}</div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="hidden lg:block">{planListPanel}</div>

          <div className="space-y-6">
            <Card className="border-border/60">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariants[status]} size="sm">
                      {statusLabels[status]}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          {visibilityLabels[visibility]}
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setVisibility('private')}>
                          Privat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVisibility('tenant')}>
                          Organisation
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setVisibility('public')}>
                          Publik
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="text-sm text-muted-foreground">
                      {blocks.length} block · {totalMinutes} min
                    </span>
                  </div>

                  <div className="hidden flex-wrap gap-2 md:flex">
                    <Button variant="outline" size="sm" onClick={() => setShowVersionsDialog(true)}>
                      Versioner
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPreviewDialog(true)}>
                      Förhandsgranska
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
                      Dela
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                      Exportera
                    </Button>
                    <Button size="sm">Publicera</Button>
                  </div>

                  <div className="flex flex-wrap gap-2 md:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Åtgärder
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowVersionsDialog(true)}>
                          Versioner
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowPreviewDialog(true)}>
                          Förhandsgranska
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                          Dela
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExport}>
                          Exportera
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm">Publicera</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Titel</label>
                    <Input
                      value={planTitle}
                      onChange={(event) => setPlanTitle(event.target.value)}
                      placeholder="Skriv planens titel"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Beskrivning</label>
                    <Textarea
                      value={planDescription}
                      onChange={(event) => setPlanDescription(event.target.value)}
                      placeholder="Kort beskrivning av planen"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Block i planen</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Dra, byt ordning och justera tidsåtgång.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Squares2X2Icon className="h-4 w-4" />
                  Byt vy
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {blocks.map((block, index) => {
                  const meta = blockMeta[block.blockType]
                  const Icon = meta.icon
                  return (
                    <div
                      key={block.id}
                      className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 transition hover:border-primary/30"
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Bars3BottomLeftIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>

                        <div className="flex flex-1 items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn('flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium', meta.className)}>
                                <Icon className="h-3.5 w-3.5" />
                                {meta.label}
                              </span>
                              {block.isOptional && (
                                <Badge variant="outline" size="sm">Valfri</Badge>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {block.blockType === 'game'
                                  ? block.game?.title ?? 'Okänd lek'
                                  : block.title}
                              </p>
                              {block.notes && (
                                <p className="text-sm text-muted-foreground">{block.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ClockIcon className="h-4 w-4" />
                            <span>{block.durationMinutes ?? 0} min</span>
                          </div>
                        </div>
                      </div>

                      {block.blockType === 'game' && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" size="sm" className="gap-1">
                            <UserGroupIcon className="h-3 w-3" />
                            8-12 deltagare
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            Energi: Medel
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            Plats: Ute
                          </Badge>
                        </div>
                      )}
                    </div>
                  )
                })}

                <AddGameButton onAdd={handleAddBlockType} />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Privata anteckningar</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Syns bara för dig.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Auto-spara
                    <Switch checked />
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea rows={4} defaultValue="Kom ihåg att fördela roller vid start." />
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Delade anteckningar</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Syns för organisationen.
                    </p>
                  </div>
                  <Badge variant="primary" size="sm">Delad</Badge>
                </CardHeader>
                <CardContent>
                  <Textarea rows={4} defaultValue="Planen passar bra för 45-60 minuter." />
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PlayIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Redo att köra planen?</p>
                    <p className="font-semibold text-foreground">Starta plan i Play</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-1">
                    <EyeIcon className="h-4 w-4" />
                    Förhandsgranska
                  </Button>
                  <Button className="gap-1">
                    <PlayIcon className="h-4 w-4" />
                    Starta plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-primary/30 bg-primary/5">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDaysIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Mobilförslag</span>
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Planlistan öppnas som sheet (knappen “Mina planer”).</li>
                  <li>Åtgärder samlas i en kompakt meny för att spara plats.</li>
                  <li>CTA-raden ligger som sticky block längst ner.</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <GamePicker
        open={showGamePicker}
        onOpenChange={setShowGamePicker}
        onSelect={handleGameSelected}
        seedResults={seedSearchResults}
        initialQuery="skatt"
      />
      <VersionsDialog
        open={showVersionsDialog}
        onOpenChange={setShowVersionsDialog}
        planId={demoPlanId}
        versionsOverride={demoVersions}
      />
      <PreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        plan={demoPlan}
      />
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        planId={demoPlanId}
        planName={planTitle}
        visibility={visibility}
      />
    </SandboxShell>
  )
}
