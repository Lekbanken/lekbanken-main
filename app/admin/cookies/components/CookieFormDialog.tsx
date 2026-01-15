'use client'

/**
 * Cookie Form Dialog
 * Add/Edit dialog for cookie catalog entries
 */

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/catalyst-ui-kit/typescript/dialog'
import { Field, Label, Description } from '@/catalyst-ui-kit/typescript/fieldset'
import { Input } from '@/catalyst-ui-kit/typescript/input'
import { Select } from '@/catalyst-ui-kit/typescript/select'
import { Textarea } from '@/catalyst-ui-kit/typescript/textarea'
import { Switch, SwitchField } from '@/catalyst-ui-kit/typescript/switch'
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
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing ? t('editCookie') : t('addCookie')}
        </DialogTitle>
        
        <DialogBody className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          <Field>
            <Label>{t('fields.name')}</Label>
            <Description>{t('descriptions.cookieName')}</Description>
            <Input
              value={formData.key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('key', e.target.value)}
              placeholder="cookie_name"
              required
              disabled={isEditing} // Can't change the key (primary key)
            />
          </Field>

          <Field>
            <Label>{t('fields.provider')}</Label>
            <Input
              value={formData.provider}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('provider', e.target.value)}
              placeholder={t('descriptions.providerPlaceholder')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Label>{t('fields.category')}</Label>
              <Select
                value={formData.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('category', e.target.value)}
              >
                <option value="necessary">{t('categories.necessary')}</option>
                <option value="functional">{t('categories.functional')}</option>
                <option value="analytics">{t('categories.analytics')}</option>
                <option value="marketing">{t('categories.marketing')}</option>
              </Select>
            </Field>

            <Field>
              <Label>{t('fields.duration')}</Label>
              <Description>{t('descriptions.duration')}</Description>
              <Input
                type="number"
                value={formData.ttl_days ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleChange('ttl_days', e.target.value ? parseInt(e.target.value, 10) : null)
                }
                placeholder="365"
                min={0}
              />
            </Field>
          </div>

          <Field>
            <Label>{t('fields.purpose')}</Label>
            <Textarea
              value={formData.purpose}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('purpose', e.target.value)}
              placeholder={t('fields.purpose')}
              rows={3}
              required
            />
          </Field>

          <SwitchField>
            <Label>{t('fields.isActive')}</Label>
            <Description>{t('descriptions.defaultOn')}</Description>
            <Switch
              checked={formData.default_on}
              onChange={(checked: boolean) => handleChange('default_on', checked)}
            />
          </SwitchField>
        </DialogBody>

        <DialogActions>
          <Button type="button" variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? tc('saving') : tc('save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
