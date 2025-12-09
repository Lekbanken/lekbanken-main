'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui'
import {
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  CheckCircleIcon,
  PlayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'

export default function PlannerSandboxPage() {
  return (
    <SandboxShell
      moduleId="app-planner"
      title="Planner"
      description="Preview av planerare-komponenter för app-sektionen"
    >
      <div className="space-y-8">
        {/* Stats Preview */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Stats Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">3</div>
                <div className="text-sm text-gray-600">Totalt mål</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">1</div>
                <div className="text-sm text-gray-600">Avklarade</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-accent">5</div>
                <div className="text-sm text-gray-600">Aktiviteter idag</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">2</div>
                <div className="text-sm text-gray-600">Genomförda</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Goals Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Goals Card</h2>
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircleIcon className="h-5 w-5 text-primary" />
                Mina mål
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add Goal Form */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-200">
                <Input placeholder="Skriv ditt nya mål..." />
                <div className="flex gap-2">
                  <Button size="sm">Lägg till</Button>
                  <Button size="sm" variant="outline">Avbryt</Button>
                </div>
              </div>

              {/* Active Goal */}
              <div className="p-3 rounded-lg border bg-white border-gray-200 hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">
                        Genomför 5 utomhusaktiviteter
                      </span>
                      <Badge variant="destructive" size="sm">Hög</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Ta gruppen utomhus minst 5 gånger denna vecka
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-primary font-medium">60%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full w-3/5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                      <CalendarDaysIcon className="h-3 w-3" />
                      2025-02-07
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed Goal */}
              <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircleSolidIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-500 line-through">
                        Samarbetsövningar
                      </span>
                      <Badge variant="success" size="sm">Låg</Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Fokusera på teambuilding-aktiviteter
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Schedule Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Schedule Card</h2>
          <Card className="max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-accent" />
                  Dagens schema
                </CardTitle>
                <Badge variant="primary">Mån 27 jan</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Completed Activity */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 opacity-60">
                <div className="text-sm font-medium text-gray-600 w-12">09:00</div>
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="flex-1">
                  <div className="font-medium text-gray-500 line-through">Morgonsamling</div>
                  <div className="text-xs text-gray-500">15 min</div>
                </div>
                <CheckCircleSolidIcon className="h-5 w-5 text-green-500" />
              </div>

              {/* Active Activity */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="text-sm font-medium text-gray-600 w-12">10:00</div>
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Utomhuslek: Kurragömma</div>
                  <div className="text-xs text-gray-500">30 min</div>
                </div>
                <Badge variant="primary" className="flex items-center gap-1">
                  <PlayIcon className="h-3 w-3" />
                  Pågår
                </Badge>
              </div>

              {/* Pending Activity */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
                <div className="text-sm font-medium text-gray-600 w-12">11:00</div>
                <div className="h-3 w-3 rounded-full bg-gray-300" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Kreativ stund</div>
                  <div className="text-xs text-gray-500">45 min</div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <ChevronUpIcon className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Add Activity Button */}
              <button className="w-full p-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Lägg till aktivitet
              </button>
            </CardContent>
          </Card>
        </section>

        {/* Active Banner */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Active Activity Banner</h2>
          <Card className="bg-gradient-to-r from-primary to-accent text-white max-w-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <PlayIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-white/80">Pågående aktivitet</div>
                    <div className="font-semibold text-lg">Utomhuslek: Kurragömma</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/80">Tid kvar</div>
                  <div className="font-semibold">30 min</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Priority Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Priority Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="destructive">Hög prioritet</Badge>
            <Badge variant="warning">Medel prioritet</Badge>
            <Badge variant="success">Låg prioritet</Badge>
            <Badge variant="primary">Aktiv</Badge>
            <Badge variant="outline">Väntande</Badge>
          </div>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Målkort med checkbar progress</li>
            <li>Sorterbara aktiviteter med pil-knappar</li>
            <li>Drag-and-drop placeholder</li>
            <li>Active activity banner med gradient</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
