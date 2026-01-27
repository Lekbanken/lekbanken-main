'use client'

import { useTranslations } from 'next-intl'
import { ShoppingCartIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useCart, type CartItem } from '@/lib/cart/CartContext'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  item: Omit<CartItem, 'quantity'>
  quantity?: number
  showQuantity?: boolean
  onAdded?: () => void
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'sm' | 'md' | 'lg'
}

export function AddToCartButton({
  item,
  quantity = 1,
  showQuantity = false,
  onAdded,
  className,
  children,
  disabled,
  variant,
  size,
}: AddToCartButtonProps) {
  const t = useTranslations('billing.cart')
  const { addItem, state } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  // Check if item is already in cart
  const existingItem = useMemo(
    () => state.items.find((i) => i.productPriceId === item.productPriceId),
    [state.items, item.productPriceId]
  )

  const handleClick = () => {
    addItem({ ...item, quantity })
    setJustAdded(true)
    onAdded?.()
    
    // Reset after animation
    setTimeout(() => setJustAdded(false), 2000)
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      variant={variant}
      size={size}
      className={cn(
        'transition-all duration-200',
        justAdded && 'bg-green-600 hover:bg-green-700',
        className
      )}
    >
      {justAdded ? (
        <>
          <CheckIcon className="h-4 w-4 mr-2" />
          {t('added')}
        </>
      ) : (
        <>
          <ShoppingCartIcon className="h-4 w-4 mr-2" />
          {children || t('addToCart')}
          {showQuantity && existingItem && (
            <span className="ml-2 bg-primary-foreground/20 px-1.5 py-0.5 rounded text-xs">
              {existingItem.quantity}
            </span>
          )}
        </>
      )}
    </Button>
  )
}
