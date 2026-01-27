'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LockClosedIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'

export interface UpsellProduct {
  /** The Stripe price ID */
  priceId: string
  /** Product name */
  name: string
  /** Product description */
  description?: string
  /** Formatted price (e.g. "99 kr/mån") */
  priceDisplay: string
  /** Original price if discounted */
  originalPrice?: string
  /** Features list */
  features?: string[]
  /** Badge text (e.g. "Most popular") */
  badge?: string
  /** Whether this is a one-time purchase or subscription */
  isOneTime?: boolean
}

export interface UpsellModalProps {
  /** Control modal visibility */
  open: boolean
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void
  /** Product to upsell */
  product: UpsellProduct
  /** Title override */
  title?: string
  /** Description override */
  description?: string
  /** Feature/content name that triggered the upsell */
  lockedFeature?: string
  /** Kind of purchase */
  kind?: 'user_subscription' | 'organisation_subscription'
  /** Tenant ID for org purchases */
  tenantId?: string
  /** URL to return to after purchase */
  returnUrl?: string
  /** Callback when checkout starts */
  onCheckoutStart?: () => void
  /** Callback on successful checkout redirect */
  onCheckoutRedirect?: () => void
  /** Callback on error */
  onError?: (error: string, code?: string) => void
}

/**
 * Modal for upselling locked content/features with product details.
 */
export function UpsellModal({
  open,
  onOpenChange,
  product,
  title,
  description,
  lockedFeature,
  kind = 'user_subscription',
  tenantId,
  returnUrl,
  onCheckoutStart,
  onCheckoutRedirect,
  onError,
}: UpsellModalProps) {
  const t = useTranslations('billing.upsell')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnlock = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    onCheckoutStart?.()

    try {
      const response = await fetch('/api/checkout/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productPriceId: product.priceId,
          kind,
          tenantId,
          returnUrl: returnUrl || window.location.href,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || t('errorGeneric')
        setError(errorMessage)
        onError?.(errorMessage, data.code)
        return
      }

      if (data.checkoutUrl) {
        onCheckoutRedirect?.()
        window.location.href = data.checkoutUrl
      } else {
        const errorMessage = t('errorNoCheckoutUrl')
        setError(errorMessage)
        onError?.(errorMessage)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errorGeneric')
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-primary" />
            <DialogTitle>
              {title || t('modalTitle')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {description || (lockedFeature 
              ? t('modalDescriptionWithFeature', { feature: lockedFeature })
              : t('modalDescription')
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Card */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.description}
                  </p>
                )}
              </div>
              {product.badge && (
                <Badge variant="secondary">{product.badge}</Badge>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{product.priceDisplay}</span>
              {product.originalPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.originalPrice}
                </span>
              )}
              {product.isOneTime && (
                <span className="text-sm text-muted-foreground">
                  {t('oneTime')}
                </span>
              )}
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <ul className="space-y-2 pt-2 border-t">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleUnlock} 
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            <LockClosedIcon className="h-4 w-4" />
            {isLoading ? t('loading') : t('unlockNow')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full"
          >
            {t('maybeLater')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
