'use client'

import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { StripePaymentElement } from './StripePaymentElement'
import { Alert } from '@/components/ui/alert'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY || '')

interface SubscriptionCheckoutProps {
  tenantId: string
  priceId: string
  quantity?: number
  onSuccess?: (subscriptionId: string) => void
  onError?: (error: string) => void
}

export function SubscriptionCheckout({
  tenantId,
  priceId,
  quantity = 1,
  onSuccess,
  onError,
}: SubscriptionCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Create subscription and get client secret
    const createSubscription = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/billing/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenantId,
            priceId,
            quantity,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to create subscription')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
        setError(errorMessage)
        onError?.(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    createSubscription()
  }, [tenantId, priceId, quantity, onError])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        {error}
      </Alert>
    )
  }

  if (!clientSecret) {
    return (
      <Alert variant="warning">
        Unable to initialize payment. Please try again.
      </Alert>
    )
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0070f3',
      },
    },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentElement
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  )
}
