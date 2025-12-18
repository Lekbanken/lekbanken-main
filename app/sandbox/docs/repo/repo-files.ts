import { promises as fs } from 'fs'
import path from 'path'

const REPO_DOCS_DIR = path.join(process.cwd(), 'docs')

export interface RepoDocMeta {
  /** URL path under /sandbox/docs/repo, e.g. "templates/DECISION_CRITERIA" */
  slugPath: string
  /** Path relative to docs/, e.g. "templates/DECISION_CRITERIA.md" */
  relativePath: string
  title: string
}

function isSafeSegment(input: string): boolean {
  // Keep conservative: allow common filename chars, but forbid path traversal.
  if (!/^[a-z0-9._-]+$/i.test(input)) return false
  if (input === '.' || input === '..') return false
  if (input.includes('..')) return false
  return true
}

function safeSegments(input: string[]): string[] | null {
  if (!Array.isArray(input) || input.length === 0) return null
  if (input.some((seg) => !isSafeSegment(seg))) return null
  return input
}

function stripMd(filename: string) {
  return filename.replace(/\.md$/i, '')
}

function humanizeFromFilename(input: string): string {
  const normalized = input.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!normalized) return input

  const words = normalized.split(' ')
  return words
    .map((w) => {
      // Keep short all-caps tokens (AI, API, RLS, V1, etc.) as-is.
      if (w.length <= 4 && w === w.toUpperCase()) return w
      const lower = w.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

function extractTitle(markdown: string, fallback: string) {
  const lines = markdown.split(/\r?\n/)
  for (const line of lines) {
    const match = /^#\s+(.*)\s*$/.exec(line)
    if (match?.[1]) return match[1]
  }
  return fallback
}

export async function listRepoDocs(): Promise<RepoDocMeta[]> {
  async function walk(dirAbsolute: string, dirRelative: string): Promise<RepoDocMeta[]> {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true })

    const results: RepoDocMeta[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('_')) continue

      if (entry.isDirectory()) {
        const nextAbs = path.join(dirAbsolute, entry.name)
        const nextRel = dirRelative ? path.posix.join(dirRelative, entry.name) : entry.name
        results.push(...(await walk(nextAbs, nextRel)))
        continue
      }

      if (!entry.isFile()) continue
      if (!entry.name.toLowerCase().endsWith('.md')) continue

      const relativePath = dirRelative ? path.posix.join(dirRelative, entry.name) : entry.name
      const slugPath = stripMd(relativePath)

      const fullPath = path.join(REPO_DOCS_DIR, relativePath.split('/').join(path.sep))
      const content = await fs.readFile(fullPath, 'utf8')

      const fallback = humanizeFromFilename(stripMd(entry.name))
      const title = extractTitle(content, fallback)
      results.push({ slugPath, relativePath, title })
    }

    return results
  }

  const docs = await walk(REPO_DOCS_DIR, '')
  docs.sort((a, b) => (a.slugPath + a.title).localeCompare(b.slugPath + b.title))
  return docs
}

export async function readRepoDoc(
  segmentsInput: string[]
): Promise<{ meta: RepoDocMeta; content: string } | null> {
  const segments = safeSegments(segmentsInput)
  if (!segments) return null

  const last = segments[segments.length - 1]
  if (!last) return null

  const filename = `${last}.md`
  const relativePath = path.posix.join(...segments.slice(0, -1), filename)
  const fullPath = path.join(REPO_DOCS_DIR, relativePath.split('/').join(path.sep))

  try {
    const content = await fs.readFile(fullPath, 'utf8')
    const title = extractTitle(content, humanizeFromFilename(stripMd(filename)))
    return {
      meta: {
        slugPath: stripMd(relativePath),
        relativePath,
        title,
      },
      content,
    }
  } catch {
    return null
  }
}
