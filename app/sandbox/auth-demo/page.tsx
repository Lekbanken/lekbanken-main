import AuthDebugPanel from '@/components/sandbox/AuthDebugPanel'

export default function AuthDemoPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Auth/Tenant Demo</h1>
        <p className="text-sm text-muted-foreground">
          Visar server-hydrerad auth + tenantstate. Använd detta för felsökning och referens.
        </p>
      </div>
      <AuthDebugPanel />
    </div>
  )
}
