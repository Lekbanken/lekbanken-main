'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { UpsellModal, type UpsellProduct } from './UpsellModal'

export interface LockedContentProps {
  /** Whether the content is locked */
  isLocked: boolean
  /** The content to show when unlocked */
  children: ReactNode
  /** Product to upsell for unlocking */
  product?: UpsellProduct
  /** Name of the locked feature for the upsell modal */
  featureName?: string
  /** Optional custom locked message */
  lockedMessage?: string
  /** Optional custom unlock button text */
  unlockButtonText?: string
  /** Visual style of the lock overlay */
  variant?: 'overlay' | 'blur' | 'card'
  /** Kind of purchase */
  kind?: 'user_subscription' | 'organisation_subscription'
  /** Tenant ID for org purchases */
  tenantId?: string
  /** Custom fallback content when locked (instead of blur) */
  fallback?: ReactNode
  /** Callback when unlock is clicked (for tracking) */
  onUnlockClick?: () => void
}

/**
 * A wrapper component that shows locked content with an upsell overlay.
 * When unlocked, shows the children directly. When locked, shows a 
 * blur overlay or custom fallback with an unlock button.
 */
export function LockedContent({
  isLocked,
  children,
  product,
  featureName,
  lockedMessage,
  unlockButtonText,
  variant = 'blur',
  kind = 'user_subscription',
  tenantId,
  fallback,
  onUnlockClick,
}: LockedContentProps) {
  const t = useTranslations('billing.lockedContent')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // If not locked, just render children
  if (!isLocked) {
    return <>{children}</>
  }

  const handleUnlockClick = () => {
    onUnlockClick?.()
    if (product) {
      setIsModalOpen(true)
    }
  }

  // Render custom fallback if provided
  if (fallback) {
    return (
      <>
        {fallback}
        {product && (
          <UpsellModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            product={product}
            lockedFeature={featureName}
            kind={kind}
            tenantId={tenantId}
          />
        )}
      </>
    )
  }

  return (
    <>
      {variant === 'card' ? (
        // Card variant: Clean card with lock icon
        <div className="relative rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-6">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <LockClosedIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                {featureName || t('defaultTitle')}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {lockedMessage || t('defaultMessage')}
              </p>
            </div>
            {product && (
              <Button onClick={handleUnlockClick} className="gap-2">
                <SparklesIcon className="h-4 w-4" />
                {unlockButtonText || t('unlock')}
              </Button>
            )}
          </div>
        </div>
      ) : variant === 'overlay' ? (
        // Overlay variant: Dark overlay on content
        <div className="relative">
          <div className="pointer-events-none opacity-50 grayscale">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <LockClosedIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {featureName || t('defaultTitle')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {lockedMessage || t('defaultMessage')}
                </p>
              </div>
              {product && (
                <Button onClick={handleUnlockClick} className="gap-2">
                  <SparklesIcon className="h-4 w-4" />
                  {unlockButtonText || t('unlock')}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Blur variant (default): Blurred content with unlock button
        <div className="relative">
          <div className="pointer-events-none select-none blur-sm">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4 p-6 rounded-xl bg-background/90 backdrop-blur-sm shadow-lg max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <LockClosedIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground">
                  {featureName || t('defaultTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {lockedMessage || t('defaultMessage')}
                </p>
              </div>
              {product && (
                <Button onClick={handleUnlockClick} size="lg" className="gap-2 w-full">
                  <SparklesIcon className="h-4 w-4" />
                  {unlockButtonText || t('unlock')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {product && (
        <UpsellModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          product={product}
          lockedFeature={featureName}
          kind={kind}
          tenantId={tenantId}
        />
      )}
    </>
  )
}
