'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

export type StorageRef = {
  bucket: 'media-images' | 'media-audio' | 'tenant-media' | 'custom_utmarkelser' | 'game-media'
  path: string
}

export type HotspotZone = {
  id: string
  x: number
  y: number
  radius: number
  label?: string
  required?: boolean
}

export type InteractiveImageEditorValue = {
  imageRef: StorageRef | null
  zones: HotspotZone[]
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }

export type InteractiveImageEditorProps = {
  value: InteractiveImageEditorValue
  tenantId?: string | null
  disabled?: boolean
  onChange: (next: InteractiveImageEditorValue) => void
}

const DEFAULT_RADIUS = 8

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`
}

async function uploadFileToBucket(options: {
  file: File
  tenantId?: string | null
  bucket: StorageRef['bucket']
}): Promise<{ ref: StorageRef; previewUrl: string }>
{
  const { file, tenantId, bucket } = options

  const uploadResponse = await fetch('/api/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      tenantId,
      bucket,
    }),
  })

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json().catch(() => ({}))
    throw new Error(typeof errorData?.error === 'string' ? errorData.error : 'Failed to get upload URL')
  }

  const { uploadUrl, path } = (await uploadResponse.json()) as { uploadUrl: string; path: string; bucket: string }

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type, 'x-upsert': 'true' },
    body: file,
  })

  if (!putResponse.ok) {
    throw new Error('Failed to upload file to storage')
  }

  const confirmResponse = await fetch('/api/media/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, path }),
  })

  if (!confirmResponse.ok) {
    const errorData = await confirmResponse.json().catch(() => ({}))
    throw new Error(typeof errorData?.error === 'string' ? errorData.error : 'Failed to confirm upload')
  }

  const { url } = (await confirmResponse.json()) as { url: string }

  return {
    ref: { bucket, path },
    previewUrl: url,
  }
}

async function resolvePreviewUrlFromRef(ref: StorageRef): Promise<string> {
  const confirmResponse = await fetch('/api/media/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: ref.bucket, path: ref.path }),
  })

  if (!confirmResponse.ok) {
    const errorData = await confirmResponse.json().catch(() => ({}))
    throw new Error(typeof errorData?.error === 'string' ? errorData.error : 'Failed to resolve preview URL')
  }

  const { url } = (await confirmResponse.json()) as { url: string }
  return url
}

export function InteractiveImageEditor({ value, tenantId, disabled = false, onChange }: InteractiveImageEditorProps) {
  const t = useTranslations('common.ui')
  const containerRef = useRef<HTMLDivElement>(null)

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const zones = value.zones
  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId]
  )

  const imageRef = value.imageRef

  useEffect(() => {
    let cancelled = false

    if (!imageRef) return

    resolvePreviewUrlFromRef(imageRef)
      .then((url) => {
        if (cancelled) return
        setPreviewUrl(url)
        setPreviewError(null)
      })
      .catch((err) => {
        if (cancelled) return
        logger.error(
          'InteractiveImageEditor failed to resolve preview URL',
          err instanceof Error ? err : undefined,
          { component: 'InteractiveImageEditor' }
        )
        setPreviewUrl(null)
        setPreviewError(err instanceof Error ? err.message : 'Failed to resolve preview')
      })

    return () => {
      cancelled = true
    }
  }, [imageRef])

  const effectivePreviewUrl = imageRef ? previewUrl : null
  const effectivePreviewError = imageRef ? previewError : null

  const handleUpload = async () => {
    if (!file) return

    setUploadState({ status: 'uploading' })
    try {
      const result = await uploadFileToBucket({ file, tenantId, bucket: 'media-images' })
      onChange({ ...value, imageRef: result.ref })
      setPreviewUrl(result.previewUrl)
      setPreviewError(null)
      setUploadState({ status: 'idle' })
      setFile(null)
    } catch (err) {
      logger.error(
        'InteractiveImageEditor upload failed',
        err instanceof Error ? err : undefined,
        { component: 'InteractiveImageEditor' }
      )
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  const handleImageClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    if (disabled) return
    if (!imageRef || !effectivePreviewUrl) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const nextZone: HotspotZone = {
      id: makeId(),
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      radius: DEFAULT_RADIUS,
      label: '',
      required: true,
    }

    onChange({ ...value, zones: [...zones, nextZone] })
    setSelectedZoneId(nextZone.id)
  }

  const updateZone = (zoneId: string, patch: Partial<HotspotZone>) => {
    onChange({
      ...value,
      zones: zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)),
    })
  }

  const deleteZone = (zoneId: string) => {
    onChange({ ...value, zones: zones.filter((z) => z.id !== zoneId) })
    if (selectedZoneId === zoneId) setSelectedZoneId(null)
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hotspot-image-upload">Bild (ladda upp)</Label>
          <Input
            id="hotspot-image-upload"
            type="file"
            accept="image/*"
            disabled={disabled || uploadState.status === 'uploading'}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={disabled || !file || uploadState.status === 'uploading'}
          >
            {uploadState.status === 'uploading' ? 'Laddar upp…' : 'Ladda upp'}
          </Button>

          {uploadState.status === 'error' && (
            <p className="text-sm text-destructive">{uploadState.message}</p>
          )}

          {value.imageRef && (
            <p className="text-xs text-muted-foreground">
              {value.imageRef.bucket}/{value.imageRef.path}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('imageEditor.clickToAddHotspot')}
        </p>

        {effectivePreviewError && (
          <p className="text-sm text-destructive">{effectivePreviewError}</p>
        )}

        {!effectivePreviewUrl ? (
          <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
            {t('imageEditor.uploadToStart')}
          </div>
        ) : (
          <div
            ref={containerRef}
            className={cn(
              'relative w-full overflow-hidden rounded-md border border-border',
              disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
            )}
            onClick={handleImageClick}
          >
            <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectivePreviewUrl}
                alt="Hotspot editor image"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
            </div>

            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation()
                  setSelectedZoneId(z.id)
                }}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border',
                  z.id === selectedZoneId ? 'border-primary' : 'border-primary/60'
                )}
                style={{
                  left: `${z.x}%`,
                  top: `${z.y}%`,
                  width: `${Math.max(8, z.radius * 2)}px`,
                  height: `${Math.max(8, z.radius * 2)}px`,
                  background: 'transparent',
                }}
                aria-label={z.label ? `Hotspot: ${z.label}` : 'Hotspot'}
              />
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Hotspots ({zones.length})</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || zones.length === 0}
            onClick={() => {
              onChange({ ...value, zones: [] })
              setSelectedZoneId(null)
            }}
          >
            {t('imageEditor.clear')}
          </Button>
        </div>

        {zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('imageEditor.noHotspotsYet')}</p>
        ) : (
          <div className="space-y-3">
            {selectedZone ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Etikett</Label>
                  <Input
                    value={selectedZone.label ?? ''}
                    disabled={disabled}
                    onChange={(e) => updateZone(selectedZone.id, { label: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Radie (px)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={200}
                    value={selectedZone.radius}
                    disabled={disabled}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      updateZone(selectedZone.id, { radius: Number.isFinite(n) ? n : DEFAULT_RADIUS })
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hotspot-required"
                    checked={selectedZone.required !== false}
                    disabled={disabled}
                    onChange={(e) => updateZone(selectedZone.id, { required: e.currentTarget.checked })}
                  />
                  <Label htmlFor="hotspot-required">{t('requiredForCompletion')}</Label>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={disabled}
                    onClick={() => deleteZone(selectedZone.id)}
                  >
                    Ta bort
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('imageEditor.selectHotspotToEdit')}</p>
            )}

            <div className="rounded-md border border-border">
              {zones.map((z, idx) => (
                <button
                  key={z.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm',
                    idx === 0 ? '' : 'border-t border-border',
                    z.id === selectedZoneId ? 'bg-muted/50' : ''
                  )}
                  onClick={() => setSelectedZoneId(z.id)}
                >
                  <span className="truncate">
                    {z.label?.trim() ? z.label : `Hotspot ${idx + 1}`} — ({z.x.toFixed(1)}%, {z.y.toFixed(1)}%)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    r={z.radius}px {z.required === false ? '(valfri)' : '(krävs)'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
