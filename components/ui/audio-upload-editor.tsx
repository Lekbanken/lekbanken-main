'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { logger } from '@/lib/utils/logger'

export type StorageRef = {
  bucket: 'media-images' | 'media-audio' | 'tenant-media' | 'custom_utmarkelser' | 'game-media'
  path: string
}

export type AudioUploadEditorValue = {
  audioRef: StorageRef | null
  autoPlay: boolean
  requireAck: boolean
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }

export type AudioUploadEditorProps = {
  value: AudioUploadEditorValue
  tenantId?: string | null
  disabled?: boolean
  onChange: (next: AudioUploadEditorValue) => void
}

async function uploadFileToBucket(options: {
  file: File
  tenantId?: string | null
  bucket: StorageRef['bucket']
}): Promise<{ ref: StorageRef; previewUrl: string }> {
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

export function AudioUploadEditor({ value, tenantId, disabled = false, onChange }: AudioUploadEditorProps) {
  const t = useTranslations('common.ui')
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const audioRef = value.audioRef

  useEffect(() => {
    let cancelled = false

    if (!audioRef) return

    resolvePreviewUrlFromRef(audioRef)
      .then((url) => {
        if (cancelled) return
        setPreviewUrl(url)
        setPreviewError(null)
      })
      .catch((err) => {
        if (cancelled) return
        logger.error(
          'AudioUploadEditor failed to resolve preview URL',
          err instanceof Error ? err : undefined,
          { component: 'AudioUploadEditor' }
        )
        setPreviewUrl(null)
        setPreviewError(err instanceof Error ? err.message : 'Failed to resolve preview')
      })

    return () => {
      cancelled = true
    }
  }, [audioRef])

  const effectivePreviewUrl = audioRef ? previewUrl : null
  const effectivePreviewError = audioRef ? previewError : null

  const handleUpload = async () => {
    if (!file) return

    setUploadState({ status: 'uploading' })
    try {
      const result = await uploadFileToBucket({ file, tenantId, bucket: 'media-audio' })
      onChange({ ...value, audioRef: result.ref })
      setPreviewUrl(result.previewUrl)
      setPreviewError(null)
      setUploadState({ status: 'idle' })
      setFile(null)
    } catch (err) {
      logger.error(
        'AudioUploadEditor upload failed',
        err instanceof Error ? err : undefined,
        { component: 'AudioUploadEditor' }
      )
      setUploadState({ status: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="audio-upload">Ljudfil (ladda upp)</Label>
          <Input
            id="audio-upload"
            type="file"
            accept="audio/*"
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

          {value.audioRef && (
            <p className="text-xs text-muted-foreground">
              {value.audioRef.bucket}/{value.audioRef.path}
            </p>
          )}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('audioEditor.autoplay')}</p>
            <p className="text-xs text-muted-foreground">{t('audioEditor.autoplayDescription')}</p>
          </div>
          <Switch
            checked={value.autoPlay}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...value, autoPlay: checked })}
          />
        </div>

        {effectivePreviewError && (
          <p className="text-sm text-destructive">{effectivePreviewError}</p>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('audioEditor.requireAck')}</p>
            <p className="text-xs text-muted-foreground">{t('audioEditor.requireAckDescription')}</p>
          </div>
          <Switch
            checked={value.requireAck}
            disabled={disabled}
            onCheckedChange={(checked) => onChange({ ...value, requireAck: checked })}
          />
        </div>

        {effectivePreviewUrl ? (
          <audio controls src={effectivePreviewUrl} className="w-full" />
        ) : (
          <p className="text-sm text-muted-foreground">{t('audioEditor.uploadToPreview')}</p>
        )}
      </Card>
    </div>
  )
}
