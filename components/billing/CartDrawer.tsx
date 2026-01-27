'use client'

import { useTranslations } from 'next-intl'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart/CartContext'
import { CartItemRow } from '@/components/billing/CartItemRow'
import { useState } from 'react'

export function CartDrawer() {
  const t = useTranslations('admin.billing.cart')
  const { state, itemCount, subtotal, clearCart, hasSubscription, hasOneTime } = useCart()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  // Get the primary currency from first item
  const currency = state.items[0]?.currency ?? 'sek'

  const handleCheckout = async () => {
    if (state.items.length === 0) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/checkout/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.items.map((item) => ({
            productPriceId: item.productPriceId,
            quantity: item.quantity,
          })),
          kind: state.kind,
          tenantId: state.tenantId,
          tenantName: state.tenantName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Checkout failed')
      }

      const data = await response.json()
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check for mixed billing types (subscriptions + one-time)
  const hasMixedTypes = hasSubscription && hasOneTime

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <ShoppingCartIcon className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {itemCount}
            </Badge>
          )}
          <span className="sr-only">{t('openCart')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5" />
            {t('title')}
            {itemCount > 0 && (
              <Badge variant="secondary">{itemCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCartIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>{t('empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map((item) => (
                <CartItemRow key={item.productPriceId} item={item} />
              ))}
            </div>
          )}
        </div>

        {state.items.length > 0 && (
          <SheetFooter className="flex-col gap-4 sm:flex-col border-t pt-4">
            {hasMixedTypes && (
              <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 p-3 rounded-md">
                {t('mixedTypesWarning')}
              </div>
            )}
            
            <div className="flex justify-between items-center w-full">
              <span className="font-medium">{t('subtotal')}</span>
              <span className="text-lg font-bold">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="flex-1"
              >
                {t('clearCart')}
              </Button>
              <Button
                onClick={handleCheckout}
                disabled={isLoading || hasMixedTypes}
                className="flex-1"
              >
                {isLoading ? t('processing') : t('checkout')}
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
