'use client'

import { notFound } from 'next/navigation'
import { getCategoryById } from '../config/sandbox-modules'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { CategoryOverview } from '../components/CategorySection'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default function MarketingOverviewPage() {
  const category = getCategoryById('marketing')
  
  if (!category) {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="marketing"
      title={category.label}
      description={category.description}
    >
      <CategoryOverview category={category} />
    </SandboxShell>
  )
}
