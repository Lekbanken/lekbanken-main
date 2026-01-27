'use client'

import { useTranslations } from 'next-intl'
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useCart, type CartItem } from '@/lib/cart/CartContext'

interface CartItemRowProps {
  item: CartItem
}

export function CartItemRow({ item }: CartItemRowProps) {
  const t = useTranslations('billing.cart')
  const { removeItem, updateQuantity } = useCart()

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const intervalLabel = (interval: string) => {
    switch (interval.toLowerCase()) {
      case 'month':
        return t('perMonth')
      case 'year':
        return t('perYear')
      case 'one_time':
        return t('oneTime')
      default:
        return ''
    }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{item.productName}</h4>
        <p className="text-xs text-muted-foreground truncate">{item.priceName}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium">
            {formatCurrency(item.priceAmount, item.currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            {intervalLabel(item.interval)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => updateQuantity(item.productPriceId, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => updateQuantity(item.productPriceId, item.quantity + 1)}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        onClick={() => removeItem(item.productPriceId)}
      >
        <TrashIcon className="h-4 w-4" />      </Button>
    </div>
  )
}
