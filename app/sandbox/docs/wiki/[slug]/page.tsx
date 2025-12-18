import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SandboxShell } from '../../../components/shell/SandboxShellV2'
import { Markdown } from '../../../components/Markdown'
import { readWikiPage } from '../wiki-files'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default async function WikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await readWikiPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <SandboxShell moduleId="wiki" title={page.meta.title} description={`sandbox/wiki/${page.meta.filename}`}>
      <div className="space-y-6">
        <div>
          <Link
            href="/sandbox/docs/wiki"
            className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          >
            Tillbaka till Wiki
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <Markdown content={page.content} />
        </div>
      </div>
    </SandboxShell>
  )
}
