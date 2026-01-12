'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import type { TypographyConfig } from '@/types/design'
import { updateSystemDesignConfig } from '@/app/actions/design'
import { DEFAULT_TYPOGRAPHY } from '@/lib/design/defaults'

interface TypographyTabProps {
  config?: TypographyConfig
  onUpdate: (config: TypographyConfig) => void
}

const FONT_PRESETS = [
  { labelKey: 'Inter (Standard)', value: 'Inter, system-ui, sans-serif', url: undefined },
  { labelKey: 'Roboto', value: 'Roboto, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap' },
  { labelKey: 'Open Sans', value: 'Open Sans, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;700&display=swap' },
  { labelKey: 'Poppins', value: 'Poppins, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' },
  { labelKey: 'Nunito', value: 'Nunito, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;700&display=swap' },
  { labelKey: 'Lato', value: 'Lato, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { labelKey: 'custom', value: 'custom', url: undefined },
]

export function TypographyTab({ config, onUpdate }: TypographyTabProps) {
  const t = useTranslations('admin.design')
  const [isSaving, setIsSaving] = useState(false)
  const [fontFamily, setFontFamily] = useState(config?.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily || '')
  const [fontUrl, setFontUrl] = useState(config?.fontUrl || '')
  const [titleFormat, setTitleFormat] = useState<'normal' | 'uppercase' | 'capitalize'>(
    config?.titleFormat || 'normal'
  )
  const [baseSize, setBaseSize] = useState(config?.scale?.base || 16)
  const [isCustomFont, setIsCustomFont] = useState(
    !FONT_PRESETS.some(p => p.value === fontFamily && p.value !== 'custom')
  )
  const { success: toastSuccess, error: toastError } = useToast()

  const TITLE_FORMATS = [
    { label: t('typography.titleFormat.normal'), value: 'normal' },
    { label: t('typography.titleFormat.uppercase'), value: 'uppercase' },
    { label: t('typography.titleFormat.capitalize'), value: 'capitalize' },
  ] as const

  const handleFontPresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === 'custom') {
      setIsCustomFont(true)
      setFontFamily('')
      setFontUrl('')
    } else {
      setIsCustomFont(false)
      setFontFamily(value)
      const preset = FONT_PRESETS.find(p => p.value === value)
      setFontUrl(preset?.url || '')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const typography: TypographyConfig = {
        fontFamily,
        fontUrl: fontUrl || undefined,
        titleFormat,
        scale: {
          base: baseSize,
          steps: DEFAULT_TYPOGRAPHY.scale?.steps || [],
        },
      }

      const result = await updateSystemDesignConfig({ typography })
      
      if (result.success) {
        onUpdate(typography)
        toastSuccess(t('toasts.typographySaved'))
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
    fontFamily !== (config?.fontFamily || DEFAULT_TYPOGRAPHY.fontFamily) ||
    fontUrl !== (config?.fontUrl || '') ||
    titleFormat !== (config?.titleFormat || 'normal') ||
    baseSize !== (config?.scale?.base || 16)

  return (
    <div className="space-y-6">
      {/* Font Family */}
      <Card>
        <CardHeader>
          <CardTitle>{t('typography.fontFamily.title')}</CardTitle>
          <CardDescription>
            {t('typography.fontFamily.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Select 
              label={t('typography.fontFamily.selectLabel')}
              options={FONT_PRESETS.map(p => ({ 
                value: p.value, 
                label: p.labelKey === 'custom' ? t('typography.fontFamily.custom') : p.labelKey 
              }))}
              value={isCustomFont ? 'custom' : fontFamily} 
              onChange={handleFontPresetChange}
              placeholder={t('typography.fontFamily.selectPlaceholder')}
            />
          </div>

          {isCustomFont && (
            <div className="space-y-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="customFontFamily">{t('typography.fontFamily.customFontFamily')}</Label>
                <Input
                  id="customFontFamily"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  placeholder={t('typography.fontFamily.customFontFamilyPlaceholder')}
                  className="font-mono max-w-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customFontUrl">{t('typography.fontFamily.customFontUrl')}</Label>
                <Input
                  id="customFontUrl"
                  value={fontUrl}
                  onChange={(e) => setFontUrl(e.target.value)}
                  placeholder={t('typography.fontFamily.customFontUrlPlaceholder')}
                  className="font-mono"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="pt-4">
            <Label className="text-muted-foreground">{t('typography.fontFamily.preview')}</Label>
            <div 
              className="mt-2 p-4 border rounded-lg bg-muted/30"
              style={{ fontFamily }}
            >
              <p className="text-2xl font-bold mb-2">{t('typography.fontFamily.previewHeading')}</p>
              <p className="text-base">
                {t('typography.fontFamily.previewBody')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Title Format */}
      <Card>
        <CardHeader>
          <CardTitle>{t('typography.titleFormat.title')}</CardTitle>
          <CardDescription>
            {t('typography.titleFormat.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-sm">
            <Select 
              label={t('typography.titleFormat.label')}
              options={TITLE_FORMATS.map(f => ({ value: f.value, label: f.label }))}
              value={titleFormat} 
              onChange={(e) => setTitleFormat(e.target.value as typeof titleFormat)}
            />
          </div>

          {/* Preview */}
          <div className="pt-2">
            <p 
              className="text-xl font-semibold"
              style={{ textTransform: titleFormat }}
            >
              {t('typography.titleFormat.example')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Font Size Scale */}
      <Card>
        <CardHeader>
          <CardTitle>{t('typography.size.title')}</CardTitle>
          <CardDescription>
            {t('typography.size.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseSize">{t('typography.size.baseSize')}</Label>
            <div className="flex items-center gap-4 max-w-sm">
              <Input
                id="baseSize"
                type="number"
                min={12}
                max={20}
                value={baseSize}
                onChange={(e) => setBaseSize(Number(e.target.value))}
                className="w-24"
              />
              <input
                type="range"
                min={12}
                max={20}
                value={baseSize}
                onChange={(e) => setBaseSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">{baseSize}px</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? t('toasts.saving') : t('typography.saveTypography')}
          </Button>
        </div>
      )}
    </div>
  )
}
