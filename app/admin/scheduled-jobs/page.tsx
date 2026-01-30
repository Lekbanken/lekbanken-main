'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard'
import {
  AdminPageLayout,
  AdminPageHeader,
  AdminCard,
  AdminErrorState,
} from '@/components/admin/shared'
import { Badge, Button, LoadingSpinner } from '@/components/ui'
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'

interface ScheduledJob {
  jobid: number
  jobname: string
  schedule: string
  command: string
  active: boolean
}

interface JobRun {
  id: string
  job_name: string
  status: 'success' | 'error' | 'running'
  result: {
    success?: boolean
    deleted_users?: number
    deleted_sessions?: number
    deleted_game_sessions?: number
    error?: string
  } | null
  error_message: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

interface ScheduledJobsData {
  jobs: ScheduledJob[]
  recent_runs: JobRun[]
  fetched_at: string
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function formatSwedishTime(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function parseCronSchedule(schedule: string, t: ReturnType<typeof useTranslations<'admin.scheduledJobs'>>): string {
  // Konvertera UTC cron-tid till svensk tid dynamiskt
  const parts = schedule.split(' ')
  if (parts.length !== 5) return schedule

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  
  // Endast dagliga jobb med fast timme
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && minute === '0') {
    const utcHour = parseInt(hour, 10)
    if (!isNaN(utcHour)) {
      // Skapa ett datum idag med UTC-timmen för att få korrekt svensk tid
      const now = new Date()
      const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHour, 0))
      const swedishHour = utcDate.toLocaleString('sv-SE', { 
        timeZone: 'Europe/Stockholm', 
        hour: '2-digit',
        minute: '2-digit'
      })
      return t('dailyAt', { time: swedishHour })
    }
  }
  
  return `${hour}:${minute.padStart(2, '0')} UTC`
}

// Map cron job names to internal function names for manual runs
const JOB_NAME_TO_FUNCTION: Record<string, string> = {
  'cleanup-demo-users': 'cleanup_demo_users',
  'process-scheduled-notifications': 'process_scheduled_notifications',
}

// Format job result based on job type
function formatJobResult(
  result: JobRun['result'], 
  jobName: string,
  t: ReturnType<typeof useTranslations<'admin.scheduledJobs'>>
): string {
  if (!result) return '-'
  
  // Notification processing job
  if (jobName === 'process_scheduled_notifications' || jobName === 'process-scheduled-notifications') {
    const processed = (result as { processed_notifications?: number }).processed_notifications ?? 0
    const deliveries = (result as { total_deliveries?: number }).total_deliveries ?? 0
    return `${processed} notif → ${deliveries} deliv`
  }
  
  // Demo cleanup job (default)
  return t('resultFormat', { 
    users: result.deleted_users ?? 0, 
    sessions: result.deleted_sessions ?? 0 
  })
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('admin.scheduledJobs')
  
  switch (status) {
    case 'success':
      return (
        <Badge color="green" className="flex items-center gap-1">
          <CheckCircleIcon className="h-3 w-3" />
          {t('success')}
        </Badge>
      )
    case 'error':
      return (
        <Badge color="red" className="flex items-center gap-1">
          <XCircleIcon className="h-3 w-3" />
          {t('failed')}
        </Badge>
      )
    case 'running':
      return (
        <Badge color="blue" className="flex items-center gap-1">
          <ArrowPathIcon className="h-3 w-3 animate-spin" />
          {t('running')}
        </Badge>
      )
    default:
      return <Badge color="zinc">{status}</Badge>
  }
}

function JobCard({ job, latestRun, onRunManually, isRunning }: { 
  job: ScheduledJob
  latestRun: JobRun | null
  onRunManually: () => void
  isRunning: boolean
}) {
  const t = useTranslations('admin.scheduledJobs')

  return (
    <AdminCard className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClockIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{job.jobname}</h3>
            <p className="text-sm text-muted-foreground">
              {parseCronSchedule(job.schedule, t)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.active ? (
            <Badge color="green">{t('active')}</Badge>
          ) : (
            <Badge color="zinc">{t('inactive')}</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRunManually}
            disabled={isRunning}
          >
            {isRunning ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <PlayIcon className="h-4 w-4" />
            )}
            <span className="ml-1">{t('runNow')}</span>
          </Button>
        </div>
      </div>

      {latestRun && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('lastRun')}:</span>
            <span className="font-mono">{formatSwedishTime(latestRun.started_at)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('status')}:</span>
            <StatusBadge status={latestRun.status} />
          </div>
          {latestRun.result && latestRun.status === 'success' && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('result')}:</span>
              <span className="font-mono text-foreground">
                {formatJobResult(latestRun.result, latestRun.job_name, t)}
              </span>
            </div>
          )}
          {latestRun.error_message && (
            <div className="mt-2 text-sm text-red-500">
              {latestRun.error_message}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('duration')}:</span>
            <span className="font-mono">{formatDuration(latestRun.duration_ms)}</span>
          </div>
        </div>
      )}
    </AdminCard>
  )
}

