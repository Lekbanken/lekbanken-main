'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard'
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { getTopErrors } from '@/lib/services/analyticsService'
import { createBrowserClient } from '@/lib/supabase/client'

interface ErrorDetail {
  id: string
  error_type: string
  error_message: string | null
  error_key: string | null
  stack_trace: string | null
  page_path: string | null
  severity: string | null
  resolved: boolean
  occurrence_count: number
  user_id: string | null
  tenant_id: string | null
  created_at: string
  last_occurred_at: string | null
}

interface ErrorSummary {
  error_type: string
  error_message: string
  count: number
  first_seen: string
  last_seen: string
  resolved_count: number
}

export default function ErrorManagementPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()
  const [errors, setErrors] = useState<ErrorSummary[]>([])
  const [selectedError, setSelectedError] = useState<ErrorDetail | null>(null)
  const [errorInstances, setErrorInstances] = useState<ErrorDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')

  const loadErrors = async () => {
    if (!currentTenant) return

    setIsLoading(true)
    const supabase = createBrowserClient()

    // Get error summary
    const topErrors = await getTopErrors(currentTenant.id, 50)
    if (topErrors) {
      setErrors(
        topErrors.map((e) => ({
          error_type: e.type,
          error_message: e.message,
          count: e.count,
          first_seen: '',
          last_seen: '',
          resolved_count: 0,
        }))
      )
    }

    // Get detailed errors
    let query = supabase
      .from('error_tracking')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filter === 'unresolved') {
      query = query.eq('resolved', false)
    } else if (filter === 'resolved') {
      query = query.eq('resolved', true)
    }

    const { data } = await query
    if (data) {
      setErrorInstances(data)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    void loadErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, filter])

  const selectError = async (error: ErrorSummary) => {
    if (!currentTenant) return

    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('error_tracking')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .eq('error_type', error.error_type)
      .eq('error_message', error.error_message)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data && data.length > 0) {
      setSelectedError(data[0])
      setErrorInstances(data)
    }
  }

  const resolveError = async (errorId: string) => {
    if (!user) return

    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('error_tracking')
      .update({
        resolved: true,
      })
      .eq('id', errorId)

    if (!error) {
      setSelectedError(null)
      loadErrors()
    }
  }

  const resolveAllInstances = async (errorType: string, errorMessage: string) => {
    if (!user || !currentTenant) return

    const supabase = createBrowserClient()
    const { error } = await supabase
      .from('error_tracking')
      .update({
        resolved: true,
      })
      .eq('tenant_id', currentTenant.id)
      .eq('error_type', errorType)
      .eq('error_message', errorMessage)
      .eq('resolved', false)

    if (!error) {
      setSelectedError(null)
      loadErrors()
    }
  }

  if (!user || !currentTenant) {
    return (
      <AdminPageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-muted-foreground">Du måste vara inloggad för att se denna sida.</p>
        </div>
      </AdminPageLayout>
    )
  }

  const unresolvedCount = errorInstances.filter((e) => !e.resolved).length
  const resolvedCount = errorInstances.filter((e) => e.resolved).length
  const avgTimeToResolve =
    resolvedCount > 0
      ? errorInstances
          .filter((e) => e.resolved && e.last_occurred_at)
          .reduce((acc, e) => {
            const diff =
              new Date(e.last_occurred_at!).getTime() - new Date(e.created_at).getTime()
            return acc + diff / (1000 * 60 * 60) // hours
          }, 0) / resolvedCount
      : 0

  return (
    <SystemAdminClientGuard>
    <AdminPageLayout>
      <AdminPageHeader
        title="Error Management"
        description="Granska, hantera och lös systemfel"
        icon={<ExclamationTriangleIcon className="h-6 w-6" />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Analytics', href: '/admin/analytics' },
          { label: 'Errors' },
        ]}
      />

      <AdminStatGrid cols={4} className="mb-8">
        <AdminStatCard
          label="Olösta fel"
          value={unresolvedCount}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconColor="red"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Lösta fel"
          value={resolvedCount}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          iconColor="green"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Unika feltyper"
          value={errors.length}
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          iconColor="amber"
          isLoading={isLoading}
        />
        <AdminStatCard
          label="Avg tid till lösning"
          value={avgTimeToResolve > 0 ? `${avgTimeToResolve.toFixed(1)}h` : 'N/A'}
          icon={<ClockIcon className="h-5 w-5" />}
          iconColor="blue"
          isLoading={isLoading}
        />
      </AdminStatGrid>

      {/* Filter Tabs */}
      <Card className="mb-6">
        <CardContent className="p-4 flex gap-2">
          {(['all', 'unresolved', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === tab
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab === 'all' && 'Alla'}
              {tab === 'unresolved' && 'Olösta'}
              {tab === 'resolved' && 'Lösta'}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Error List */}
        <Card>
          <CardHeader>
            <CardTitle>Fel (grupperat)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {errors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {filter === 'unresolved' && 'Inga olösta fel! 🎉'}
                  {filter === 'resolved' && 'Inga lösta fel ännu'}
                  {filter === 'all' && 'Inga fel rapporterade'}
                </div>
              ) : (
                errors.map((error, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectError(error)}
                    className="w-full p-4 text-left hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="destructive">{error.error_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {error.count} förekomster
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {error.error_message}
                        </p>
                      </div>
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Details */}
        <Card>
          <CardHeader>
            <CardTitle>Feldetaljer</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedError ? (
              <div className="p-8 text-center text-muted-foreground">
                Välj ett fel för att se detaljer
              </div>
            ) : (
              <div className="space-y-6">
                {/* Error Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="destructive">{selectedError.error_type}</Badge>
                    {selectedError.resolved ? (
                      <Badge className="bg-green-100 text-green-700">Löst</Badge>
                    ) : (
                      <Badge variant="secondary">Olöst</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedError.error_message}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Rapporterad: {new Date(selectedError.created_at).toLocaleString('sv-SE')}
                  </p>
                  {selectedError.last_occurred_at && (
                    <p className="text-sm text-amber-600 mt-1">
                      Senast: {new Date(selectedError.last_occurred_at).toLocaleString('sv-SE')}
                    </p>
                  )}
                </div>

                {/* Stack Trace */}
                {selectedError.stack_trace && (
                  <div>
                    <h4 className="font-semibold mb-2">Stack Trace</h4>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
                      {selectedError.stack_trace}
                    </pre>
                  </div>
                )}

                {/* All Instances */}
                <div>
                  <h4 className="font-semibold mb-2">
                    Alla förekomster ({errorInstances.length})
                  </h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {errorInstances.map((instance) => (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span className="text-xs text-muted-foreground">
                          {new Date(instance.created_at).toLocaleString('sv-SE')}
                        </span>
                        {instance.resolved ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XMarkIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolution Actions */}
                {!selectedError.resolved && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3">Markera som löst</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveError(selectedError.id)}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Lös denna förekomst
                      </button>
                      <button
                        onClick={() =>
                          resolveAllInstances(
                            selectedError.error_type,
                            selectedError.error_message || ''
                          )
                        }
                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Lös alla olösta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
    </SystemAdminClientGuard>
  )
}
