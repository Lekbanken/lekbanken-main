'use client'

import { createContext, useContext, useReducer, useCallback, useMemo, useEffect, type ReactNode } from 'react'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface CartItem {
  productPriceId: string
  productId: string
  productName: string
  priceName: string
  priceAmount: number
  currency: string
  interval: string // 'month', 'year', 'one_time'
  quantity: number
  stripePriceId: string
}

export interface CartState {
  items: CartItem[]
  kind: 'organisation_subscription' | 'user_subscription'
  tenantId: string | null
  tenantName: string | null
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { productPriceId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { productPriceId: string; quantity: number } }
  | { type: 'SET_KIND'; payload: CartState['kind'] }
  | { type: 'SET_TENANT'; payload: { tenantId: string | null; tenantName: string | null } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState }

interface CartContextValue {
  state: CartState
  addItem: (item: CartItem) => void
  removeItem: (productPriceId: string) => void
  updateQuantity: (productPriceId: string, quantity: number) => void
  setKind: (kind: CartState['kind']) => void
  setTenant: (tenantId: string | null, tenantName: string | null) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
  hasSubscription: boolean
  hasOneTime: boolean
}

// ─────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────

const initialState: CartState = {
  items: [],
  kind: 'organisation_subscription',
  tenantId: null,
  tenantName: null,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(
        (item) => item.productPriceId === action.payload.productPriceId
      )
      if (existingIndex >= 0) {
        // Update quantity if item exists
        const newItems = [...state.items]
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + action.payload.quantity,
        }
        return { ...state, items: newItems }
      }
      return { ...state, items: [...state.items, action.payload] }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((item) => item.productPriceId !== action.payload.productPriceId),
      }

    case 'UPDATE_QUANTITY': {
      const newItems = state.items.map((item) =>
        item.productPriceId === action.payload.productPriceId
          ? { ...item, quantity: Math.max(1, action.payload.quantity) }
          : item
      )
      return { ...state, items: newItems }
    }

    case 'SET_KIND':
      return { ...state, kind: action.payload }

    case 'SET_TENANT':
      return {
        ...state,
        tenantId: action.payload.tenantId,
        tenantName: action.payload.tenantName,
      }

    case 'CLEAR_CART':
      return initialState

    case 'LOAD_CART':
      return action.payload

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────
// Context & Provider
// ─────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | undefined>(undefined)

const STORAGE_KEY = 'lekbanken_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CartState
        dispatch({ type: 'LOAD_CART', payload: parsed })
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Persist cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors
    }
  }, [state])

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }, [])

  const removeItem = useCallback((productPriceId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productPriceId } })
  }, [])

  const updateQuantity = useCallback((productPriceId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productPriceId, quantity } })
  }, [])

  const setKind = useCallback((kind: CartState['kind']) => {
    dispatch({ type: 'SET_KIND', payload: kind })
  }, [])

  const setTenant = useCallback((tenantId: string | null, tenantName: string | null) => {
    dispatch({ type: 'SET_TENANT', payload: { tenantId, tenantName } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  const itemCount = useMemo(
    () => state.items.reduce((sum, item) => sum + item.quantity, 0),
    [state.items]
  )

  const subtotal = useMemo(
    () => state.items.reduce((sum, item) => sum + item.priceAmount * item.quantity, 0),
    [state.items]
  )

  const hasSubscription = useMemo(
    () => state.items.some((item) => item.interval !== 'one_time'),
    [state.items]
  )

  const hasOneTime = useMemo(
    () => state.items.some((item) => item.interval === 'one_time'),
    [state.items]
  )

  const value = useMemo(
    () => ({
      state,
      addItem,
      removeItem,
      updateQuantity,
      setKind,
      setTenant,
      clearCart,
      itemCount,
      subtotal,
      hasSubscription,
      hasOneTime,
    }),
    [state, addItem, removeItem, updateQuantity, setKind, setTenant, clearCart, itemCount, subtotal, hasSubscription, hasOneTime]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
