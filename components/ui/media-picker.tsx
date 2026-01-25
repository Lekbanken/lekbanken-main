'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs } from '@/components/ui/tabs'
import { DiagramThumbnail } from '@/components/ui/diagram-thumbnail'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

type Media = {
  id: string
  name: string
  url: string
  alt_text: string | null
  type: 'template' | 'upload' | 'ai' | 'diagram'
  created_at: string
}

type MediaPickerProps = {
  value?: string | null
  onSelect: (mediaId: string, url: string) => void
  tenantId?: string | null
  mainPurposeId?: string | null
  mainPurposeName?: string | null
  trigger?: React.ReactNode
  allowUpload?: boolean
  allowTemplate?: boolean
  libraryType?: 'upload' | 'diagram'
}

export function MediaPicker({
  value,
  onSelect,
  tenantId,
  mainPurposeId,
  mainPurposeName,
  trigger,
  allowUpload = true,
  allowTemplate = true,
  libraryType = 'upload',
}: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const [media, setMedia] = useState<Media[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(value ?? null)
  const [loading, setLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('library')

  const tabs = [
    { id: 'library', label: 'Bibliotek', disabled: false },
    ...(allowTemplate ? [{ id: 'templates', label: mainPurposeName ? `Standardbilder (${mainPurposeName})` : 'Standardbilder', disabled: false }] : []),
    ...(allowUpload ? [{ id: 'upload', label: 'Ladda upp', disabled: false }] : []),
  ]

  const loadMedia = async (type?: 'template' | 'upload' | 'diagram') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (tenantId) params.set('tenantId', tenantId)
      if (type) params.set('type', type)
      // For templates, filter by main purpose if provided
      if (type === 'template' && mainPurposeId) {
        params.set('mainPurposeId', mainPurposeId)
      }

      const response = await fetch(`/api/media?${params}`)
      if (!response.ok) throw new Error('Failed to load media')

      const data = await response.json()
      setMedia(data.media || [])
    } catch (error) {
      logger.error('Failed to load media in picker', error instanceof Error ? error : undefined, {
        tenantId: tenantId ?? undefined,
        type
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return

    setUploading(true)
    try {
      const uploadResponse = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          fileSize: uploadFile.size,
          tenantId,
          bucket: 'tenant-media',
        }),
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        logger.error('Upload URL request failed', undefined, {
          component: 'MediaPicker',
          errorData,
          fileName: uploadFile.name
        })
        throw new Error(errorData.error || 'Failed to get upload URL')
      }
      const { uploadUrl, bucket, path } = await uploadResponse.json()

      const putResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadFile.type, 'x-upsert': 'true' },
        body: uploadFile,
      })

      if (!putResponse.ok) {
        logger.error('Storage upload failed', undefined, {
          component: 'MediaPicker',
          status: putResponse.status,
          statusText: putResponse.statusText,
          fileName: uploadFile.name
        })
        throw new Error('Failed to upload file to storage')
      }

      const confirmResponse = await fetch('/api/media/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, path }),
      })

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}))
        logger.error('Upload confirmation failed', undefined, {
          component: 'MediaPicker',
          errorData,
          fileName: uploadFile.name
        })
        throw new Error(errorData.error || 'Failed to confirm upload')
      }
      const { url } = await confirmResponse.json()

      const createResponse = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadFile.name,
          type: 'upload',
          url,
          tenant_id: tenantId,
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        logger.error('Create media record failed', undefined, {
          component: 'MediaPicker',
          errorData,
          fileName: uploadFile.name
        })
        throw new Error(errorData.error || 'Failed to create media record')
      }
      const { media: newMedia } = await createResponse.json()

      await loadMedia('upload')
      setSelectedId(newMedia.id)
      setUploadFile(null)
    } catch (error) {
      logger.error('Media upload failed', error instanceof Error ? error : undefined, {
        component: 'MediaPicker',
        fileName: uploadFile?.name
      })
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleSelect = () => {
    const selected = media.find((m) => m.id === selectedId)
    if (selected) {
      onSelect(selected.id, selected.url)
      setOpen(false)
    }
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (tabId === 'library') loadMedia(libraryType)
    else if (tabId === 'templates') loadMedia('template')
    else if (tabId === 'upload') loadMedia('upload')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" onClick={() => loadMedia(libraryType)}>
            Select Media
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>

        <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        <div className="mt-4">
          {activeTab === 'library' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : media.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No media found</div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105',
                        selectedId === item.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                      )}
                    >
                      {/* Use DiagramThumbnail for diagrams to show court background, native img fallback */}
                      {item.type === 'diagram' ? (
                        <DiagramThumbnail
                          url={item.url}
                          alt={item.alt_text || item.name}
                          className="absolute inset-0 w-full h-full bg-white"
                        />
                      ) : (
                        <Image
                          src={item.url}
                          alt={item.alt_text || item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              {mainPurposeId && mainPurposeName && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Visar standardbilder för <span className="font-medium text-foreground">{mainPurposeName}</span>
                </div>
              )}
              {!mainPurposeId && (
                <div className="text-center py-4 text-muted-foreground bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <p className="text-sm">Välj ett huvudsyfte först för att se standardbilder</p>
                </div>
              )}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Laddar...</div>
              ) : media.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {mainPurposeId ? 'Inga standardbilder för detta syfte' : 'Inga standardbilder hittades'}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-105',
                        selectedId === item.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                      )}
                    >
                      <Image
                        src={item.url}
                        alt={item.alt_text || item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 20vw"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  disabled={uploading}
                />
              </div>
              {uploadFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedId}>
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
