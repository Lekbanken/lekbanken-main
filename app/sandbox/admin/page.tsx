import { notFound } from 'next/navigation'
import { getCategoryById } from '../config/sandbox-modules'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { CategoryOverview } from '../components/CategorySection'

export const dynamic = 'force-dynamic'

export default function AdminSandboxIndex() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

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
