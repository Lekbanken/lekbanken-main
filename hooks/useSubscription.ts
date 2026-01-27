'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SubscriptionPlan {
  id: string
  nickname: string | null
  amount: number | null
  currency: string
  interval: string | null
  interval_count: number | null
  product: string
}

export interface PaymentMethod {
  brand: string
  last4: string
}

export interface Subscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at: number | null
  plan: SubscriptionPlan
  payment_method: PaymentMethod | null
}

export interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount_due: number
  amount_paid: number
  currency: string
  created: number
  period_start: number
  period_end: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

export interface Entitlement {
  id: string
  status: string
  quantity_seats: number
  valid_from: string
  valid_until: string | null
  metadata: Record<string, unknown> | null
  product: {
    id: string
    name: string
    slug: string
    description: string | null
  } | null
}

export interface Tenant {
  id: string
  name: string
  type: string
}

export interface SubscriptionData {
  subscription: Subscription | null
  invoices: Invoice[]
  entitlements: Entitlement[]
  tenant: Tenant | null
  membership: { role: string } | null
}

/**
 * Hook to fetch and manage the current user's subscription data
 */
export function useSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/subscription/my')
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Failed to fetch subscription')
      }
      const json = await res.json() as SubscriptionData
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSubscription()
  }, [fetchSubscription])

  const openBillingPortal = useCallback(async () => {
    if (!data?.tenant?.id) {
      throw new Error('No tenant ID available')
    }
    
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: data.tenant.id }),
    })
    
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || 'Failed to open billing portal')
    }
    
    const { url } = await res.json()
    window.location.href = url
  }, [data?.tenant?.id])

  return {
    subscription: data?.subscription ?? null,
    invoices: data?.invoices ?? [],
    entitlements: data?.entitlements ?? [],
    tenant: data?.tenant ?? null,
    membership: data?.membership ?? null,
    isLoading,
    error,
    refetch: fetchSubscription,
    openBillingPortal,
  }
}
