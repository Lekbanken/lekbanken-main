'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button, Card, CardContent, Badge, Input, useToast } from '@/components/ui'
import {
  ShoppingBagIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  TagIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  GiftIcon,
  StarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { useTenant } from '@/lib/context/TenantContext'

// Types
interface ShopItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  currency: 'coins' | 'gems'
  imageUrl?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  isNew?: boolean
  isFeatured?: boolean
  discount?: number
  requiredLevel?: number
}

type BaseShopCategory = 'cosmetic' | 'powerup' | 'bundle' | 'season_pass'

function baseCategory(category: string): BaseShopCategory | null {
  const raw = typeof category === 'string' ? category : ''
  const base = raw.includes(':') ? raw.split(':', 1)[0] : raw
  if (base === 'cosmetic' || base === 'powerup' || base === 'bundle' || base === 'season_pass') return base
  return null
}

type ShopOverviewPayload = {
  tenantId: string
  userLevel: number
  coinBalance: number
  gemBalance: number
  ownedItemIds: string[]
  ownedQuantitiesByItemId?: Record<string, number>
  activeBoost?: { multiplier: number; expiresAt: string } | null
  items: ShopItem[]
}

// Category IDs - labels come from translations
const CATEGORY_IDS = ['all', 'cosmetic', 'powerup', 'bundle', 'season_pass'] as const
const CATEGORY_ICONS = {
  all: Squares2X2Icon,
  cosmetic: SparklesIcon,
  powerup: BoltIcon,
  bundle: GiftIcon,
  season_pass: StarIcon,
}

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'legendary':
      return 'warning'
    case 'epic':
      return 'primary'
    case 'rare':
      return 'accent'
    default:
      return 'default'
  }
}

