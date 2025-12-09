'use client'

import { notFound } from 'next/navigation'
import { getCategoryById } from '../config/sandbox-modules'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { CategoryOverview } from '../components/CategorySection'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default function AppSandboxIndex() {
  const category = getCategoryById('app')
  
  if (!category) {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="app"
      title={category.label}
      description={category.description}
    >
      <CategoryOverview category={category} />
    </SandboxShell>
  )
}
