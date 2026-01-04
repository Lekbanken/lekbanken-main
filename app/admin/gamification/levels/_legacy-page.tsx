'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui'

type ApiLevel = {
  level: number
  name: string | null
  next_level_xp: number
  next_reward: string | null
  reward_asset_key: string | null
  scope_tenant_id: string | null
}

function tryParseJsonArray(input: string): { ok: true; value: unknown[] } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(input)
    if (!Array.isArray(parsed)) return { ok: false, error: 'JSON måste vara en array.' }
    return { ok: true, value: parsed }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Ogiltig JSON'
    return { ok: false, error: msg }
  }
}

export default function GamificationLevelsAdminPage() {
  useAuth()
  const { currentTenant } = useTenant()

  const tenantId = currentTenant?.id ?? null

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [rawJson, setRawJson] = useState('')

  const parsedPreview = useMemo(() => tryParseJsonArray(rawJson), [rawJson])

  const reload = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/gamification/levels?tenantId=${encodeURIComponent(tenantId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Failed with status ${res.status}`)
      const payload = (await res.json()) as { levels: ApiLevel[] }

      // Convert from DB-ish shape to editor JSON shape.
      const editorLevels = (payload.levels ?? []).map((l) => ({
        level: l.level,
        name: l.name ?? null,
        nextLevelXp: l.next_level_xp,
        nextReward: l.next_reward ?? null,
        rewardAssetKey: l.reward_asset_key ?? null,
      }))

      setRawJson(JSON.stringify(editorLevels, null, 2))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      setRawJson('[]')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleSave = async () => {
    if (!tenantId) return
    setSaveError(null)

    const parsed = tryParseJsonArray(rawJson)
    if (!parsed.ok) {
      setSaveError(parsed.error)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/gamification/levels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tenantId, levels: parsed.value }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; details?: unknown } | null
        const details = typeof body?.details === 'string' ? body.details : null
        throw new Error(details ? `${body?.error ?? 'Save failed'}: ${details}` : body?.error ?? `Save failed (${res.status})`)
      }

      await reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Levels & unlocks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input value={tenantId ?? ''} readOnly placeholder="tenantId" />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <textarea
              className="h-80 w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
              placeholder='[{ "level": 1, "name": "Nybörjare", "nextLevelXp": 1000 }]'
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              disabled={loading || !tenantId}
            />
            {!parsedPreview.ok ? <p className="text-sm text-red-600">{parsedPreview.error}</p> : null}
            {saveError ? <p className="text-sm text-red-600">{saveError}</p> : null}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || loading || !tenantId || !parsedPreview.ok}>
              {saving ? 'Sparar…' : 'Spara'}
            </Button>
            <Button variant="outline" onClick={() => void reload()} disabled={saving || loading || !tenantId}>
              Ladda om
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