export default function ShopPage() {
  const t = useTranslations('app.shop')
  const toast = useToast()
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id ?? null

  const [items, setItems] = useState<ShopItem[]>([])
  const [ownedItemIds, setOwnedItemIds] = useState<string[]>([])
  const [ownedQuantitiesByItemId, setOwnedQuantitiesByItemId] = useState<Record<string, number>>({})
  const [activeBoost, setActiveBoost] = useState<{ multiplier: number; expiresAt: string } | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [coinBalance, setCoinBalance] = useState(0)
  const [gemBalance, setGemBalance] = useState(0)
  const [userLevel, setUserLevel] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isBuyingId, setIsBuyingId] = useState<string | null>(null)
  const [isConsumingId, setIsConsumingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      if (!tenantId) {
        if (isMounted) {
          setItems([])
          setOwnedItemIds([])
          setCoinBalance(0)
          setGemBalance(0)
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        const res = await fetch(`/api/shop?tenantId=${encodeURIComponent(tenantId)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Shop API failed with status ${res.status}`)
        const payload = (await res.json()) as ShopOverviewPayload
        if (!isMounted) return
        setItems(payload.items ?? [])
        setOwnedItemIds(payload.ownedItemIds ?? [])
        setOwnedQuantitiesByItemId(payload.ownedQuantitiesByItemId ?? {})
        setActiveBoost(payload.activeBoost ?? null)
        setCoinBalance(payload.coinBalance ?? 0)
        setGemBalance(payload.gemBalance ?? 0)
        setUserLevel(typeof payload.userLevel === 'number' && Number.isFinite(payload.userLevel) ? payload.userLevel : 1)
      } catch {
        if (!isMounted) return
        setItems([])
        setOwnedItemIds([])
        setOwnedQuantitiesByItemId({})
        setActiveBoost(null)
        setCoinBalance(0)
        setGemBalance(0)
        setUserLevel(1)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [tenantId])

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const activeBoostLabel = useMemo(() => {
    if (!activeBoost?.expiresAt) return null
    const expiresMs = Date.parse(activeBoost.expiresAt)
    if (!Number.isFinite(expiresMs)) return null
    const diffMs = Math.max(0, expiresMs - nowMs)
    const totalMinutes = Math.floor(diffMs / 60_000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${activeBoost.multiplier}x (${hours}h ${minutes}m)`
  }, [activeBoost, nowMs])

  const featuredItem = useMemo(() => items.find((item) => item.isFeatured), [items])

  const filteredItems = items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || (baseCategory(item.category) !== null && baseCategory(item.category) === selectedCategory)
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const canBuyItem = (item: ShopItem) => {
    if (!tenantId) return false

    const requiredLevel = typeof item.requiredLevel === 'number' ? item.requiredLevel : 1
    if (requiredLevel > 1 && userLevel < requiredLevel) return false

    // MVP supports purchases with DiceCoin only.
    if (item.currency !== 'coins') return false
    // Non-consumables: prevent repurchase.
    const base = baseCategory(item.category)
    if (base !== 'powerup' && base !== 'bundle' && ownedItemIds.includes(item.id)) return false
    return true
  }

  const isLevelLocked = useCallback(
    (item: ShopItem) => {
      const requiredLevel = typeof item.requiredLevel === 'number' ? item.requiredLevel : 1
      return requiredLevel > 1 && userLevel < requiredLevel
    },
    [userLevel]
  )

  const isCategoryLocked = useCallback(
    (categoryId: string) => {
      if (categoryId === 'all') return false
      const candidates = items.filter((item) => baseCategory(item.category) === categoryId)
      if (candidates.length === 0) return true
      return candidates.every((item) => isLevelLocked(item))
    },
    [items, isLevelLocked]
  )

  useEffect(() => {
    if (selectedCategory === 'all') return
    if (isCategoryLocked(selectedCategory)) {
      setSelectedCategory('all')
    }
  }, [isCategoryLocked, selectedCategory])

  const isOwned = (item: ShopItem) => {
    const base = baseCategory(item.category)
    return base !== 'powerup' && base !== 'bundle' && ownedItemIds.includes(item.id)
  }

  const getPowerupQuantity = (item: ShopItem) => {
    if (baseCategory(item.category) !== 'powerup') return 0
    return ownedQuantitiesByItemId[item.id] ?? 0
  }

  const buyItem = async (item: ShopItem) => {
    if (!tenantId) return
    if (!canBuyItem(item)) return
    const idempotencyKey = `shop:${item.id}:${Date.now()}`

    setIsBuyingId(item.id)
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, itemId: item.id, idempotencyKey }),
      })

      if (!res.ok) {
        if (res.status === 409) {
          toast.warning(t('toasts.insufficientBalance'), t('toasts.insufficientBalanceTitle'))
        } else if (res.status === 401) {
          toast.error(t('toasts.notLoggedIn'), t('toasts.notLoggedInTitle'))
        } else if (res.status === 403) {
          const json = (await res.json().catch(() => null)) as
            | { code?: string; requiredLevel?: number | null }
            | null
          if (json?.code === 'LEVEL_LOCKED') {
            const required = typeof json.requiredLevel === 'number' ? json.requiredLevel : item.requiredLevel
            toast.warning(t('toasts.levelLocked', { level: required ?? '?' }), t('toasts.levelLockedTitle'))
          } else {
            toast.error(t('toasts.accessDenied'), t('toasts.accessDeniedTitle'))
          }
        } else {
          toast.error(t('toasts.purchaseFailed'), t('toasts.purchaseFailedTitle'))
        }
        return
      }

      const payload = (await res.json()) as { balance?: number | null }
      setOwnedItemIds((prev) => Array.from(new Set([...prev, item.id])))
      if (baseCategory(item.category) === 'powerup') {
        setOwnedQuantitiesByItemId((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] ?? 0) + 1,
        }))
      }
      if (typeof payload.balance === 'number') setCoinBalance(payload.balance)

      toast.success(t('toasts.purchaseSuccess'), t('toasts.purchaseSuccessTitle'))
    } finally {
      setIsBuyingId(null)
    }
  }

  const canConsumePowerup = (item: ShopItem) => {
    if (!tenantId) return false
    if (baseCategory(item.category) !== 'powerup') return false
    return getPowerupQuantity(item) > 0
  }

  const consumePowerup = async (item: ShopItem) => {
    if (!tenantId) return
    if (!canConsumePowerup(item)) return

    const idempotencyKey = `consume:${item.id}:${Date.now()}`
    setIsConsumingId(item.id)
    try {
      const res = await fetch('/api/shop/powerups/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, itemId: item.id, idempotencyKey }),
      })

      if (!res.ok) {
        if (res.status === 409) {
          toast.warning(t('toasts.noPowerups'), t('toasts.noPowerupsTitle'))
        } else {
          toast.error(t('toasts.consumeFailed'), t('toasts.consumeFailedTitle'))
        }
        return
      }

      const payload = (await res.json()) as { remainingQuantity?: number | null }
      const remaining = typeof payload.remainingQuantity === 'number' ? payload.remainingQuantity : 0
      setOwnedQuantitiesByItemId((prev) => ({ ...prev, [item.id]: Math.max(0, remaining) }))
      toast.success(t('toasts.consumeSuccess'), t('toasts.consumeSuccessTitle'))
    } finally {
      setIsConsumingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          {activeBoostLabel && (
            <div className="mt-2">
              <Badge variant="accent">{t('activeBoost', { label: activeBoostLabel })}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Currency Balances */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('coins')}</div>
              <div className="text-xl font-bold text-foreground">{coinBalance.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gems</div>
              <div className="text-xl font-bold text-foreground">{gemBalance}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Featured Item */}
      {featuredItem && (
        <Card className="overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-yellow-100/50 border-2 border-yellow-300">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-48 h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                {featuredItem.imageUrl ? (
                  <Image
                    src={featuredItem.imageUrl}
                    alt={featuredItem.name}
                    width={120}
                    height={120}
                    className="object-contain"
                  />
                ) : (
                  <GiftIcon className="h-16 w-16 text-primary/50" />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="warning" className="flex items-center gap-1">
                      <StarSolidIcon className="h-3 w-3" />
                      {t('featured')}
                    </Badge>
                    {isLevelLocked(featuredItem) && (
                      <Badge variant="default">
                        {t('levelLocked', { level: featuredItem.requiredLevel ?? '?' })}
                      </Badge>
                    )}
                    <Badge variant={getRarityColor(featuredItem.rarity) as 'warning' | 'primary' | 'accent' | 'default'}>
                      {t(`rarity.${featuredItem.rarity}` as 'rarity.common')}
                    </Badge>
                    {featuredItem.discount && (
                      <Badge variant="destructive">-{featuredItem.discount}%</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{featuredItem.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{featuredItem.description}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1">
                    {featuredItem.currency === 'coins' ? (
                      <CurrencyDollarIcon className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <SparklesIcon className="h-5 w-5 text-purple-500" />
                    )}
                    <span className="font-bold text-lg">{featuredItem.price}</span>
                    {featuredItem.discount && (
                      <span className="text-sm text-muted-foreground line-through ml-1">
                        {Math.round(featuredItem.price / (1 - featuredItem.discount / 100))}
                      </span>
                    )}
                  </div>
                  <Button
                    disabled={isLoading || isBuyingId === featuredItem.id || !canBuyItem(featuredItem)}
                    loading={isBuyingId === featuredItem.id}
                    onClick={() => buyItem(featuredItem)}
                  >
                    <ShoppingBagIcon className="h-4 w-4 mr-1" />
                    {isOwned(featuredItem) ? t('owned') : t('buyNow')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Squares2X2Icon className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListBulletIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {CATEGORY_IDS.map((categoryId) => {
          const Icon = CATEGORY_ICONS[categoryId]
          return (
            <Button
              key={categoryId}
              variant={selectedCategory === categoryId ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(categoryId)}
              disabled={isLoading || isCategoryLocked(categoryId)}
              className="flex-shrink-0"
            >
              <Icon className="h-4 w-4 mr-1" />
              {t(`categories.${categoryId}` as 'categories.all')}
            </Button>
          )
        })}
      </div>

      {/* Items Grid */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid gap-4 grid-cols-2 sm:grid-cols-3'
            : 'space-y-3'
        }
      >
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            className={`overflow-hidden ${viewMode === 'list' ? 'flex' : ''}`}
          >
            {/* Item Image */}
            <div
              className={`bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center ${
                viewMode === 'grid' ? 'h-32' : 'w-24 h-24 flex-shrink-0'
              }`}
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={viewMode === 'grid' ? 80 : 60}
                  height={viewMode === 'grid' ? 80 : 60}
                  className="object-contain"
                />
              ) : (
                <TagIcon className={`text-muted-foreground ${viewMode === 'grid' ? 'h-10 w-10' : 'h-8 w-8'}`} />
              )}
            </div>

            <CardContent className={`${viewMode === 'grid' ? 'p-3' : 'p-3 flex-1 flex items-center justify-between'}`}>
              <div className={viewMode === 'list' ? 'flex-1' : ''}>
                {/* Badges */}
                <div className="flex gap-1 mb-1 flex-wrap">
                  {item.isNew && <Badge variant="accent" size="sm">{t('new')}</Badge>}
                  {isLevelLocked(item) && (
                    <Badge variant="default" size="sm">
                      {t('levelLocked', { level: item.requiredLevel ?? '?' })}
                    </Badge>
                  )}
                  {baseCategory(item.category) === 'powerup' && getPowerupQuantity(item) > 0 && (
                    <Badge variant="default" size="sm">
                      x{getPowerupQuantity(item)}
                    </Badge>
                  )}
                  <Badge
                    variant={getRarityColor(item.rarity) as 'warning' | 'primary' | 'accent' | 'default'}
                    size="sm"
                  >
                    {t(`rarity.${item.rarity}` as 'rarity.common')}
                  </Badge>
                </div>

                {/* Name */}
                <h3 className="font-medium text-foreground text-sm">{item.name}</h3>
                
                {viewMode === 'list' && (
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>

              {/* Price & Buy */}
              <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mt-2' : 'ml-4'}`}>
                <div className="flex items-center gap-1">
                  {item.currency === 'coins' ? (
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <SparklesIcon className="h-4 w-4 text-purple-500" />
                  )}
                  <span className="font-bold text-sm">{item.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  {baseCategory(item.category) === 'powerup' && getPowerupQuantity(item) > 0 && (
                    <Button
                      size="sm"
                      disabled={isLoading || isConsumingId === item.id || !canConsumePowerup(item)}
                      loading={isConsumingId === item.id}
                      onClick={() => consumePowerup(item)}
                    >
                      {t('use')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading || isBuyingId === item.id || !canBuyItem(item)}
                    loading={isBuyingId === item.id}
                    onClick={() => buyItem(item)}
                  >
                    {isOwned(item) ? t('owned') : t('buy')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingBagIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">{t('empty.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('empty.description')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
