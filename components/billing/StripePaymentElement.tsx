'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface StripePaymentElementProps {
  onSuccess?: (subscriptionId: string) => void
  onError?: (error: string) => void
  returnUrl?: string
}

export function StripePaymentElement({
  onSuccess,
  onError,
  returnUrl = `${window.location.origin}/billing/success`,
}: StripePaymentElementProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      })

      if (submitError) {
        setError(submitError.message || 'Payment failed')
        onError?.(submitError.message || 'Payment failed')
      } else {
        onSuccess?.('subscription_created')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Subscribe'}
      </Button>
    </form>
  )
}
