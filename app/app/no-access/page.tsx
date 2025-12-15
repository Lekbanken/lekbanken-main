import Link from 'next/link'

export default function NoAccessPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Ingen organisation tilldelad</h1>
        <p className="text-sm text-muted-foreground">
          Du verkar inte vara medlem i någon organisation ännu. Be en administratör bjuda in dig,
          eller skapa en ny organisation om du har behörighet.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/select-tenant"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary"
        >
          Välj organisation
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Tillbaka till appen
        </Link>
      </div>
    </div>
  )
}
