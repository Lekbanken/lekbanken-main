import { notFound } from 'next/navigation'
import { getCategoryById } from '../config/sandbox-modules'
import { SandboxShell } from '../components/shell/SandboxShellV2'
import { CategoryOverview } from '../components/CategorySection'

export const dynamic = 'force-dynamic'

export default function AppSandboxIndex() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

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
