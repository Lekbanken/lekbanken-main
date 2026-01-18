'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Tabs, TabPanel } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  PhotoIcon, 
  SwatchIcon, 
  LanguageIcon, 
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import type { SystemDesignConfig, BrandConfig, MediaConfig, TypographyConfig, TokensConfig } from '@/types/design'
import { BrandAssetsTab } from './components/BrandAssetsTab'
import { MediaDefaultsTab } from './components/MediaDefaultsTab'
import { TypographyTab } from './components/TypographyTab'
import { AdvancedTab } from './components/AdvancedTab'

interface DesignPageClientProps {
  initialConfig?: SystemDesignConfig
  error?: string
}

export function DesignPageClient({ initialConfig, error }: DesignPageClientProps) {
  const t = useTranslations('design.page')
  const [config, setConfig] = useState<SystemDesignConfig | undefined>(initialConfig)
  const [activeTab, setActiveTab] = useState('brand')

  const tabs = [
    { id: 'brand', label: t('tabs.brand'), icon: <SwatchIcon className="h-4 w-4" /> },
    { id: 'media', label: t('tabs.media'), icon: <PhotoIcon className="h-4 w-4" /> },
    { id: 'typography', label: t('tabs.typography'), icon: <LanguageIcon className="h-4 w-4" /> },
    { id: 'advanced', label: t('tabs.advanced'), icon: <Cog6ToothIcon className="h-4 w-4" /> },
  ]

  const handleConfigUpdate = (updates: Partial<SystemDesignConfig>) => {
    if (config) {
      setConfig({ ...config, ...updates })
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Alert variant="error">
          {error}
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <Badge variant="secondary" className="text-xs">{t('badge')}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        {config?.updatedAt && (
          <p className="text-xs text-muted-foreground">
            {t('lastUpdated', { date: new Date(config.updatedAt).toLocaleString('sv-SE') })}
          </p>
        )}
      </div>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t.rich('info', {
              strong: (chunks) => <strong>{chunks}</strong>,
              em: (chunks) => <em>{chunks}</em>,
            })}
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={setActiveTab}
        className="max-w-2xl"
      />

      <div className="mt-6">
        <TabPanel id="brand" activeTab={activeTab}>
          <BrandAssetsTab 
            config={config?.brand} 
            onUpdate={(brand: BrandConfig) => handleConfigUpdate({ brand })} 
          />
        </TabPanel>

        <TabPanel id="media" activeTab={activeTab}>
          <MediaDefaultsTab 
            config={config?.media} 
            onUpdate={(media: MediaConfig) => handleConfigUpdate({ media })} 
          />
        </TabPanel>

        <TabPanel id="typography" activeTab={activeTab}>
          <TypographyTab 
            config={config?.typography} 
            onUpdate={(typography: TypographyConfig) => handleConfigUpdate({ typography })} 
          />
        </TabPanel>

        <TabPanel id="advanced" activeTab={activeTab}>
          <AdvancedTab 
            config={config?.tokens} 
            onUpdate={(tokens: TokensConfig) => handleConfigUpdate({ tokens })} 
          />
        </TabPanel>
      </div>
    </div>
  )
}
