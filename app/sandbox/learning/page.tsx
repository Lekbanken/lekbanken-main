'use client'

import Link from 'next/link'
import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2'
import { 
  AcademicCapIcon, 
  MapIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline'

const sandboxModules = [
  {
    id: 'admin',
    title: 'Admin UI',
    description: 'Skapa och hantera kurser, lärstigar och krav',
    icon: AcademicCapIcon,
    href: '/sandbox/learning/admin',
    status: 'wip' as const,
  },
  {
    id: 'learner',
    title: 'Lärar-vy',
    description: 'Utforska lärresan, gör kurser och se progression',
    icon: BookOpenIcon,
    href: '/sandbox/learning/learner',
    status: 'planned' as const,
  },
  {
    id: 'paths',
    title: 'Lärstigar',
    description: 'Visuell graf över kurser och förutsättningar',
    icon: MapIcon,
    href: '/sandbox/learning/paths',
    status: 'planned' as const,
  },
  {
    id: 'requirements',
    title: 'Krav & Grind',
    description: 'Regler för att låsa upp aktiviteter och roller',
    icon: ShieldCheckIcon,
    href: '/sandbox/learning/requirements',
    status: 'planned' as const,
  },
  {
    id: 'reports',
    title: 'Rapporter',
    description: 'Översikt av gruppens framsteg',
    icon: UserGroupIcon,
    href: '/sandbox/learning/reports',
    status: 'planned' as const,
  },
]

const statusColors = {
  done: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  wip: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  planned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const statusLabels = {
  done: 'Klar',
  wip: 'Under arbete',
  planned: 'Planerad',
}

export default function LearningSandboxPage() {
  return (
    <SandboxShellV2
      moduleId="learning"
      title="Lekledarutbildning"
      description="Utbildningsmodul med kurser, lärstigar och progressionssystem."
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h1 className="text-2xl font-bold text-foreground">
            🎓 Lekledarutbildning
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enterprise-grade utbildningsmodul för lekledare. Sandbox för att testa 
            admin- och lärarvy innan koppling till live-data.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sandboxModules.map((module) => {
            const Icon = module.icon
            return (
              <Link
                key={module.id}
                href={module.href}
                className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-card/80"
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary">
                        {module.title}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[module.status]}`}>
                        {statusLabels[module.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Architecture Overview */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Arkitektur</h2>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <h3 className="font-medium text-foreground">Datamodell</h3>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>• <code className="text-xs">learning_courses</code> - Kursinnehåll och quiz</li>
                <li>• <code className="text-xs">learning_paths</code> - Container för grafer</li>
                <li>• <code className="text-xs">learning_path_nodes</code> - Kurs-placeringar</li>
                <li>• <code className="text-xs">learning_path_edges</code> - Förutsättningar</li>
                <li>• <code className="text-xs">learning_user_progress</code> - Användarens framsteg</li>
                <li>• <code className="text-xs">learning_requirements</code> - Grind-regler</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground">Flöden</h3>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>1. Admin skapar kurs med text + quiz</li>
                <li>2. Admin lägger kurser i lärsstig-graf</li>
                <li>3. Lärare ser låsta/olåsta kurser</li>
                <li>4. Lärare gör quiz, får poäng</li>
                <li>5. Belöningar delas ut (DiceCoin/XP)</li>
                <li>6. Nästa kurs låses upp</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Dokumentation:</strong>{' '}
            <Link href="/docs/learning/LEARNING_MODULE_IMPLEMENTATION.md" className="text-primary hover:underline">
              Implementation Guide
            </Link>
            {' • '}
            <Link href="/docs/learning/LEARNING_TEST_PLAN.md" className="text-primary hover:underline">
              Test Plan
            </Link>
          </p>
        </div>
      </div>
    </SandboxShellV2>
  )
}
