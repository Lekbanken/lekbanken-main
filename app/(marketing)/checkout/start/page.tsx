'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { DemoConversionModal } from '@/components/demo/DemoConversionModal'
import { UserIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'

type PricingApiResponse = {
  currency: string
  products: Array<{
    id: string
    name: string
    description: string | null
    prices: Array<{
      id: string
      amount: number
      currency: string
      interval: string
      interval_count: number | null
      is_default: boolean
      lookup_key: string | null
      nickname: string | null
    }>
  }>
}

export default function CheckoutStartPage() {
  const t = useTranslations('marketing.checkout')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Purchase type: personal (B2C) or organization (B2B)
  const [purchaseType, setPurchaseType] = useState<'personal' | 'organization'>('personal')
  const [tenantName, setTenantName] = useState('')
  const [quantitySeats, setQuantitySeats] = useState(1)
  const [pricing, setPricing] = useState<PricingApiResponse | null>(null)
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Demo conversion modal
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [currentProductName, setCurrentProductName] = useState<string>('')
  
  // Already owned state
  const [alreadyOwned, setAlreadyOwned] = useState(false)

  const canceled = searchParams.get('canceled') === '1'

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await fetch('/api/public/pricing?currency=SEK', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load pricing')
        const json = (await res.json()) as PricingApiResponse
        if (ignore) return
        setPricing(json)

        const firstDefault = json.products
          .flatMap((p) => p.prices.map((pr) => ({ pr, product: p })))
          .find((x) => x.pr.is_default)?.pr

        const firstAny = json.products[0]?.prices[0]
        setSelectedPriceId(firstDefault?.id ?? firstAny?.id ?? '')
      } catch (e) {
        if (ignore) return
        setError(e instanceof Error ? e.message : 'Failed to load pricing')
      }
    }
    void load()
    return () => {
      ignore = true
    }
  }, [])

  const priceOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; productName: string }> = []
    for (const p of pricing?.products ?? []) {
      for (const pr of p.prices ?? []) {
        const interval = pr.interval_count && pr.interval_count > 1 ? `${pr.interval_count} ${pr.interval}` : pr.interval
        options.push({
          id: pr.id,
          label: `${p.name} – ${pr.amount} ${pr.currency} / ${interval}`,
          productName: p.name,
        })
      }
    }
    return options
  }, [pricing])

  async function handleStart() {
    setError('')
    setAlreadyOwned(false)
    
    if (!selectedPriceId) {
      setError(t('start.errors.pickProduct'))
      return
    }
    
    // Only require org name for organization purchases
    if (purchaseType === 'organization' && !tenantName.trim()) {
      setError(t('start.errors.enterOrgName'))
      return
    }
    
    // Get product name for modal
    const selectedOption = priceOptions.find(opt => opt.id === selectedPriceId)
    setCurrentProductName(selectedOption?.productName || '')

    setIsLoading(true)
    try {
      const res = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPriceId: selectedPriceId,
          kind: purchaseType === 'personal' ? 'user_subscription' : 'organisation_subscription',
          tenantName: purchaseType === 'organization' ? tenantName.trim() : undefined,
          quantitySeats: purchaseType === 'organization' ? quantitySeats : undefined,
        }),
      })

      if (res.status === 401) {
        const redirect = encodeURIComponent('/checkout/start')
        router.push(`/auth/login?redirect=${redirect}`)
        return
      }

      const json = (await res.json()) as { 
        checkout_url?: string
        purchase_intent_id?: string
        error?: string
        code?: string
      }
      
      // Handle demo user blocked
      if (json.code === 'DEMO_USER_BLOCKED') {
        setShowDemoModal(true)
        return
      }
      
      // Handle already owned
      if (json.code === 'ALREADY_OWNED') {
        setAlreadyOwned(true)
        return
      }
      
      if (!res.ok) {
        throw new Error(json.error || t('start.errors.startCheckoutFailed'))
      }

      if (json.checkout_url) {
        window.location.href = json.checkout_url
        return
      }

      if (json.purchase_intent_id) {
        router.push(`/checkout/return?purchase_intent_id=${encodeURIComponent(json.purchase_intent_id)}`)
        return
      }

      throw new Error(t('start.errors.missingCheckoutUrl'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('start.errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{t('start.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('start.subtitle')}
        </p>
      </div>

      {canceled && (
        <Alert variant="warning">
          {t('start.canceled')}
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      
      {alreadyOwned && (
        <Alert variant="info">
          <div className="space-y-2">
            <p className="font-medium">{t('start.alreadyOwned.title')}</p>
            <p className="text-sm">{t('start.alreadyOwned.description')}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/app/settings')}
            >
              {t('start.alreadyOwned.manageSubscription')}
            </Button>
          </div>
        </Alert>
      )}

      {/* Demo Conversion Modal */}
      <DemoConversionModal
        open={showDemoModal}
        onClose={() => setShowDemoModal(false)}
        productName={currentProductName}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('start.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Purchase Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('start.fields.purchaseType.label')}</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={purchaseType === 'personal' ? 'default' : 'outline'}
                className="flex items-center justify-center gap-2"
                onClick={() => setPurchaseType('personal')}
              >
                <UserIcon className="h-4 w-4" />
                {t('start.fields.purchaseType.personal')}
              </Button>
              <Button
                type="button"
                variant={purchaseType === 'organization' ? 'default' : 'outline'}
                className="flex items-center justify-center gap-2"
                onClick={() => setPurchaseType('organization')}
              >
                <BuildingOffice2Icon className="h-4 w-4" />
                {t('start.fields.purchaseType.organization')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {purchaseType === 'personal' 
                ? t('start.fields.purchaseType.personalHint')
                : t('start.fields.purchaseType.organizationHint')
              }
            </p>
          </div>

          {/* Organization fields - only show for org purchases */}
          {purchaseType === 'organization' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('start.fields.orgName.label')}</label>
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder={t('start.fields.orgName.placeholder')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('start.fields.seats.label')}</label>
                <Input
                  type="number"
                  min={1}
                  value={quantitySeats}
                  onChange={(e) => setQuantitySeats(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Select
              label={t('start.fields.plan.label')}
              value={selectedPriceId}
              onChange={(e) => setSelectedPriceId(e.target.value)}
              disabled={priceOptions.length === 0}
              options={
                priceOptions.length === 0
                  ? [{ value: '', label: t('start.fields.plan.loading') }]
                  : priceOptions.map((opt) => ({ value: opt.id, label: opt.label }))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('start.noAccount')}{' '}
              <Link href="/auth/signup" className="text-primary hover:text-primary/80">
                {t('start.actions.createAccount')}
              </Link>
              .
            </p>
          </div>

          <Button className="w-full" onClick={handleStart} disabled={isLoading}>
            {isLoading ? t('start.actions.starting') : t('start.actions.goToPayment')}
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <Link href="/pricing" className="text-primary hover:text-primary/80">
          {t('start.actions.backToPricing')}
        </Link>
      </div>
    </div>
  )
}
