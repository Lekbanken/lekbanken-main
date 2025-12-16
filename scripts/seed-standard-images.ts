#!/usr/bin/env ts-node
// Seed standard cover images for each main purpose using existing files in the
// Supabase storage bucket "game-media". The script will:
// 1) Resolve main purpose IDs by name (accent/diacritic agnostic).
// 2) Ensure a media row exists for each provided file (type = template).
// 3) Upsert media_templates rows keyed by template_key per purpose+index.
//
// Requirements:
// - SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
// - SUPABASE_SERVICE_ROLE_KEY
// - Files already uploaded to bucket game-media with the exact filenames below.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'game-media'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const purposeImages: { purposeName: string; files: string[] }[] = [
  {
    purposeName: 'Kognition & Fokus',
    files: ['Kognition & Fokus 1.webp', 'Kognition & Fokus 2.webp', 'Kognition & Fokus 3.webp', 'Kognition & Fokus 4.webp', 'Kognition & Fokus 5.webp'],
  },
  {
    purposeName: 'Kommunikation & Språk',
    files: ['Kommunikation & Sprak 1.webp', 'Kommunikation & Sprak 2.webp', 'Kommunikation & Sprak 3.webp', 'Kommunikation & Sprak 4.webp', 'Kommunikation & Sprak 5.webp'],
  },
  {
    purposeName: 'Kreativitet & Uttryck',
    files: ['Kreativitet & Uttryck 1.webp', 'Kreativitet & Uttryck 2.webp', 'Kreativitet & Uttryck 3.webp', 'Kreativitet & Uttryck 4.webp', 'Kreativitet & Uttryck 5.webp'],
  },
  {
    purposeName: 'Kunskap & Lärande',
    files: ['Kunskap & Larande 1.webp', 'Kunskap & Larande 2.webp', 'Kunskap & Larande 3.webp', 'Kunskap & Larande 4.webp', 'Kunskap & Larande 5.webp'],
  },
  {
    purposeName: 'Motorik & Rörelse',
    files: ['Motorik & Rorelse 1.webp'], // add more if they exist later
  },
]

function normalize(str: string) {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

async function getPurposeMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('purposes').select('id, name')
  if (error) throw error
  const map: Record<string, string> = {}
  for (const p of data || []) {
    if (p.name) map[normalize(p.name)] = p.id
  }
  return map
}

async function ensureMedia(name: string, url: string, purposeId: string) {
  const { data: existing } = await supabase.from('media').select('id').eq('name', name).maybeSingle()
  if (existing?.id) return existing.id

  const { data, error } = await supabase
    .from('media')
    .insert({
      name,
      url,
      media_key: `${BUCKET}/${name}`,
      type: 'template',
      purpose_id: purposeId,
      tenant_id: null,
      product_id: null,
      game_id: null,
      alt_text: null,
      metadata: null,
    })
    .select('id')
    .single()

  if (error || !data) throw error
  return data.id
}

async function upsertTemplate({
  templateKey,
  name,
  mainPurposeId,
  mediaId,
}: {
  templateKey: string
  name: string
  mainPurposeId: string
  mediaId: string
}) {
  // Upsert on template_key uniqueness
  const { error } = await supabase
    .from('media_templates')
    .upsert(
      {
        template_key: templateKey,
        name,
        main_purpose_id: mainPurposeId,
        sub_purpose_id: null,
        product_id: null,
        media_id: mediaId,
        is_default: false,
        priority: 0,
        description: null,
      },
      { onConflict: 'template_key' }
    )
  if (error) throw error
}

async function main() {
  const purposeMap = await getPurposeMap()
  const missing: string[] = []

  for (const set of purposeImages) {
    const purposeId = purposeMap[normalize(set.purposeName)]
    if (!purposeId) {
      missing.push(set.purposeName)
      continue
    }

    for (const file of set.files) {
      const encoded = encodeURIComponent(file)
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encoded}`
      process.stdout.write(`Processing ${file} -> purpose ${set.purposeName} ... `)

      const mediaId = await ensureMedia(file, url, purposeId)
      const baseKey = `${normalize(set.purposeName).replace(/\s+/g, '-')}`
      const indexMatch = file.match(/(\d+)/)
      const idx = indexMatch ? indexMatch[1] : '1'
      const templateKey = `${baseKey}-${idx}`

      await upsertTemplate({
        templateKey,
        name: `${set.purposeName} ${idx}`,
        mainPurposeId: purposeId,
        mediaId,
      })

      process.stdout.write('done\n')
    }
  }

  if (missing.length) {
    console.warn('\nMissing purpose IDs for:', missing.join(', '))
  } else {
    console.log('\nAll standard images inserted/updated.')
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err)
  process.exit(1)
})
