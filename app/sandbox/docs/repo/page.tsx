import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { listRepoDocs } from './repo-files'

if (process.env.NODE_ENV === 'production') {
  notFound()
}

export default async function RepoDocsIndexPage() {
  const docs = await listRepoDocs()

  function formatRelativePathForDisplay(relativePath: string): string {
    const parts = relativePath.split('/')
    const filename = parts[parts.length - 1] ?? relativePath

    if (!filename.toLowerCase().endsWith('.md')) return relativePath
    const base = filename.replace(/\.md$/i, '')
    const human = base
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => {
        if (w.length <= 4 && w === w.toUpperCase()) return w
        const lower = w.toLowerCase()
        return lower.charAt(0).toUpperCase() + lower.slice(1)
      })
      .join(' ')

    const displayFilename = `${human}.md`
    return [...parts.slice(0, -1), displayFilename].filter(Boolean).join('/')
  }

  const groups = new Map<string, typeof docs>()
  for (const doc of docs) {
    const parts = doc.relativePath.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
    const list = groups.get(folder) ?? []
    list.push(doc)
    groups.set(folder, list)
  }

  const folders = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b))

  return (
    <SandboxShell
      moduleId="repo-docs"
      title="Repo Docs"
      description="Renderar docs/** som ett visuellt docs-bibliotek (dev-only)."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Detta är en UI-läsare för <span className="font-mono">docs/</span>. Syftet är onboarding/utforskning.
            Källan till sanning är fortfarande repo-filerna.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Dokument</h2>
          <div className="mt-4 space-y-6">
            {folders.map((folder) => {
              const items = groups.get(folder) ?? []
              items.sort((a, b) => a.title.localeCompare(b.title))

              return (
                <section key={folder || 'root'} className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {folder ? `docs/${folder}/` : 'docs/'}
                  </div>
                  <ul className="space-y-2">
                    {items.map((d) => (
                      <li key={d.slugPath}>
                        <Link
                          href={`/sandbox/docs/repo/${d.slugPath}`}
                          className="text-sm font-medium text-foreground underline underline-offset-4"
                        >
                          {d.title}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {formatRelativePathForDisplay(d.relativePath)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </SandboxShell>
  )
}
