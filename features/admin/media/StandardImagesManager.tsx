'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { MediaPicker } from '@/components/ui/media-picker'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

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
  const [templates, setTemplates] = useState<MediaTemplate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purposes, setPurposes] = useState<Purpose[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to load products')

      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }, [])

  const loadPurposes = useCallback(async () => {
    try {
      const response = await fetch('/api/purposes')
      if (!response.ok) throw new Error('Failed to load purposes')

      const data = await response.json()
      setPurposes(data.purposes || [])
    } catch (error) {
      console.error('Failed to load purposes:', error)
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
      setShowCreateDialog(false)
      setSelectedProduct('')
      setSelectedMainPurpose('')
      setSelectedSubPurpose('')
      setSelectedMediaId(null)
      setTemplateKey('')
      setTemplateName('')
      setTemplateDescription('')
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this standard image mapping?')) return

    try {
      const response = await fetch(`/api/media/templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete template')

      await loadTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    }
  }

  const getProductName = (productId: string | null) => {
    if (!productId) return 'Global (All Products)'
    return products.find((p) => p.id === productId)?.name || 'Unknown Product'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Standard Images</h2>
          <p className="text-sm text-muted-foreground">
            Define default images for specific product+purpose combinations
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Standard Image
        </Button>
      </div>

      {showCreateDialog && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create Standard Image Mapping</h3>

          <div>
            <Label htmlFor="template-key">Template Key * (e.g., game_bg_product_winter)</Label>
            <input
              id="template-key"
              type="text"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
              placeholder="unique_template_key"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <input
              id="template-name"
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Descriptive name"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <Label htmlFor="template-description">Description (optional)</Label>
            <input
              id="template-description"
              type="text"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Template description"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <Label htmlFor="product">Product (optional)</Label>
            <Select
              id="product"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              options={[
                { value: '', label: 'Global (All Products)' },
                ...products.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder="Global (All Products)"
            />
          </div>

          <div>
            <Label htmlFor="main-purpose">Main Purpose *</Label>
            <Select
              id="main-purpose"
              value={selectedMainPurpose}
              onChange={(e) => setSelectedMainPurpose(e.target.value)}
              options={purposes.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select main purpose"
            />
          </div>

          <div>
            <Label htmlFor="sub-purpose">Sub-Purpose (optional)</Label>
            <Select
              id="sub-purpose"
              value={selectedSubPurpose}
              onChange={(e) => setSelectedSubPurpose(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...purposes.map((p) => ({ value: p.id, label: p.name })),
              ]}
              placeholder="Select sub-purpose"
            />
          </div>

          <div>
            <Label>Select Image *</Label>
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
              Create Mapping
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
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Current Standard Images ({templates.length})
        </h3>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No standard images configured yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
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
                    {template.main_purpose?.name || 'Unknown purpose'}
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
                      Media: {template.media.name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Key: {template.template_key}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="w-full"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Mapping
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
