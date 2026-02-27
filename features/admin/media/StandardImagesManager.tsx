'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { MediaPicker } from '@/components/ui/media-picker'
import { ClipboardIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/utils/logger'
import { generateTemplateKey, MAX_TEMPLATES_PER_COMBO, canCreateTemplate } from '@/lib/media/templateKey'

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
  parent_id: string | null
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

  // Create form state - guided workflow
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedMainPurpose, setSelectedMainPurpose] = useState<string>('')
  // G2: Sub-purpose removed from create flow (kept for read-only display of existing)
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const [templateKey, setTemplateKey] = useState<string>('')
  // G3: Name is auto-generated and read-only
  const [templateName, setTemplateName] = useState<string>('')
  const [templateDescription, setTemplateDescription] = useState<string>('')
  const [showAdvancedKey, setShowAdvancedKey] = useState(false)

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

  // Compute templates for current product + main purpose combo
  const comboTemplates = useMemo(() => {
    if (!selectedMainPurpose) return []
    return templates.filter(t => {
      const matchesProduct = selectedProduct 
        ? t.product_id === selectedProduct 
        : t.product_id === null
      const matchesPurpose = t.main_purpose_id === selectedMainPurpose
      return matchesProduct && matchesPurpose
    })
  }, [templates, selectedProduct, selectedMainPurpose])

  // Auto-generate template key when product + purpose changes
  useEffect(() => {
    if (!selectedMainPurpose || showAdvancedKey) return

    const product = products.find(p => p.id === selectedProduct)
    const purpose = purposes.find(p => p.id === selectedMainPurpose)
    
    if (!purpose) return

    const result = generateTemplateKey({
      productId: selectedProduct || null,
      productName: product ? product.name : null,
      purposeId: selectedMainPurpose,
      purposeName: purpose.name,
      existingTemplateKeys: templates.map(t => t.template_key)
    })

    setTemplateKey(result.templateKey)
    setTemplateName(result.suggestedName)
  }, [selectedProduct, selectedMainPurpose, products, purposes, templates, showAdvancedKey])

  // Check if we can still create templates for this combo
  const canCreate = useMemo(() => {
    if (!selectedMainPurpose) return true
    const _product = products.find(p => p.id === selectedProduct)
    const purpose = purposes.find(p => p.id === selectedMainPurpose)
    if (!purpose) return true
    
    return canCreateTemplate(comboTemplates.length)
  }, [comboTemplates.length, products, purposes, selectedMainPurpose, selectedProduct])

  const handleCreateTemplate = async () => {
    if (!selectedMediaId || !selectedMainPurpose || !templateKey || !templateName) return

    try {
      const response = await fetch('/api/media/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct || null,
          mainPurposeId: selectedMainPurpose,
          // G2: Sub-purpose removed from create flow
          subPurposeId: null,
          mediaId: selectedMediaId,
          templateKey,
          name: templateName,
          description: templateDescription || null,
          priority: 0,
          isDefault: false,
        }),
      })

      // G5: Handle 409 conflict errors from API
      // Contract: API returns { error: 'TEMPLATE_SLOT_LIMIT' | 'TEMPLATE_KEY_EXISTS', message: string }
      // Fallback: If error field missing, use message heuristics or generic conflict toast
      if (response.status === 409) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'TEMPLATE_SLOT_LIMIT') {
          toast.error(t('toast.slotLimitReached'))
        } else if (errorData.error === 'TEMPLATE_KEY_EXISTS') {
          toast.error(t('toast.duplicateKey'))
        } else if (typeof errorData.message === 'string') {
          // Graceful fallback: use message heuristics if error field missing
          if (errorData.message.toLowerCase().includes('limit') || errorData.message.includes('5')) {
            toast.error(t('toast.slotLimitReached'))
          } else if (errorData.message.toLowerCase().includes('exists') || errorData.message.toLowerCase().includes('duplicate')) {
            toast.error(t('toast.duplicateKey'))
          } else {
            toast.error(t('toast.conflict'))
          }
        } else {
          toast.error(t('toast.conflict'))
        }
        return
      }

      if (!response.ok) throw new Error('Failed to create template')

      await loadTemplates()
      toast.success(t('toast.saved'))
      setShowCreateDialog(false)
      setSelectedProduct('')
      setSelectedMainPurpose('')
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

  // Coverage matrix: Product × Purpose with template count
  const coverageMatrix = useMemo(() => {
    // Build a map of (productId|'global', purposeId) -> count
    const countMap = new Map<string, number>()
    
    for (const t of templates) {
      const productKey = t.product_id || '__global__'
      const key = `${productKey}:${t.main_purpose_id}`
      countMap.set(key, (countMap.get(key) || 0) + 1)
    }
    
    // Build matrix rows: one per MAIN purpose only (no parent_id)
    const mainPurposes = purposes.filter((p) => p.parent_id === null)
    
    return mainPurposes.map((purpose) => {
      const cells: { productId: string | null; productName: string; count: number }[] = [
        // Global column first
        {
          productId: null,
          productName: 'Global',
          count: countMap.get(`__global__:${purpose.id}`) || 0,
        },
        // Then each product
        ...products.map((product) => ({
          productId: product.id,
          productName: product.name,
          count: countMap.get(`${product.id}:${purpose.id}`) || 0,
        })),
      ]
      
      return {
        purposeId: purpose.id,
        purposeName: purpose.name,
        cells,
        totalCount: cells.reduce((sum, c) => sum + c.count, 0),
      }
    })
  }, [templates, products, purposes])

  // Filter to only main purposes (no parent_id) for dropdowns
  const mainPurposes = useMemo(() => purposes.filter((p) => p.parent_id === null), [purposes])
  // Sub purposes for delsyfte dropdown (kept for display of existing templates)
  const _subPurposes = useMemo(() => purposes.filter((p) => p.parent_id !== null), [purposes])

  // G1: Coverage matrix visible by default
  const [showCoverageMatrix, setShowCoverageMatrix] = useState(true)

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
          {/* G4: Automation hint */}
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            {t('automation.hint')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCoverageMatrix(!showCoverageMatrix)}>
            {showCoverageMatrix ? t('actions.hideCoverage') : t('actions.showCoverage')}
          </Button>
          <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            {t('actions.add')}
          </Button>
        </div>
      </div>

      {/* Coverage Matrix */}
      {showCoverageMatrix && (
        <Card className="p-4 space-y-3">
          <h3 className="text-lg font-semibold">{t('coverage.title', { defaultValue: 'Täckningsmatris' })}</h3>
          <p className="text-sm text-muted-foreground">
            {t('coverage.description', { defaultValue: 'Visar antal standardbilder per kombination av produkt och huvudsyfte.' })}
          </p>
          
          {purposes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t('coverage.noPurposes', { defaultValue: 'Inga syften hittades.' })}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">{t('coverage.purpose', { defaultValue: 'Syfte' })}</th>
                    <th className="text-center p-2 font-medium min-w-[80px]">{t('coverage.global', { defaultValue: 'Global' })}</th>
                    {products.map((p) => (
                      <th key={p.id} className="text-center p-2 font-medium min-w-[80px]" title={p.name}>
                        {p.name.length > 12 ? `${p.name.slice(0, 12)}...` : p.name}
                      </th>
                    ))}
                    <th className="text-center p-2 font-medium min-w-[60px]">{t('coverage.total', { defaultValue: 'Totalt' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageMatrix.map((row) => (
                    <tr key={row.purposeId} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{row.purposeName}</td>
                      {row.cells.map((cell, idx) => (
                        <td 
                          key={idx} 
                          className={`p-2 text-center ${cell.count === 0 ? 'text-destructive bg-destructive/10' : 'text-green-700 bg-green-50'}`}
                        >
                          {cell.count === 0 ? '–' : cell.count}
                        </td>
                      ))}
                      <td className="p-2 text-center font-medium">{row.totalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Summary */}
          <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-50 border border-green-200 rounded" />
              {t('coverage.hasCoverage', { defaultValue: 'Har standardbilder' })}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-destructive/10 border border-destructive/30 rounded" />
              {t('coverage.missingCoverage', { defaultValue: 'Saknar standardbilder' })}
            </span>
          </div>
        </Card>
      )}

      {showCreateDialog && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t('create.title')}</h3>

          {/* Step 1: Product selection */}
          <div>
            <Label htmlFor="product">{t('create.productLabel')}</Label>
            <Select
              id="product"
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value)
                setShowAdvancedKey(false)
              }}
              options={[
                { value: '', label: t('labels.globalProduct') },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder={t('create.productPlaceholder')}
            />
          </div>

          {/* Step 2: Main purpose selection */}
          <div>
            <Label htmlFor="main-purpose">{t('create.mainPurposeLabel')}</Label>
            <Select
              id="main-purpose"
              value={selectedMainPurpose}
              onChange={(e) => {
                setSelectedMainPurpose(e.target.value)
                setShowAdvancedKey(false)
              }}
              options={mainPurposes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder={t('create.mainPurposePlaceholder')}
            />
          </div>

          {/* Step 3: Show existing templates for this combo + slot counter */}
          {selectedMainPurpose && (
            <div className="rounded-md border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">
                  {t('create.existingTemplatesTitle')}
                </h4>
                <Badge variant={comboTemplates.length >= MAX_TEMPLATES_PER_COMBO ? 'destructive' : 'secondary'}>
                  {comboTemplates.length} / {MAX_TEMPLATES_PER_COMBO} {t('create.slotsUsed')}
                </Badge>
              </div>
              
              {comboTemplates.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {comboTemplates.map((tpl) => (
                    <div key={tpl.id} className="relative group">
                      {tpl.media?.url ? (
                        <Image
                          src={tpl.media.url}
                          alt={tpl.name}
                          width={64}
                          height={64}
                          className="rounded border object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white text-center p-1 rounded">
                        {tpl.template_key}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('create.noExistingTemplates')}
                </p>
              )}

              {!canCreate && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    <span>{t('create.slotsFull')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">
                    {t('create.slotsFullHint')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Image selection */}
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

          {/* Auto-generated template key (with advanced toggle) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="template-key">{t('create.templateKeyLabel')}</Label>
              <button
                type="button"
                onClick={() => setShowAdvancedKey(!showAdvancedKey)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronDownIcon className={`h-3 w-3 transition-transform ${showAdvancedKey ? 'rotate-180' : ''}`} />
                {showAdvancedKey ? t('create.hideAdvanced') : t('create.showAdvanced')}
              </button>
            </div>
            <Input
              id="template-key"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder={t('create.templateKeyPlaceholder')}
              disabled={!showAdvancedKey}
              className={!showAdvancedKey ? 'bg-muted' : ''}
            />
            {!showAdvancedKey && templateKey && (
              <p className="text-xs text-muted-foreground">
                {t('create.templateKeyAutoGenerated')}
              </p>
            )}
          </div>

          {/* Template name */}
          <div>
            <Label htmlFor="template-name">{t('create.nameLabel')}</Label>
            <Input
              id="template-name"
              value={templateName}
              disabled
              className="bg-muted"
              placeholder={t('create.namePlaceholder')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('create.nameAutoGenerated')}
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="template-description">{t('create.descriptionLabel')}</Label>
            <Input
              id="template-description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder={t('create.descriptionPlaceholder')}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleCreateTemplate}
              disabled={!selectedMediaId || !selectedMainPurpose || !templateKey || !templateName || !canCreate}
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
                setSelectedMediaId(null)
                setTemplateKey('')
                setTemplateName('')
                setTemplateDescription('')
                setShowAdvancedKey(false)
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
                ...mainPurposes.map((p) => ({ value: p.id, label: p.name })),
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
