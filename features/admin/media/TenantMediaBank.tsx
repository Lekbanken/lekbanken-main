'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/utils/logger'

type Media = {
  id: string
  name: string
  url: string
  alt_text: string | null
  type: 'template' | 'upload' | 'ai'
  created_at: string
}

type TenantMediaBankProps = {
  tenantId: string
}

export function TenantMediaBank({ tenantId }: TenantMediaBankProps) {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadMedia = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/media?tenantId=${tenantId}&type=upload&limit=100`)
      if (!response.ok) throw new Error('Failed to load media')

      const data = await response.json()
      setMedia(data.media || [])
    } catch (error) {
      logger.error('Failed to load tenant media', error instanceof Error ? error : undefined, {
        tenantId
      })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

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
          component: 'TenantMediaBank',
          tenantId,
          errorData
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
          component: 'TenantMediaBank',
          tenantId,
          status: putResponse.status
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
          component: 'TenantMediaBank',
          tenantId,
          errorData
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
          component: 'TenantMediaBank',
          tenantId,
          errorData
        })
        throw new Error(errorData.error || 'Failed to create media record')
      }

      await loadMedia()
      setUploadFile(null)
    } catch (error) {
      logger.error('Tenant media upload failed', error instanceof Error ? error : undefined, {
        component: 'TenantMediaBank',
        tenantId
      })
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Please try again'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (mediaId: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return

    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete media')

      await loadMedia()
    } catch (error) {
      logger.error('Failed to delete tenant media', error instanceof Error ? error : undefined, {
        component: 'TenantMediaBank',
        tenantId,
        mediaId
      })
      alert('Delete failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload New Media</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select Image File</Label>
            <Input
              id="file-upload"
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
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Media Library ({media.length})</h3>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : media.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No media uploaded yet. Upload your first image above.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="relative aspect-square">
                  <Image
                    src={item.url}
                    alt={item.alt_text || item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    className="w-full"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
