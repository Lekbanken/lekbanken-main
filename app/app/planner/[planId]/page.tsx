import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerRlsClient } from '@/lib/supabase/server'
import { PlanOverview } from '@/features/planner/components/PlanOverview'
import type { PlannerPlan } from '@/types/planner'

/**
 * Plan Share Link Handler (/app/planner/[planId])
 *
 * This is the canonical share link for a plan.
 * - If user has edit permission → redirect to wizard (/app/planner/plan/[planId])
 * - If user has view-only permission → show read-only PlanOverview
 * - If no access → 404
 */

async function loadPlanWithPermissions(planId: string): Promise<{
  plan: PlannerPlan | null
  canEdit: boolean
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/plans/${planId}`, {
    cache: 'no-store',
    headers: {
      Cookie: (await cookies()).toString(),
    },
  })

  if (!res.ok) {
    return { plan: null, canEdit: false }
  }

  const data = (await res.json()) as { plan: PlannerPlan }
  const plan = data.plan

  // Check if current user can edit
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Owner can always edit
  if (user && plan.ownerUserId === user.id) {
    return { plan, canEdit: true }
  }

  // Check tenant membership for tenant-visible plans
  if (plan.visibility === 'tenant' && plan.ownerTenantId && user) {
    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('id')
      .eq('tenant_id', plan.ownerTenantId)
      .eq('user_id', user.id)
      .single()

    if (membership) {
      return { plan, canEdit: true }
    }
  }

  // Public plans are view-only for non-owners
  if (plan.visibility === 'public') {
    return { plan, canEdit: false }
  }

  // No access
  return { plan: null, canEdit: false }
}

export default async function PlannerShareLinkPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const { plan, canEdit } = await loadPlanWithPermissions(planId)

  if (!plan) {
    notFound()
  }

  // Editors get redirected to the wizard
  if (canEdit) {
    redirect(`/app/planner/plan/${planId}`)
  }

  // Non-editors see the read-only overview
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6 px-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Du visar en delad plan. Du har endast läsbehörighet.
        </p>
      </div>
      <PlanOverview plan={plan} />
    </div>
  )
}
