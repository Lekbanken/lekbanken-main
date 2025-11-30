'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button, Card, CardContent, Badge, Input } from '@/components/ui'
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

// Types
interface ShopItem {
  id: string
  name: string
  description: string
  category: 'cosmetic' | 'powerup' | 'bundle' | 'season_pass'
  price: number
  currency: 'coins' | 'gems'
  imageUrl?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  isNew?: boolean
  isFeatured?: boolean
  discount?: number
}

// Mock data
const mockItems: ShopItem[] = [
  {
    id: '1',
    name: 'Gyllene Avatar-ram',
    description: 'En glänsande gyllene ram för din profilbild',
    category: 'cosmetic',
    price: 500,
    currency: 'coins',
    rarity: 'epic',
    isNew: true,
  },
  {
    id: '2',
    name: 'XP-boost (24h)',
    description: 'Dubbel XP på alla aktiviteter i 24 timmar',
    category: 'powerup',
    price: 200,
    currency: 'coins',
    rarity: 'rare',
  },
  {
    id: '3',
    name: 'Vinter-bundle',
    description: 'Innehåller snöflingor-avatar, vintertema och 3x XP-boost',
    category: 'bundle',
    price: 50,
    currency: 'gems',
    rarity: 'legendary',
    isFeatured: true,
    discount: 20,
  },
  {
    id: '4',
    name: 'Säsongspass Vår 2025',
    description: 'Lås upp exklusiva belöningar under hela vårsäsongen',
    category: 'season_pass',
    price: 100,
    currency: 'gems',
    rarity: 'epic',
  },
  {
    id: '5',
    name: 'Regnbågs-emoji',
    description: 'Använd en regnbågs-emoji i ditt namn',
    category: 'cosmetic',
    price: 150,
    currency: 'coins',
    rarity: 'common',
  },
  {
    id: '6',
    name: 'Poäng-multiplikator',
    description: 'Få 1.5x poäng på nästa 5 aktiviteter',
    category: 'powerup',
    price: 300,
    currency: 'coins',
    rarity: 'rare',
    isNew: true,
  },
]

const CATEGORIES = [
  { id: 'all', name: 'Alla', icon: Squares2X2Icon },
  { id: 'cosmetic', name: 'Utseende', icon: SparklesIcon },
  { id: 'powerup', name: 'Power-ups', icon: BoltIcon },
  { id: 'bundle', name: 'Bundles', icon: GiftIcon },
  { id: 'season_pass', name: 'Säsongspass', icon: StarIcon },
]

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

function getRarityLabel(rarity: string) {
  switch (rarity) {
    case 'legendary':
      return 'Legendarisk'
    case 'epic':
      return 'Episk'
    case 'rare':
      return 'Sällsynt'
    default:
      return 'Vanlig'
  }
}

export default function ShopPage() {
  const [items] = useState<ShopItem[]>(mockItems)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Mock balances
  const coinBalance = 1250
  const gemBalance = 35

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredItem = items.find((item) => item.isFeatured)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Butik</h1>
          <p className="text-muted-foreground mt-1">Byt poäng mot belöningar och power-ups</p>
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
              <div className="text-sm text-muted-foreground">Mynt</div>
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
                      Utvalt
                    </Badge>
                    <Badge variant={getRarityColor(featuredItem.rarity) as 'warning' | 'primary' | 'accent' | 'default'}>
                      {getRarityLabel(featuredItem.rarity)}
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
                    <SparklesIcon className="h-5 w-5 text-purple-500" />
                    <span className="font-bold text-lg">{featuredItem.price}</span>
                    {featuredItem.discount && (
                      <span className="text-sm text-muted-foreground line-through ml-1">
                        {Math.round(featuredItem.price / (1 - featuredItem.discount / 100))}
                      </span>
                    )}
                  </div>
                  <Button>
                    <ShoppingBagIcon className="h-4 w-4 mr-1" />
                    Köp nu
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
            placeholder="Sök i butiken..."
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
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex-shrink-0"
            >
              <Icon className="h-4 w-4 mr-1" />
              {category.name}
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
                  {item.isNew && <Badge variant="accent" size="sm">Ny!</Badge>}
                  <Badge
                    variant={getRarityColor(item.rarity) as 'warning' | 'primary' | 'accent' | 'default'}
                    size="sm"
                  >
                    {getRarityLabel(item.rarity)}
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
                <Button size="sm" variant="outline">
                  Köp
                </Button>
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
            <h3 className="font-semibold text-foreground mb-2">Inga artiklar hittades</h3>
            <p className="text-muted-foreground text-sm">
              Prova att ändra din sökning eller filtrera efter en annan kategori.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
