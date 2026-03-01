'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  CheckCircleIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stop polling after this many seconds */
const POLL_TIMEOUT_S = 90
/** How often to poll when healthy */
const POLL_INTERVAL_MS = 2_000
/** How often to retry after an error */
const POLL_ERROR_INTERVAL_MS = 4_000
/** Give up after this many consecutive errors */
const MAX_CONSECUTIVE_ERRORS = 5

type PurchaseIntent = {
  id: string
  kind: 'organisation_subscription' | 'user_subscription' | 'one_time'
  status: string
  tenant_id: string | null
  tenant_name: string | null
  quantity_seats: number
  product_id: string | null
  product_price_id: string | null
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
}

export default function CheckoutReturnPage() {
  const t = useTranslations('marketing.checkout')
  const router = useRouter()
  const searchParams = useSearchParams()
  const purchaseIntentId = searchParams.get('purchase_intent_id')

  const [intent, setIntent] = useState<PurchaseIntent | null>(null)
  const [error, setError] = useState<string>('')
  const [isProvisioned, setIsProvisioned] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const isPersonalPurchase = intent?.kind === 'user_subscription'

  // Elapsed seconds counter for the progress bar
  const [elapsedS, setElapsedS] = useState(0)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (!purchaseIntentId) return

    const pid = purchaseIntentId

    let cancelled = false
    let timer: number | null = null
    let errorCount = 0
    const startTime = Date.now()

    // Tick elapsed seconds for progress indicator
    const tick = window.setInterval(() => {
      const s = Math.floor((Date.now() - startTime) / 1000)
      elapsedRef.current = s
      setElapsedS(s)
    }, 500)

    async function poll() {
      // Timeout guard
      if (elapsedRef.current >= POLL_TIMEOUT_S) {
        setTimedOut(true)
        return
      }

      try {
        const res = await fetch(`/api/checkout/intents/${encodeURIComponent(pid)}`, {
          cache: 'no-store',
        })

        if (res.status === 401) {
          router.push(
            `/auth/login?redirect=${encodeURIComponent(`/checkout/return?purchase_intent_id=${pid}`)}`
          )
          return
        }

        const json = (await res.json()) as { intent?: PurchaseIntent; error?: string }
        if (!res.ok) throw new Error(json.error || t('return.errors.readStatusFailed'))

        if (cancelled) return
        errorCount = 0 // reset on success
        setError('')
        setIntent(json.intent ?? null)

        const status = (json.intent?.status || '').toLowerCase()
        if (status === 'provisioned' && json.intent?.tenant_id) {
          setIsProvisioned(true)
          const isPersonal = json.intent.kind === 'user_subscription'
          if (isPersonal) {
            setTimeout(() => {
              router.replace('/app')
            }, 1500)
          } else {
            router.replace('/app/select-tenant')
          }
          return
        }

        timer = window.setTimeout(poll, POLL_INTERVAL_MS)
      } catch (e) {
        if (cancelled) return
        errorCount++
        setError(e instanceof Error ? e.message : t('return.errors.generic'))

        if (errorCount >= MAX_CONSECUTIVE_ERRORS) {
          setTimedOut(true)
          return
        }

        timer = window.setTimeout(poll, POLL_ERROR_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      clearInterval(tick)
      if (timer) window.clearTimeout(timer)
    }
  }, [purchaseIntentId, router, t])

  if (!purchaseIntentId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
        <Alert variant="error">{t('return.errors.missingIntentId')}</Alert>
      </div>
    )
  }

  // -----------------------------------------------------------------------
  // Timeout / failure state
  // -----------------------------------------------------------------------
  if (timedOut) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t('return.timeout.title')}</h1>
          <p className="text-muted-foreground">{t('return.timeout.subtitle')}</p>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => {
              setTimedOut(false)
              setElapsedS(0)
              elapsedRef.current = 0
              setError('')
              // Force re-mount by toggling an unmount key isn't needed —
              // the useEffect depends on purchaseIntentId which hasn't changed,
              // so we reload the page to re-trigger
              window.location.reload()
            }}
          >
            {t('return.timeout.retry')}
          </Button>
          <Button variant="outline" onClick={() => router.push('/checkout/start')}>
            {t('return.actions.back')}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('return.timeout.supportHint')}{' '}
            <Link href="mailto:support@lekbanken.se" className="text-primary hover:text-primary/80">
              support@lekbanken.se
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Success state for personal purchases
  if (isProvisioned && isPersonalPurchase) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t('return.personalSuccess.title')}</h1>
          <p className="text-lg text-muted-foreground">{t('return.personalSuccess.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="h-4 w-4" />
          <span>{t('return.personalSuccess.redirecting')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {isPersonalPurchase ? t('return.titlePersonal') : t('return.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isPersonalPurchase ? t('return.subtitlePersonal') : t('return.subtitle')}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-linear"
            style={{ width: `${Math.min((elapsedS / POLL_TIMEOUT_S) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {t('return.labels.elapsed', { seconds: elapsedS })}
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="text-sm">
          <div>
            <span className="text-muted-foreground">{t('return.labels.status')}</span>{' '}
            <span className="font-medium">{intent?.status ?? t('return.labels.loading')}</span>
          </div>
          {!isPersonalPurchase && intent?.tenant_name && (
            <div>
              <span className="text-muted-foreground">{t('return.labels.organization')}</span>{' '}
              <span className="font-medium">{intent.tenant_name}</span>
            </div>
          )}
          {!isPersonalPurchase && intent?.quantity_seats ? (
            <div>
              <span className="text-muted-foreground">{t('return.labels.seats')}</span>{' '}
              <span className="font-medium">{intent.quantity_seats}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/checkout/start')}>
          {t('return.actions.back')}
        </Button>
        <Button onClick={() => router.push(isPersonalPurchase ? '/app' : '/app/select-tenant')}>
          {t('return.actions.continue')}
        </Button>
      </div>
    </div>
  )
}
