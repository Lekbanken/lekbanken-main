'use client'

import { notFound } from 'next/navigation'
import { getCategoryById } from '../config/sandbox-modules'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { CategoryOverview } from '../components/CategorySection'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default function AdminSandboxIndex() {
  const category = getCategoryById('admin')
  
  if (!category) {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="admin"
      title={category.label}
      description={category.description}
    >
      <CategoryOverview category={category} />
    </SandboxShell>
  )
}
