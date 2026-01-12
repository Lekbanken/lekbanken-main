'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  UserCircleIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import type { MediaConfig, SystemAssetType } from '@/types/design'
import { uploadSystemAsset, deleteSystemAsset } from '@/app/actions/design'

interface MediaDefaultsTabProps {
  config?: MediaConfig
  onUpdate: (config: MediaConfig) => void
}

export function MediaDefaultsTab({ config, onUpdate }: MediaDefaultsTabProps) {
  const t = useTranslations('admin.design.mediaDefaults')
  return (
    <div className="space-y-6">
      {/* Default Profile Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5" />
            Standard profilbilder
          </CardTitle>
          <CardDescription>
            Förvalda profilbilder som användare kan välja. Används också som fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageGallery
            images={config?.defaultProfileImages || []}
            assetType="default-profile"
            onAdd={(url) => {
              const images = [...(config?.defaultProfileImages || []), url]
              onUpdate({ ...config, defaultProfileImages: images })
            }}
            onRemove={(url) => {
              const images = (config?.defaultProfileImages || []).filter(u => u !== url)
              onUpdate({ ...config, defaultProfileImages: images })
            }}
            emptyMessage={t('noDefaultProfileImages')}
          />
        </CardContent>
      </Card>

      {/* Default Cover Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            Standard omslagsbilder
          </CardTitle>
          <CardDescription>
            Förvalda omslagsbilder för lekar och aktiviteter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageGallery
            images={config?.defaultCoverImages || []}
            assetType="default-cover"
            onAdd={(url) => {
              const images = [...(config?.defaultCoverImages || []), url]
              onUpdate({ ...config, defaultCoverImages: images })
            }}
            onRemove={(url) => {
              const images = (config?.defaultCoverImages || []).filter(u => u !== url)
              onUpdate({ ...config, defaultCoverImages: images })
            }}
            emptyMessage={t('noDefaultCoverImages')}
            aspectRatio="wide"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image Gallery Component
// ---------------------------------------------------------------------------

interface ImageGalleryProps {
  images: string[]
  assetType: SystemAssetType
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  emptyMessage: string
  aspectRatio?: 'square' | 'wide'
}

function ImageGallery({
  images,
  assetType,
  onAdd,
  onRemove,
  emptyMessage,
  aspectRatio = 'square',
}: ImageGalleryProps) {
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { success: toastSuccess, error: toastError } = useToast()

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadSystemAsset(assetType, formData)
      
      if (result.success && result.data) {
        onAdd(result.data.url)
        toastSuccess('Bild uppladdad')
      } else {
        toastError(result.error || 'Uppladdning misslyckades')
      }
    } catch (error) {
      toastError('Ett fel uppstod')
      console.error(error)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [assetType, onAdd, toastSuccess, toastError])

  const handleRemove = useCallback(async (url: string) => {
    try {
      const result = await deleteSystemAsset(assetType, url)
      if (result.success) {
        onRemove(url)
        toastSuccess('Bild borttagen')
      } else {
        toastError(result.error || 'Kunde inte ta bort')
      }
    } catch (error) {
      toastError('Ett fel uppstod')
      console.error(error)
    }
  }, [assetType, onRemove, toastSuccess, toastError])

  const gridClass = aspectRatio === 'wide' 
    ? 'grid gap-4 grid-cols-2 lg:grid-cols-3'
    : 'grid gap-4 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'

  const itemClass = aspectRatio === 'wide'
    ? 'relative aspect-video rounded-lg overflow-hidden border bg-muted group'
    : 'relative aspect-square rounded-lg overflow-hidden border bg-muted group'

  return (
    <div className="space-y-4">
      <div className={gridClass}>
        {images.map((url, index) => (
          <div key={url} className={itemClass}>
            <Image
              src={url}
              alt={`Bild ${index + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRemove(url)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`
            ${itemClass}
            border-dashed border-2 flex flex-col items-center justify-center
            text-muted-foreground hover:text-foreground hover:border-primary/50
            transition-colors cursor-pointer
          `}
        >
          <CloudArrowUpIcon className="h-8 w-8 mb-1" />
          <span className="text-xs">
            {isUploading ? 'Laddar...' : 'Lägg till'}
          </span>
        </button>
      </div>

      {images.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {emptyMessage}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
