'use client'

import Link from 'next/link'
import { 
  AcademicCapIcon, 
  LockClosedIcon,
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import type { RequirementCheckResult } from '@/lib/learning/useRequirementGate'

type TrainingRequiredModalProps = {
  isOpen: boolean
  onClose: () => void
  result: RequirementCheckResult | null
  targetName?: string
}

export function TrainingRequiredModal({
  isOpen,
  onClose,
  result,
  targetName = 'denna aktivitet',
}: TrainingRequiredModalProps) {
  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <LockClosedIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Utbildning krävs</h2>
              <p className="text-sm text-muted-foreground">
                {result.remaining} av {result.total} kurser kvar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Du måste slutföra följande utbildning innan du kan starta {targetName}:
          </p>

          <ul className="mt-4 space-y-2">
            {result.unsatisfiedCourses.map((course) => (
              <li key={course.courseId}>
                <Link
                  href={`/app/learning/course/${course.courseSlug || course.courseId}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <AcademicCapIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{course.courseTitle}</p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>

          {result.completed > 0 && (
            <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✓ Du har redan slutfört {result.completed} av {result.total} kurser!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Stäng
          </button>
          <Link
            href="/app/learning"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <AcademicCapIcon className="h-4 w-4" />
            Gå till utbildning
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline badge showing training requirement status
 */
type TrainingRequiredBadgeProps = {
  result: RequirementCheckResult | null
  onClick?: () => void
}

export function TrainingRequiredBadge({ result, onClick }: TrainingRequiredBadgeProps) {
  if (!result || result.satisfied) return null

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
    >
      <LockClosedIcon className="h-3 w-3" />
      {result.remaining} kurs{result.remaining > 1 ? 'er' : ''} krävs
    </button>
  )
}

/**
 * Wrapper component that gates children behind training requirements
 */
type RequirementGateProps = {
  result: RequirementCheckResult | null
  isLoading?: boolean
  targetName?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequirementGate({
  result,
  isLoading = false,
  targetName,
  children,
  fallback,
}: RequirementGateProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (result && !result.satisfied) {
    if (fallback) return <>{fallback}</>

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <LockClosedIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">
              Utbildning krävs
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Du måste slutföra {result.remaining} kurs{result.remaining > 1 ? 'er' : ''} innan du kan {targetName || 'använda denna funktion'}.
            </p>
            <Link
              href="/app/learning"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700 underline hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              Gå till utbildning
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
