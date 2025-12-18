import { promises as fs } from 'fs'
import path from 'path'

const WIKI_DIR = path.join(process.cwd(), 'sandbox', 'wiki')

export interface WikiPageMeta {
  slug: string
  filename: string
  title: string
}

function safeSlug(input: string): string | null {
  if (!/^[a-z0-9-]+$/i.test(input)) return null
  if (input.includes('..')) return null
  return input
}

function filenameToSlug(filename: string) {
  return filename.replace(/\.md$/i, '')
}

function extractTitle(markdown: string, fallback: string) {
  const lines = markdown.split(/\r?\n/)
  for (const line of lines) {
    const match = /^#\s+(.*)\s*$/.exec(line)
    if (match?.[1]) return match[1]
  }
  return fallback
}

export async function listWikiPages(): Promise<WikiPageMeta[]> {
  const entries = await fs.readdir(WIKI_DIR)

  const mdFiles = entries
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .filter((name) => !name.startsWith('_'))

  const pages = await Promise.all(
    mdFiles.map(async (filename) => {
      const slug = filenameToSlug(filename)
      const fullPath = path.join(WIKI_DIR, filename)
      const content = await fs.readFile(fullPath, 'utf8')
      const title = extractTitle(content, slug)
      return { slug, filename, title }
    })
  )

  pages.sort((a, b) => a.title.localeCompare(b.title))
  return pages
}

export async function readWikiPage(slugInput: string): Promise<{ meta: WikiPageMeta; content: string } | null> {
  const slug = safeSlug(slugInput)
  if (!slug) return null

  const filename = `${slug}.md`
  const fullPath = path.join(WIKI_DIR, filename)

  try {
    const content = await fs.readFile(fullPath, 'utf8')
    const title = extractTitle(content, slug)
    return { meta: { slug, filename, title }, content }
  } catch {
    return null
  }
}
