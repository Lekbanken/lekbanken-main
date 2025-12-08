import { notFound } from 'next/navigation'
import { PlanOverview } from '@/features/planner/components/PlanOverview'
import type { PlannerPlan } from '@/types/planner'

async function loadPlan(planId: string): Promise<PlannerPlan | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/plans/${planId}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as { plan: PlannerPlan }
  return data.plan
}

export default async function PlannerPlanDetailPage({ params }: { params: { planId: string } }) {
  const plan = await loadPlan(params.planId)
  if (!plan) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <PlanOverview plan={plan!} />
    </div>
  )
}
