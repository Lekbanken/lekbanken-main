'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button, type Variant } from '@/components/ui/button'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface UpsellButtonProps {
  /** The Stripe price ID to checkout */
  priceId: string
  /** Price to display (formatted string, e.g. "99 kr/mån") */
  priceDisplay?: string
  /** Kind of purchase - user or organization */
  kind?: 'user_subscription' | 'organisation_subscription'
  /** Optional tenant ID for organization purchases */
  tenantId?: string
  /** URL to return to after successful purchase */
  returnUrl?: string
  /** Show lock icon */
  showLockIcon?: boolean
  /** Custom button text */
  buttonText?: string
  /** Button variant */
  variant?: Variant
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Callback when checkout starts */
  onCheckoutStart?: () => void
  /** Callback on error */
  onError?: (error: string, code?: string) => void
  /** Children override button text */
  children?: React.ReactNode
}

/**
 * A button that initiates checkout for a locked feature/content.
 * Handles the full checkout flow including redirect to Stripe.
 */
export function UpsellButton({
  priceId,
  priceDisplay,
  kind = 'user_subscription',
  tenantId,
  returnUrl,
  showLockIcon = true,
  buttonText,
  variant,
  size,
  onCheckoutStart,
  onError,
  className,
  disabled,
  children,
}: UpsellButtonProps) {
  const t = useTranslations('billing.upsell')
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (isLoading) return

    setIsLoading(true)
    onCheckoutStart?.()

    try {
      const response = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPriceId: priceId,
          kind,
          tenantId,
          returnUrl: returnUrl || window.location.href,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        onError?.(data.error || t('errorGeneric'), data.code)
        return
      }

      if (data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = data.checkoutUrl
      } else {
        onError?.(t('errorNoCheckoutUrl'))
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('errorGeneric'))
    } finally {
      setIsLoading(false)
    }
  }

  const displayText = buttonText || children || (
    priceDisplay 
      ? t('unlockFor', { price: priceDisplay })
      : t('unlock')
  )

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn('gap-2', className)}
      variant={variant}
      size={size}
    >
      {showLockIcon && <LockClosedIcon className="h-4 w-4" />}
      {isLoading ? t('loading') : displayText}
    </Button>
  )
}
