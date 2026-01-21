'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type PurchaseIntent = {
  id: string
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const purchaseIntentId = searchParams.get('purchase_intent_id')

  const [intent, setIntent] = useState<PurchaseIntent | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!purchaseIntentId) return

    const pid = purchaseIntentId

    let cancelled = false
    let timer: number | null = null

    async function poll() {
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
        if (!res.ok) throw new Error(json.error || 'Kunde inte läsa status')

        if (cancelled) return
        setIntent(json.intent ?? null)

        const status = (json.intent?.status || '').toLowerCase()
        if (status === 'provisioned' && json.intent?.tenant_id) {
          router.replace('/app/select-tenant')
          return
        }

        timer = window.setTimeout(poll, 2000)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Ett fel uppstod')
        timer = window.setTimeout(poll, 4000)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [purchaseIntentId, router])

  if (!purchaseIntentId) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
        <Alert variant="error">Saknar purchase_intent_id.</Alert>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Tack!</h1>
        <p className="text-sm text-muted-foreground">
          Vi bekräftar betalningen och skapar organisationen. Det kan ta någon minut.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-lg border border-border p-4">
        <div className="text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className="font-medium">{intent?.status ?? 'Laddar…'}</span>
          </div>
          {intent?.tenant_name && (
            <div>
              <span className="text-muted-foreground">Organisation:</span>{' '}
              <span className="font-medium">{intent.tenant_name}</span>
            </div>
          )}
          {intent?.quantity_seats ? (
            <div>
              <span className="text-muted-foreground">Platser:</span>{' '}
              <span className="font-medium">{intent.quantity_seats}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/checkout/start')}>
          Tillbaka
        </Button>
        <Button onClick={() => router.push('/app/select-tenant')}>Gå vidare</Button>
      </div>
    </div>
  )
}
