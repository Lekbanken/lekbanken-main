'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard'
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminEmptyState,
} from '@/components/admin/shared'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import {
  TicketIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface PromoCode {
  id: string
  code: string
  active: boolean
  couponId: string
  percentOff: number | null
  amountOff: number | null
  currency: string | null
  maxRedemptions: number | null
  timesRedeemed: number
  expiresAt: string | null
  createdAt: string
  firstTimeTransaction: boolean
  minimumAmount: number | null
}

interface CreatePromoFormData {
  code: string
  percentOff: string
  amountOff: string
  maxRedemptions: string
  expiresAt: string
  firstTimeTransaction: boolean
}

export default function PromoCodesPage() {
  const t = useTranslations('admin.billing.promoCodes')
  
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<CreatePromoFormData>({
    code: '',
    percentOff: '',
    amountOff: '',
    maxRedemptions: '',
    expiresAt: '',
    firstTimeTransaction: true,
  })

  const fetchPromoCodes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/billing/promo-codes')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch promo codes')
      }
      
      setPromoCodes(data.promoCodes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch promo codes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromoCodes()
  }, [fetchPromoCodes])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        code: formData.code.toUpperCase(),
        firstTimeTransaction: formData.firstTimeTransaction,
      }

      if (formData.percentOff) {
        payload.percentOff = parseFloat(formData.percentOff)
      } else if (formData.amountOff) {
        payload.amountOff = parseFloat(formData.amountOff)
      }

      if (formData.maxRedemptions) {
        payload.maxRedemptions = parseInt(formData.maxRedemptions)
      }

      if (formData.expiresAt) {
        payload.expiresAt = new Date(formData.expiresAt).toISOString()
      }

      const response = await fetch('/api/billing/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create promo code')
      }

      setShowCreateForm(false)
      setFormData({
        code: '',
        percentOff: '',
        amountOff: '',
        maxRedemptions: '',
        expiresAt: '',
        firstTimeTransaction: true,
      })
      fetchPromoCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promo code')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeactivate = async (promoCodeId: string) => {
    if (!confirm(t('confirmDeactivate'))) return

    try {
      const response = await fetch(`/api/billing/promo-codes?id=${promoCodeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to deactivate promo code')
      }

      fetchPromoCodes()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate promo code')
    }
  }

  return (
    <SystemAdminClientGuard>
      <AdminPageLayout>
        <AdminPageHeader
          title={t('title')}
          description={t('description')}
          icon={<TicketIcon className="h-8 w-8 text-primary" />}
          actions={
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('createNew')}
            </Button>
          }
        />

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('createTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.code')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="SUMMER2026"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.percentOff')}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="20"
                      min="1"
                      max="100"
                      value={formData.percentOff}
                      onChange={(e) => setFormData({ ...formData, percentOff: e.target.value, amountOff: '' })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.amountOff')}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="50"
                      min="1"
                      value={formData.amountOff}
                      onChange={(e) => setFormData({ ...formData, amountOff: e.target.value, percentOff: '' })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.maxRedemptions')}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="100"
                      min="1"
                      value={formData.maxRedemptions}
                      onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.expiresAt')}</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="firstTimeTransaction"
                      checked={formData.firstTimeTransaction}
                      onChange={(e) => setFormData({ ...formData, firstTimeTransaction: e.target.checked })}
                    />
                    <label htmlFor="firstTimeTransaction" className="text-sm">
                      {t('form.firstTimeOnly')}
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? t('creating') : t('create')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)} type="button">
                    {t('cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('loading')}
          </div>
        ) : promoCodes.length === 0 ? (
          <AdminEmptyState
            icon={<TicketIcon className="h-6 w-6" />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        ) : (
          <div className="space-y-4">
            {promoCodes.map((promo) => (
              <Card key={promo.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-lg font-bold">{promo.code}</div>
                      {promo.active ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircleIcon className="h-3 w-3" />
                          {t('active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircleIcon className="h-3 w-3" />
                          {t('inactive')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {promo.percentOff 
                          ? `${promo.percentOff}% ${t('off')}`
                          : promo.amountOff 
                            ? `${promo.amountOff} ${promo.currency?.toUpperCase()} ${t('off')}`
                            : ''
                        }
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{promo.timesRedeemed}</span>
                        {promo.maxRedemptions && (
                          <span className="text-muted-foreground"> / {promo.maxRedemptions}</span>
                        )}
                        <span className="text-muted-foreground ml-1">{t('redeemed')}</span>
                      </div>
                      {promo.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(promo.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {promo.expiresAt && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {t('expiresAt')}: {new Date(promo.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AdminPageLayout>
    </SystemAdminClientGuard>
  )
}
