'use client'

/**
 * Cookie Form Dialog
 * Add/Edit dialog for cookie catalog entries
 */

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import type { CookieCatalogItem } from './CookieCatalogTab'

// ============================================================================
// Types
// ============================================================================

interface CookieFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  cookie: CookieCatalogItem | null
}

interface FormData {
  key: string
  category: 'necessary' | 'functional' | 'analytics' | 'marketing'
  purpose: string
  provider: string
  ttl_days: number | null
  default_on: boolean
}

const initialFormData: FormData = {
  key: '',
  category: 'necessary',
  purpose: '',
  provider: 'Lekbanken',
  ttl_days: null,
  default_on: false,
}

// ============================================================================
// Component
// ============================================================================

export function CookieFormDialog({ open, onClose, onSave, cookie }: CookieFormDialogProps) {
  const t = useTranslations('admin.cookies.catalog')
  const tc = useTranslations('common.actions')
  
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!cookie

  // Reset form when dialog opens/closes or cookie changes
  useEffect(() => {
    if (open) {
      if (cookie) {
        setFormData({
          key: cookie.key,
          category: cookie.category,
          purpose: cookie.purpose,
          provider: cookie.provider || '',
          ttl_days: cookie.ttl_days,
          default_on: cookie.default_on,
        })
      } else {
        setFormData(initialFormData)
      }
      setError(null)
    }
  }, [open, cookie])

  const handleChange = (field: keyof FormData, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        key: formData.key,
        category: formData.category,
        purpose: formData.purpose,
        provider: formData.provider || null,
        ttl_days: formData.ttl_days,
        default_on: formData.default_on,
        updated_at: new Date().toISOString(),
      }

      if (isEditing) {
        // Update existing (key is the primary key so we can't change it)
        const { error: updateError } = await supabase
          .from('cookie_catalog')
          .update({
            category: payload.category,
            purpose: payload.purpose,
            provider: payload.provider,
            ttl_days: payload.ttl_days,
            default_on: payload.default_on,
            updated_at: payload.updated_at,
          })
          .eq('key', cookie.key)

        if (updateError) throw updateError
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('cookie_catalog')
          .insert(payload)

        if (insertError) throw insertError
      }

      onSave()
    } catch (err) {
      console.error('[CookieFormDialog] Save error:', err)
      setError('Failed to save cookie. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t('editCookie') : t('addCookie')}
            </DialogTitle>
          </DialogHeader>
        
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="cookie-key">{t('fields.name')}</Label>
              <p className="text-sm text-muted-foreground">{t('descriptions.cookieName')}</p>
              <Input
                id="cookie-key"
                value={formData.key}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('key', e.target.value)}
                placeholder="cookie_name"
                required
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookie-provider">{t('fields.provider')}</Label>
              <Input
                id="cookie-provider"
                value={formData.provider}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('provider', e.target.value)}
                placeholder={t('descriptions.providerPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cookie-category">{t('fields.category')}</Label>
                <select
                  id="cookie-category"
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('category', e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="necessary">{t('categories.necessary')}</option>
                  <option value="functional">{t('categories.functional')}</option>
                  <option value="analytics">{t('categories.analytics')}</option>
                  <option value="marketing">{t('categories.marketing')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie-duration">{t('fields.duration')}</Label>
                <p className="text-sm text-muted-foreground">{t('descriptions.duration')}</p>
                <Input
                  id="cookie-duration"
                  type="number"
                  value={formData.ttl_days ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleChange('ttl_days', e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  placeholder="365"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookie-purpose">{t('fields.purpose')}</Label>
              <Textarea
                id="cookie-purpose"
                value={formData.purpose}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('purpose', e.target.value)}
                placeholder={t('fields.purpose')}
                rows={3}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="cookie-default-on">{t('fields.isActive')}</Label>
                <p className="text-sm text-muted-foreground">{t('descriptions.defaultOn')}</p>
              </div>
              <Switch
                id="cookie-default-on"
                checked={formData.default_on}
                onCheckedChange={(checked: boolean) => handleChange('default_on', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