function RunHistoryTable({ runs }: { runs: JobRun[] }) {
  const t = useTranslations('admin.scheduledJobs')

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-muted-foreground">{t('time')}</th>
            <th className="pb-2 text-left font-medium text-muted-foreground">{t('job')}</th>
            <th className="pb-2 text-left font-medium text-muted-foreground">{t('status')}</th>
            <th className="pb-2 text-left font-medium text-muted-foreground">{t('result')}</th>
            <th className="pb-2 text-right font-medium text-muted-foreground">{t('duration')}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-border/50">
              <td className="py-2 font-mono text-foreground">
                {formatSwedishTime(run.started_at)}
              </td>
              <td className="py-2 text-muted-foreground">{run.job_name}</td>
              <td className="py-2">
                <StatusBadge status={run.status} />
              </td>
              <td className="py-2 text-muted-foreground">
                {run.status === 'success' && run.result ? (
                  <span className="font-mono">
                    {formatJobResult(run.result, run.job_name, t)}
                  </span>
                ) : run.error_message ? (
                  <span className="text-red-500">{run.error_message}</span>
                ) : (
                  '-'
                )}
              </td>
              <td className="py-2 text-right font-mono text-muted-foreground">
                {formatDuration(run.duration_ms)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScheduledJobsContent() {
  const t = useTranslations('admin.scheduledJobs')
  const [data, setData] = useState<ScheduledJobsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningJob, setRunningJob] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/scheduled-jobs')
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled jobs')
      }
      const result = await response.json()
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error((result as { error?: string }).error ?? 'Failed to fetch scheduled jobs')
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRunManually = async (jobName: string) => {
    try {
      setRunningJob(jobName)
      const response = await fetch('/api/admin/scheduled-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobName }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to run job')
      }
      
      // Uppdatera data efter körning
      await fetchData()
    } catch (err) {
      console.error('Failed to run job:', err)
    } finally {
      setRunningJob(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <AdminErrorState
        title={t('errorTitle')}
        description={error}
        onRetry={fetchData}
      />
    )
  }

  if (!data) {
    return null
  }

  const jobs = asArray<ScheduledJob>((data as unknown as { jobs?: unknown }).jobs ?? data.jobs)
  const recentRuns = asArray<JobRun>((data as unknown as { recent_runs?: unknown }).recent_runs ?? data.recent_runs)

  // Mappa jobnamn till senaste körning
  const latestRunByJob: Record<string, JobRun> = {}
  for (const run of recentRuns) {
    if (!latestRunByJob[run.job_name]) {
      latestRunByJob[run.job_name] = run
    }
  }

  // Definiera alla jobb som ska visas (även om de inte finns i pg_cron)
  const allKnownJobs: ScheduledJob[] = [
    ...jobs,
    // Lägg till cleanup-demo-users om det saknas
    ...(!jobs.some(j => j.jobname === 'cleanup-demo-users') ? [{
      jobid: -1,
      jobname: 'cleanup-demo-users',
      schedule: '0 3 * * *',
      command: 'SELECT public.cleanup_demo_users()',
      active: false,
    }] : []),
    // Lägg till process-scheduled-notifications om det saknas
    ...(!jobs.some(j => j.jobname === 'process-scheduled-notifications') ? [{
      jobid: -2,
      jobname: 'process-scheduled-notifications',
      schedule: '0 2 * * *',
      command: 'SELECT public.process_scheduled_notifications()',
      active: false,
    }] : []),
  ]

  // Om inga cron-jobb finns, visa info om att pg_cron inte är aktiverat
  const hasJobs = allKnownJobs.length > 0

  return (
    <div className="space-y-6">
      {/* Jobb-kort */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">{t('activeJobs')}</h2>
        {hasJobs ? (
          <div className="grid gap-4 md:grid-cols-2">
            {allKnownJobs.map((job) => {
              const functionName = JOB_NAME_TO_FUNCTION[job.jobname] ?? job.jobname
              return (
                <JobCard
                  key={job.jobid}
                  job={job}
                  latestRun={latestRunByJob[job.jobname] ?? latestRunByJob[functionName] ?? null}
                  onRunManually={() => handleRunManually(functionName)}
                  isRunning={runningJob === functionName}
                />
              )
            })}
          </div>
        ) : (
          <AdminCard className="p-6">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">cleanup-demo-users</p>
                <p className="text-sm text-muted-foreground">
                  {t('cronNotEnabled')}
                </p>
              </div>
            </div>
            {recentRuns.length > 0 && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('lastRun')}:</span>
                  <span className="font-mono">
                    {formatSwedishTime(recentRuns[0].started_at)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}:</span>
                  <StatusBadge status={recentRuns[0].status} />
                </div>
              </div>
            )}
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRunManually('cleanup_demo_users')}
                disabled={runningJob === 'cleanup_demo_users'}
              >
                {runningJob === 'cleanup_demo_users' ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
                <span className="ml-1">{t('runNow')}</span>
              </Button>
            </div>
          </AdminCard>
        )}
      </section>

      {/* Körhistorik */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('runHistory')}</h2>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <ArrowPathIcon className="h-4 w-4" />
            <span className="ml-1">{t('refresh')}</span>
          </Button>
        </div>
        <AdminCard className="p-4">
          <RunHistoryTable runs={recentRuns} />
        </AdminCard>
      </section>
    </div>
  )
}

export default function ScheduledJobsPage() {
  const t = useTranslations('admin.scheduledJobs')

  return (
    <SystemAdminClientGuard>
      <AdminPageLayout>
        <AdminPageHeader
          title={t('title')}
          description={t('description')}
          icon={<ClockIcon className="h-8 w-8 text-primary" />}
        />
        <ScheduledJobsContent />
      </AdminPageLayout>
    </SystemAdminClientGuard>
  )
}
