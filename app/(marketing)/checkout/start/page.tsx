'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'

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

  const [tenantName, setTenantName] = useState('')
  const [quantitySeats, setQuantitySeats] = useState(1)
  const [pricing, setPricing] = useState<PricingApiResponse | null>(null)
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

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
    const options: Array<{ id: string; label: string }> = []
    for (const p of pricing?.products ?? []) {
      for (const pr of p.prices ?? []) {
        const interval = pr.interval_count && pr.interval_count > 1 ? `${pr.interval_count} ${pr.interval}` : pr.interval
        options.push({
          id: pr.id,
          label: `${p.name} – ${pr.amount} ${pr.currency} / ${interval}`,
        })
      }
    }
    return options
  }, [pricing])

  async function handleStart() {
    setError('')
    if (!selectedPriceId) {
      setError(t('start.errors.pickProduct'))
      return
    }
    if (!tenantName.trim()) {
      setError(t('start.errors.enterOrgName'))
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPriceId: selectedPriceId,
          tenantName: tenantName.trim(),
          quantitySeats,
        }),
      })

      if (res.status === 401) {
        const redirect = encodeURIComponent('/checkout/start')
        router.push(`/auth/login?redirect=${redirect}`)
        return
      }

      const json = (await res.json()) as { checkout_url?: string; purchase_intent_id?: string; error?: string }
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

      <Card>
        <CardHeader>
          <CardTitle>{t('start.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('start.fields.plan.label')}</label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={selectedPriceId}
              onChange={(e) => setSelectedPriceId(e.target.value)}
              disabled={priceOptions.length === 0}
            >
              {priceOptions.length === 0 ? (
                <option value="">{t('start.fields.plan.loading')}</option>
              ) : (
                priceOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              )}
            </select>
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
