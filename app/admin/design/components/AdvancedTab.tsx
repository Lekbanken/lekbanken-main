'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { TokensConfig } from '@/types/design'
import { updateSystemDesignConfig } from '@/app/actions/design'
import { DEFAULT_TOKENS } from '@/lib/design/defaults'

interface AdvancedTabProps {
  config?: TokensConfig
  onUpdate: (config: TokensConfig) => void
}

export function AdvancedTab({ config, onUpdate }: AdvancedTabProps) {
  const t = useTranslations('admin.design')
  const [isSaving, setIsSaving] = useState(false)
  const [radius, setRadius] = useState(config?.radius || DEFAULT_TOKENS.radius || {})
  const { success: toastSuccess, error: toastError } = useToast()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const tokens: TokensConfig = {
        ...config,
        radius,
      }

      const result = await updateSystemDesignConfig({ tokens })
      
      if (result.success) {
        onUpdate(tokens)
        toastSuccess(t('toasts.tokensSaved'))
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

  const hasChanges = JSON.stringify(radius) !== JSON.stringify(config?.radius || DEFAULT_TOKENS.radius)

  return (
    <div className="space-y-6">
      {/* Info */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="pt-4 flex items-start gap-3">
          <BeakerIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {t('advanced.title')}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {t('advanced.warning')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('advanced.borderRadius.title')}
            <Badge variant="secondary">{t('advanced.borderRadius.badge')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('advanced.borderRadius.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
              <div key={size} className="space-y-2">
                <Label htmlFor={`radius-${size}`} className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    --radius-{size}
                  </span>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id={`radius-${size}`}
                    value={radius[size] || ''}
                    onChange={(e) => setRadius({ ...radius, [size]: e.target.value })}
                    placeholder={DEFAULT_TOKENS.radius?.[size]}
                    className="font-mono flex-1"
                  />
                  <div 
                    className="w-10 h-10 bg-primary/20 border-2 border-primary"
                    style={{ borderRadius: radius[size] || DEFAULT_TOKENS.radius?.[size] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CSS Variables (future) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('advanced.cssVariables.title')}
            <Badge variant="outline">{t('advanced.cssVariables.badge')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('advanced.cssVariables.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('advanced.cssVariables.info')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Spacing (future) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('advanced.spacingScale.title')}
            <Badge variant="outline">{t('advanced.spacingScale.badge')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('advanced.spacingScale.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('advanced.spacingScale.info')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? t('toasts.saving') : t('advanced.saveTokens')}
          </Button>
        </div>
      )}
    </div>
  )
}
