'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { MediaPicker } from '@/components/ui/media-picker'
import { ClipboardIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/utils/logger'

type MediaTemplate = {
  id: string
  template_key: string
  name: string
  description: string | null
  product_id: string | null
  main_purpose_id: string
  sub_purpose_id: string | null
  media_id: string
  priority: number
  is_default: boolean
  created_at: string
  updated_at: string
  media?: {
    id: string
    name: string
    url: string
    alt_text: string | null
  }
  main_purpose?: {
    id: string
    name: string
  }
  sub_purpose?: {
    id: string
    name: string
  } | null
  product?: {
    id: string
    name: string
  } | null
}

type Product = {
  id: string
  name: string
}

type Purpose = {
  id: string
  name: string
}

type StandardImagesManagerProps = {
  tenantId: string
}

export function StandardImagesManager({ tenantId }: StandardImagesManagerProps) {
  const t = useTranslations('admin.media.standardImagesManager')
  const toast = useToast()

  const [templates, setTemplates] = useState<MediaTemplate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const [listQuery, setListQuery] = useState('')
  const [listProductFilter, setListProductFilter] = useState<string>('')
  const [listPurposeFilter, setListPurposeFilter] = useState<string>('')

  const [deleteTarget, setDeleteTarget] = useState<MediaTemplate | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Create form state
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedMainPurpose, setSelectedMainPurpose] = useState<string>('')
  const [selectedSubPurpose, setSelectedSubPurpose] = useState<string>('')
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const [templateKey, setTemplateKey] = useState<string>('')
  const [templateName, setTemplateName] = useState<string>('')
  const [templateDescription, setTemplateDescription] = useState<string>('')

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/media/templates')
      if (!response.ok) throw new Error('Failed to load templates')

      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (error) {
      logger.error('Failed to load media templates', error instanceof Error ? error : undefined, {
        component: 'StandardImagesManager',
        tenantId
      })
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to load products')

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      logger.error('Failed to load products', error instanceof Error ? error : undefined, {
        component: 'StandardImagesManager'
      })
    }
  }, [])

  const loadPurposes = useCallback(async () => {
    try {
      const response = await fetch('/api/purposes')
      if (!response.ok) throw new Error('Failed to load purposes')

      const data = await response.json()
      setPurposes(data.purposes || [])
    } catch (error) {
      logger.error('Failed to load purposes', error instanceof Error ? error : undefined, {
        component: 'StandardImagesManager'
      })
    }
  }, [])

  // Load initial data on mount
  useEffect(
    () => {
      loadTemplates()
      loadProducts()
      loadPurposes()
    },
    [loadTemplates, loadProducts, loadPurposes]
  )

  const handleCreateTemplate = async () => {
    if (!selectedMediaId || !selectedMainPurpose || !templateKey || !templateName) return

    try {
      const response = await fetch('/api/media/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct || null,
          mainPurposeId: selectedMainPurpose,
          subPurposeId: selectedSubPurpose || null,
          mediaId: selectedMediaId,
          templateKey,
          name: templateName,
          description: templateDescription || null,
          priority: 0,
          isDefault: false,
        }),
      })

      if (!response.ok) throw new Error('Failed to create template')

      await loadTemplates()
      toast.success(t('toast.saved'))
      setShowCreateDialog(false)
      setSelectedProduct('')
      setSelectedMainPurpose('')
      setSelectedSubPurpose('')
      setSelectedMediaId(null)
      setTemplateKey('')
      setTemplateName('')
      setTemplateDescription('')
    } catch (error) {
      logger.error('Failed to create media template', error instanceof Error ? error : undefined, {
        component: 'StandardImagesManager',
        tenantId,
        templateKey
      })
      toast.error(t('toast.saveFailed'))
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setDeleteLoading(true)
      const response = await fetch(`/api/media/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete template')

      await loadTemplates()
      toast.success(t('toast.deleted'))
    } catch (error) {
      logger.error('Failed to delete media template', error instanceof Error ? error : undefined, {
        component: 'StandardImagesManager',
        tenantId,
        templateId
      })
      toast.error(t('toast.deleteFailed'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const getProductName = useCallback(
    (productId: string | null) => {
      if (!productId) return t('labels.globalProduct')
      return products.find((p) => p.id === productId)?.name || t('labels.unknownProduct')
    },
    [products, t]
  )

  const filteredTemplates = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    return templates.filter((t) => {
      if (listProductFilter) {
        if (listProductFilter === '__global__') {
          if (t.product_id !== null) return false
        } else if ((t.product_id ?? '') !== listProductFilter) {
          return false
        }
      }
      if (listPurposeFilter) {
        if ((t.main_purpose_id ?? '') !== listPurposeFilter) return false
      }
      if (!q) return true

      const haystack = [
        t.name,
        t.template_key,
        t.description ?? '',
        t.main_purpose?.name ?? '',
        t.sub_purpose?.name ?? '',
        getProductName(t.product_id),
        t.media?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(q)
    })
  }, [templates, listProductFilter, listPurposeFilter, listQuery, getProductName])

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(t('toast.copied'))
    } catch {
      toast.error(t('toast.copyFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          if (deleteLoading) return
          setDeleteTarget(null)
        }}
        onConfirm={async () => {
          if (!deleteTarget) return
          await handleDeleteTemplate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        title={t('delete.title')}
        description={
          deleteTarget
            ? t('delete.description', { name: deleteTarget.name })
            : ''
        }
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('delete.cancel')}
        variant="danger"
        loading={deleteLoading}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('title')}</h2>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          {t('actions.add')}
        </Button>
      </div>

      {showCreateDialog && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t('create.title')}</h3>

          <div>
            <Label htmlFor="template-key">{t('create.templateKeyLabel')}</Label>
            <Input
              id="template-key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder={t('create.templateKeyPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="template-name">{t('create.nameLabel')}</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={t('create.namePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="template-description">{t('create.descriptionLabel')}</Label>
            <Input
              id="template-description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder={t('create.descriptionPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="product">{t('create.productLabel')}</Label>
            <Select
              id="product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              options={[
                { value: '', label: t('labels.globalProduct') },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder={t('create.productPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="main-purpose">{t('create.mainPurposeLabel')}</Label>
            <Select
              id="main-purpose"
              value={selectedMainPurpose}
              onChange={(e) => setSelectedMainPurpose(e.target.value)}
              options={purposes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={t('create.mainPurposePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="sub-purpose">{t('create.subPurposeLabel')}</Label>
            <Select
              id="sub-purpose"
              value={selectedSubPurpose}
              onChange={(e) => setSelectedSubPurpose(e.target.value)}
              options={[
                { value: '', label: t('create.subPurposeNone') },
                ...purposes.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder={t('create.subPurposePlaceholder')}
            />
          </div>

          <div>
            <Label>{t('create.selectImageLabel')}</Label>
            <MediaPicker
              value={selectedMediaId}
              onSelect={(mediaId) => setSelectedMediaId(mediaId)}
              tenantId={tenantId}
              allowUpload={true}
              allowTemplate={false}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreateTemplate}
              disabled={!selectedMediaId || !selectedMainPurpose || !templateKey || !templateName}
              className="flex-1"
            >
              {t('actions.create')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setSelectedProduct('')
                setSelectedMainPurpose('')
                setSelectedSubPurpose('')
                setSelectedMediaId(null)
                setTemplateKey('')
                setTemplateName('')
                setTemplateDescription('')
              }}
              className="flex-1"
            >
              {t('actions.cancel')}
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">{t('list.title', { count: filteredTemplates.length })}</h3>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label htmlFor="templates-search">{t('list.searchLabel')}</Label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="templates-search"
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder={t('list.searchPlaceholder')}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="templates-product-filter">{t('list.productFilterLabel')}</Label>
            <Select
              id="templates-product-filter"
              value={listProductFilter}
              onChange={(e) => setListProductFilter(e.target.value)}
              options={[
                { value: '', label: t('list.productFilterAll') },
                { value: '__global__', label: t('list.productFilterGlobalOnly') },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
          <div>
            <Label htmlFor="templates-purpose-filter">{t('list.purposeFilterLabel')}</Label>
            <Select
              id="templates-purpose-filter"
              value={listPurposeFilter}
              onChange={(e) => setListPurposeFilter(e.target.value)}
              options={[
                { value: '', label: t('list.purposeFilterAll') },
                ...purposes.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('list.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="p-4 space-y-3">
                {template.media && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                    <Image
                      src={template.media.url}
                      alt={template.media.alt_text || template.media.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {template.main_purpose?.name || t('labels.unknownPurpose')}
                    {template.sub_purpose && ` → ${template.sub_purpose.name}`}
                  </p>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {getProductName(template.product_id)}
                  </p>
                  {template.media && (
                    <p className="text-xs text-muted-foreground truncate">
                      {t('labels.mediaPrefix')} {template.media.name}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {t('labels.keyPrefix')} {template.template_key}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(template.template_key)}
                      className="h-8 px-2"
                      aria-label={t('actions.copyKeyAria')}
                    >
                      <ClipboardIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(template)}
                  className="w-full"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {t('actions.deleteMapping')}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
