'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Select } from '@/components/ui/select'
import { DemoConversionModal } from '@/components/demo/DemoConversionModal'
import {
  UserIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

type PricingApiResponse = {
  currency: string
  products: Array<{
    id: string
    name: string
    description: string | null
    product_key: string
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCheckoutPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

function intervalLabel(interval: string | null, count: number | null): string {
  if (!interval) return ''
  if (count && count > 1) return `${count} ${interval}`
  return interval === 'year' ? 'år' : interval === 'month' ? 'mån' : interval
}

// Key for persisting form state across auth redirects (F3)
const CHECKOUT_STATE_KEY = 'checkout_form_state'

type CheckoutFormState = {
  purchaseType: 'personal' | 'organization'
  tenantName: string
  quantitySeats: number
  selectedPriceId: string
  productLocked: boolean
  savedAt: number // epoch ms — ignore if older than TTL
  selectedTenantId: string // existing org id or '' for new
  orgMode: 'new' | 'existing' // whether creating new or adding to existing
}

type UserOrg = { id: string; name: string; role: string }

/** Ignore saved checkout state older than 30 minutes */
const CHECKOUT_STATE_TTL_MS = 30 * 60 * 1000

export default function CheckoutStartPage() {
  const t = useTranslations('marketing.checkout')
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL params for product pre-selection
  const urlProductId = searchParams.get('product')
  const urlPriceId = searchParams.get('price')

  // Purchase type: personal (B2C) or organization (B2B)
  const [purchaseType, setPurchaseType] = useState<'personal' | 'organization'>('personal')
  const [tenantName, setTenantName] = useState('')
  const [quantitySeats, setQuantitySeats] = useState(1)
  const [pricing, setPricing] = useState<PricingApiResponse | null>(null)
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  // Ref to communicate restored priceId to the pricing fetch (avoids stale closure)
  const restoredPriceIdRef = useRef<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Demo conversion modal
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [currentProductName, setCurrentProductName] = useState<string>('')
  
  // Already owned state
  const [alreadyOwned, setAlreadyOwned] = useState(false)

  // F5: Existing org selection
  const [userOrgs, setUserOrgs] = useState<UserOrg[]>([])
  const [orgMode, setOrgMode] = useState<'new' | 'existing'>('new')
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  const canceled = searchParams.get('canceled') === '1'

  // Track whether the product was pre-selected via URL (locks dropdown)
  const [productLocked, setProductLocked] = useState(false)

  // -----------------------------------------------------------------------
  // Restore form state saved before auth redirect (F3)
  // -----------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_STATE_KEY)
      if (!raw) return
      sessionStorage.removeItem(CHECKOUT_STATE_KEY)
      const saved = JSON.parse(raw) as CheckoutFormState

      // TTL guard: ignore state older than 30 min (GPT risk #4)
      if (saved.savedAt && Date.now() - saved.savedAt > CHECKOUT_STATE_TTL_MS) return

      if (saved.purchaseType) setPurchaseType(saved.purchaseType)
      if (saved.tenantName) setTenantName(saved.tenantName)
      if (saved.quantitySeats > 1) setQuantitySeats(saved.quantitySeats)
      if (saved.selectedPriceId) {
        setSelectedPriceId(saved.selectedPriceId)
        restoredPriceIdRef.current = saved.selectedPriceId
      }
      if (saved.productLocked) setProductLocked(true)
      if (saved.selectedTenantId) setSelectedTenantId(saved.selectedTenantId)
      if (saved.orgMode) setOrgMode(saved.orgMode)
    } catch {
      // ignore corrupt storage
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await fetch('/api/public/pricing?currency=SEK', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to load pricing')
        const json = (await res.json()) as PricingApiResponse
        if (ignore) return
        setPricing(json)

        // Try to match URL product param → pre-select
        if (urlProductId) {
          const targetProduct = json.products.find((p) => p.id === urlProductId || p.product_key === urlProductId)
          if (targetProduct && targetProduct.prices.length > 0) {
            // Priority: explicit price param → yearly default → any default → first price
            let bestPrice = urlPriceId
              ? targetProduct.prices.find((pr) => pr.id === urlPriceId)
              : undefined
            if (!bestPrice) {
              bestPrice = targetProduct.prices.find((pr) => pr.is_default && pr.interval === 'year')
                ?? targetProduct.prices.find((pr) => pr.interval === 'year')
                ?? targetProduct.prices.find((pr) => pr.is_default)
                ?? targetProduct.prices[0]
            }
            setSelectedPriceId(bestPrice.id)
            setProductLocked(true)
            return
          }
        }

        // Fallback: select first default globally — but only if nothing
        // was already restored from sessionStorage (GPT risk #2)
        const allPriceIds = json.products.flatMap((p) => p.prices.map((pr) => pr.id))
        const restored = restoredPriceIdRef.current
        if (restored && allPriceIds.includes(restored)) {
          // sessionStorage value is still valid → keep it
          return
        }

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
  }, [urlProductId, urlPriceId])

  // F5: Fetch user’s existing orgs (admin/owner only)
  useEffect(() => {
    let ignore = false
    async function loadOrgs() {
      try {
        const res = await fetch('/api/checkout/my-orgs', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { orgs: UserOrg[] }
        if (ignore) return
        const orgs = json.orgs ?? []
        setUserOrgs(orgs)

        // QA #4: If restored orgMode is 'existing' but no orgs exist, fallback
        if (orgs.length === 0 && orgMode === 'existing') {
          setOrgMode('new')
          setSelectedTenantId('')
          return
        }

        // P2: Auto-select ONLY when exactly 1 org (and nothing already restored)
        if (orgs.length === 1 && !selectedTenantId) {
          setOrgMode('existing')
          setSelectedTenantId(orgs[0].id)
        }
        // Multi-org: do NOT auto-select — require active choice to prevent
        // accidental purchase on wrong tenant (GPT risk #1)
      } catch {
        // non-critical — user just won't see existing orgs
      }
    }
    void loadOrgs()
    return () => { ignore = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const priceOptions = useMemo(() => {
    const options: Array<{ id: string; label: string; productName: string }> = []
    for (const p of pricing?.products ?? []) {
      for (const pr of p.prices ?? []) {
        options.push({
          id: pr.id,
          label: `${p.name} – ${formatCheckoutPrice(pr.amount, pr.currency)} / ${intervalLabel(pr.interval, pr.interval_count)}`,
          productName: p.name,
        })
      }
    }
    return options
  }, [pricing])

  // Resolved selected product + price (for summary & total)
  const selectedProduct = useMemo(() => {
    if (!pricing || !selectedPriceId) return null
    for (const p of pricing.products) {
      const pr = p.prices.find((x) => x.id === selectedPriceId)
      if (pr) return { product: p, price: pr }
    }
    return null
  }, [pricing, selectedPriceId])

  const effectiveQuantity = purchaseType === 'organization' ? quantitySeats : 1
  const totalAmount = selectedProduct
    ? selectedProduct.price.amount * effectiveQuantity
    : null

  async function handleStart() {
    setError('')
    setAlreadyOwned(false)
    
    if (!selectedPriceId) {
      setError(t('start.errors.pickProduct'))
      return
    }

    // Multi-org: require explicit dropdown choice before submitting
    if (purchaseType === 'organization' && userOrgs.length > 1 && !selectedTenantId) {
      setError(t('start.errors.pickOrg'))
      return
    }
    
    // Only require org name for NEW organization purchases
    if (purchaseType === 'organization' && orgMode === 'new' && !tenantName.trim()) {
      setError(t('start.errors.enterOrgName'))
      return
    }

    // Require org selection for existing org purchases
    if (purchaseType === 'organization' && orgMode === 'existing' && !selectedTenantId) {
      setError(t('start.errors.pickOrg'))
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
          tenantId: purchaseType === 'organization' && orgMode === 'existing' ? selectedTenantId : undefined,
          tenantName: purchaseType === 'organization' && orgMode === 'new' ? tenantName.trim() : undefined,
          quantitySeats: purchaseType === 'organization' ? quantitySeats : undefined,
        }),
      })

      if (res.status === 401) {
        // F3: Persist form state so it survives the auth bounce
        try {
          const state: CheckoutFormState = {
            purchaseType,
            tenantName,
            quantitySeats,
            selectedPriceId,
            productLocked,
            savedAt: Date.now(),
            // Never persist the synthetic '__new__' value as a tenantId
            selectedTenantId: selectedTenantId === '__new__' ? '' : selectedTenantId,
            orgMode,
          }
          sessionStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(state))
        } catch {
          // sessionStorage unavailable – best-effort
        }

        // Build redirect URL preserving product context
        const returnUrl = new URL('/checkout/start', window.location.origin)
        if (selectedProduct) {
          returnUrl.searchParams.set('product', selectedProduct.product.id)
          returnUrl.searchParams.set('price', selectedProduct.price.id)
        }
        const redirect = encodeURIComponent(returnUrl.pathname + returnUrl.search)
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
              {/* P1: Merged org selector — single dropdown with "Create new" option */}
              {userOrgs.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    label={t('start.fields.existingOrg.label')}
                    placeholder={t('start.fields.existingOrg.label')}
                    value={selectedTenantId}
                    onChange={(e) => {
                      const val = e.target.value
                      if (val === '__new__') {
                        setOrgMode('new')
                        setSelectedTenantId('__new__')
                      } else {
                        setOrgMode('existing')
                        setSelectedTenantId(val)
                      }
                    }}
                    options={[
                      { value: '__new__', label: t('start.fields.existingOrg.createNew') },
                      ...userOrgs.map((o) => ({ value: o.id, label: o.name })),
                    ]}
                  />
                  {orgMode === 'existing' && selectedTenantId && selectedTenantId !== '__new__' && (
                    <p className="text-xs text-muted-foreground">
                      {t('start.fields.existingOrg.hint')}
                    </p>
                  )}
                </div>
              ) : null}

              {/* New org name input — show when no orgs OR explicitly chose "Create new" */}
              {(userOrgs.length === 0 || selectedTenantId === '__new__') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('start.fields.orgName.label')}</label>
                  <Input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder={t('start.fields.orgName.placeholder')}
                  />
                </div>
              )}

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

          {/* Product selection: locked summary OR dropdown */}
          {productLocked && selectedProduct ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('start.fields.plan.label')}</label>
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{selectedProduct.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCheckoutPrice(selectedProduct.price.amount, selectedProduct.price.currency)}
                    {' / '}
                    {intervalLabel(selectedProduct.price.interval, selectedProduct.price.interval_count)}
                    {purchaseType === 'organization' && effectiveQuantity > 1 && (
                      <> &times; {effectiveQuantity} = {formatCheckoutPrice(totalAmount!, selectedProduct.price.currency)}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setProductLocked(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('start.actions.changePlan')}
                >
                  {t('start.actions.changePlan')}
                </button>
              </div>
            </div>
          ) : (
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
            </div>
          )}

          {/* Total price preview */}
          {selectedProduct && (
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{t('start.total')}</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">
                    {formatCheckoutPrice(totalAmount!, selectedProduct.price.currency)}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {intervalLabel(selectedProduct.price.interval, selectedProduct.price.interval_count)}
                  </span>
                </div>
              </div>
              {purchaseType === 'organization' && (
                <p className="text-xs text-muted-foreground text-right px-4">
                  {t('start.vatHint')}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('start.noAccount')}{' '}
            <Link href="/auth/signup" className="text-primary hover:text-primary/80">
              {t('start.actions.createAccount')}
            </Link>
            .
          </p>

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
