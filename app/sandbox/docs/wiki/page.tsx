import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { listWikiPages } from './wiki-files'

export const dynamic = 'force-dynamic'

export default async function WikiIndexPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const pages = await listWikiPages()

  return (
    <SandboxShell
      moduleId="wiki"
      title="Sandbox Wiki"
      description="Renderar sandbox/wiki som ett visuellt docs-bibliotek (dev-only)."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Detta är en UI-läsare för <span className="font-mono">sandbox/wiki</span>. Den ska vara ett
            utbildningsverktyg, inte en ny källa till sanning.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Sidor</h2>
          <ul className="mt-3 space-y-2">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/sandbox/docs/wiki/${p.slug}`}
                  className="text-sm font-medium text-foreground underline underline-offset-4"
                >
                  {p.title}
                </Link>
                <div className="mt-0.5 text-xs text-muted-foreground">{p.filename}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SandboxShell>
  )
}
