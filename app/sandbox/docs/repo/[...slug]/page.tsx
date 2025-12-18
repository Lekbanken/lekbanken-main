import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SandboxShell } from '../../../components/shell/SandboxShellV2'
import { Markdown } from '../../../components/Markdown'
import { readRepoDoc } from '../repo-files'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default async function RepoDocPage({ params }: { params: { slug: string[] } }) {
  const page = await readRepoDoc(params.slug)

  if (!page) {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="repo-docs"
      title={page.meta.title}
      description={`docs/${page.meta.relativePath}`}
    >
      <div className="space-y-6">
        <div>
          <Link
            href="/sandbox/docs/repo"
            className="text-sm font-medium text-muted-foreground underline underline-offset-4"
          >
            Tillbaka till Repo Docs
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <Markdown content={page.content} />
        </div>
      </div>
    </SandboxShell>
  )
}
