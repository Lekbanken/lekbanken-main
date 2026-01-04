import { Suspense } from 'react'
import { DesignPageClient } from './DesignPageClient'
import { getSystemDesignConfig } from '@/app/actions/design'

export const metadata = {
  title: 'Design | Admin | Lekbanken',
  description: 'Central Design Hub - Hantera plattformens visuella identitet',
}

export default async function DesignPage() {
  const result = await getSystemDesignConfig()
  
  return (
    <Suspense fallback={<DesignPageSkeleton />}>
      <DesignPageClient 
        initialConfig={result.success ? result.data : undefined} 
        error={result.error}
      />
    </Suspense>
  )
}

function DesignPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-10 w-full max-w-md bg-muted rounded" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-64 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </div>
  )
}
