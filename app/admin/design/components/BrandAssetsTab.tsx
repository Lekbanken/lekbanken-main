'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  ClipboardIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import type { BrandConfig, SystemAssetType } from '@/types/design'
import { uploadSystemAsset, deleteSystemAsset, updateSystemDesignConfig } from '@/app/actions/design'

interface BrandAssetsTabProps {
  config?: BrandConfig
  onUpdate: (config: BrandConfig) => void
}

export function BrandAssetsTab({ config, onUpdate }: BrandAssetsTabProps) {
  const t = useTranslations('admin.design')
  return (
    <div className="space-y-6">
      {/* Logos */}
      <Card>
        <CardHeader>
          <CardTitle>{t('brand.logos.title')}</CardTitle>
          <CardDescription>
            {t('brand.logos.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <AssetUploader
            label={t('brand.logos.light')}
            description={t('brand.logos.lightDesc')}
            icon={<SunIcon className="h-5 w-5" />}
            currentUrl={config?.logoLightUrl}
            assetType="logo-light"
            onUpload={(url) => onUpdate({ ...config, logoLightUrl: url })}
            onDelete={() => onUpdate({ ...config, logoLightUrl: undefined })}
          />
          <AssetUploader
            label={t('brand.logos.dark')}
            description={t('brand.logos.darkDesc')}
            icon={<MoonIcon className="h-5 w-5" />}
            currentUrl={config?.logoDarkUrl}
            assetType="logo-dark"
            onUpload={(url) => onUpdate({ ...config, logoDarkUrl: url })}
            onDelete={() => onUpdate({ ...config, logoDarkUrl: undefined })}
          />
        </CardContent>
      </Card>

      {/* App Icon */}
      <Card>
        <CardHeader>
          <CardTitle>{t('brand.appIcon.title')}</CardTitle>
          <CardDescription>
            {t('brand.appIcon.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssetUploader
            label={t('brand.appIcon.label')}
            description={t('brand.appIcon.labelDesc')}
            currentUrl={config?.iconUrl}
            assetType="icon"
            onUpload={(url) => onUpdate({ ...config, iconUrl: url })}
            onDelete={() => onUpdate({ ...config, iconUrl: undefined })}
            previewSize="small"
          />
        </CardContent>
      </Card>

      {/* Favicons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('brand.favicons.title')}</CardTitle>
          <CardDescription>
            {t('brand.favicons.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <AssetUploader
            label={t('brand.favicons.light')}
            description={t('brand.favicons.lightDesc')}
            icon={<SunIcon className="h-4 w-4" />}
            currentUrl={config?.faviconLightUrl}
            assetType="favicon-light"
            onUpload={(url) => onUpdate({ ...config, faviconLightUrl: url })}
            onDelete={() => onUpdate({ ...config, faviconLightUrl: undefined })}
            previewSize="small"
          />
          <AssetUploader
            label={t('brand.favicons.dark')}
            description={t('brand.favicons.darkDesc')}
            icon={<MoonIcon className="h-4 w-4" />}
            currentUrl={config?.faviconDarkUrl}
            assetType="favicon-dark"
            onUpload={(url) => onUpdate({ ...config, faviconDarkUrl: url })}
            onDelete={() => onUpdate({ ...config, faviconDarkUrl: undefined })}
            previewSize="small"
          />
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle>{t('brand.colors.title')}</CardTitle>
          <CardDescription>
            {t('brand.colors.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ColorPickers config={config} onUpdate={onUpdate} />
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Asset Uploader Component
// ---------------------------------------------------------------------------

interface AssetUploaderProps {
  label: string
  description: string
  icon?: React.ReactNode
  currentUrl?: string
  assetType: SystemAssetType
  onUpload: (url: string) => void
  onDelete: () => void
  previewSize?: 'small' | 'large'
}

function AssetUploader({
  label,
  description,
  icon,
  currentUrl,
  assetType,
  onUpload,
  onDelete,
  previewSize = 'large',
}: AssetUploaderProps) {
  const t = useTranslations('admin.design')
  const [isUploading, setIsUploading] = useState(false)
  const [copied, setCopied] = useState(false)
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
        onUpload(result.data.url)
        toastSuccess(t('toasts.uploadComplete'))
      } else {
        toastError(result.error || t('toasts.uploadFailed'))
      }
    } catch (error) {
      toastError(t('toasts.error'))
      console.error(error)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [assetType, onUpload, toastSuccess, toastError, t])

  const handleDelete = useCallback(async () => {
    try {
      const result = await deleteSystemAsset(assetType)
      if (result.success) {
        onDelete()
        toastSuccess(t('toasts.deleted'))
      } else {
        toastError(result.error || t('toasts.couldNotDelete'))
      }
    } catch (error) {
      toastError(t('toasts.error'))
      console.error(error)
    }
  }, [assetType, onDelete, toastSuccess, toastError, t])

  const handleCopyUrl = useCallback(() => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [currentUrl])

  const previewDimensions = previewSize === 'small' 
    ? { width: 64, height: 64 } 
    : { width: 200, height: 80 }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <Label className="font-medium">{label}</Label>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>

      {currentUrl ? (
        <div className="space-y-3">
          {/* Preview */}
          <div 
            className={`relative rounded-lg border bg-muted/30 p-4 flex items-center justify-center ${
              previewSize === 'small' ? 'w-24 h-24' : 'w-full h-32'
            }`}
          >
            <Image
              src={currentUrl}
              alt={label}
              width={previewDimensions.width}
              height={previewDimensions.height}
              className="object-contain max-h-full"
              unoptimized
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-1" />
              {t('brand.assetUploader.replace')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 mr-1 text-green-600" />
              ) : (
                <ClipboardIcon className="h-4 w-4 mr-1" />
              )}
              {copied ? t('toasts.copied') : t('brand.assetUploader.copyUrl')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className={`
            w-full rounded-lg border-2 border-dashed border-muted-foreground/25 
            bg-muted/30 p-6 text-center transition-colors
            hover:border-primary/50 hover:bg-muted/50
            ${isUploading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            ${previewSize === 'small' ? 'py-4' : 'py-8'}
          `}
        >
          <CloudArrowUpIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isUploading ? t('brand.assetUploader.uploading') : t('brand.assetUploader.clickToUpload')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('brand.assetUploader.fileTypes')}
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Color Pickers Component
// ---------------------------------------------------------------------------

interface ColorPickersProps {
  config?: BrandConfig
  onUpdate: (config: BrandConfig) => void
}

function ColorPickers({ config, onUpdate }: ColorPickersProps) {
  const t = useTranslations('admin.design')
  const [isSaving, setIsSaving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState(config?.primaryColor || '#6366f1')
  const [secondaryColor, setSecondaryColor] = useState(config?.secondaryColor || '#8b5cf6')
  const { success: toastSuccess, error: toastError } = useToast()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await updateSystemDesignConfig({
        brand: { primaryColor, secondaryColor },
      })
      if (result.success) {
        onUpdate({ ...config, primaryColor, secondaryColor })
        toastSuccess(t('toasts.colorsSaved'))
      } else {
        toastError(result.error || t('toasts.couldNotSave'))
      }
    } catch (error) {
      toastError(t('toasts.error'))
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = 
    primaryColor !== (config?.primaryColor || '#6366f1') ||
    secondaryColor !== (config?.secondaryColor || '#8b5cf6')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">{t('brand.colors.primary')}</Label>
          <div className="flex gap-2">
            <div 
              className="w-10 h-10 rounded-lg border shadow-sm"
              style={{ backgroundColor: primaryColor }}
            />
            <Input
              id="primaryColor"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#6366f1"
              className="font-mono"
            />
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="secondaryColor">{t('brand.colors.secondary')}</Label>
          <div className="flex gap-2">
            <div 
              className="w-10 h-10 rounded-lg border shadow-sm"
              style={{ backgroundColor: secondaryColor }}
            />
            <Input
              id="secondaryColor"
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#8b5cf6"
              className="font-mono"
            />
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {hasChanges && (
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? t('toasts.saving') : t('brand.colors.saveColors')}
        </Button>
      )}
    </div>
  )
}
