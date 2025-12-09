'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { Badge, Button, Card, CardContent, Input } from '@/components/ui'
import {
  ShoppingBagIcon,
  SparklesIcon,
  CurrencyDollarIcon,
  TagIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  GiftIcon,
  StarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

export default function ShopSandboxPage() {
  return (
    <SandboxShell
      moduleId="app-shop"
      title="Shop"
      description="Preview av butik-komponenter för app-sektionen"
    >
      <div className="space-y-8">
        {/* Currency Balances */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Currency Balances</h2>
          <div className="flex gap-4 max-w-md">
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Mynt</div>
                  <div className="text-xl font-bold text-gray-900">1,250</div>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Gems</div>
                  <div className="text-xl font-bold text-gray-900">35</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Featured Item Card */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Featured Item Card</h2>
          <Card className="overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-yellow-100/50 border-2 border-yellow-300 max-w-2xl">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <GiftIcon className="h-16 w-16 text-primary/50" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="warning" className="flex items-center gap-1">
                        <StarSolidIcon className="h-3 w-3" />
                        Utvalt
                      </Badge>
                      <Badge variant="warning">Legendarisk</Badge>
                      <Badge variant="destructive">-20%</Badge>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Vinter-bundle</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Innehåller snöflingor-avatar, vintertema och 3x XP-boost
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1">
                      <SparklesIcon className="h-5 w-5 text-purple-500" />
                      <span className="font-bold text-lg">50</span>
                      <span className="text-sm text-gray-400 line-through ml-1">63</span>
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
        </section>

        {/* Search & Filter */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Search & Filter</h2>
          <div className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input placeholder="Sök i butiken..." className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm">
                <Squares2X2Icon className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <BoltIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Category Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Category Buttons</h2>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" size="sm">
              <Squares2X2Icon className="h-4 w-4 mr-1" />
              Alla
            </Button>
            <Button variant="outline" size="sm">
              <SparklesIcon className="h-4 w-4 mr-1" />
              Utseende
            </Button>
            <Button variant="outline" size="sm">
              <BoltIcon className="h-4 w-4 mr-1" />
              Power-ups
            </Button>
            <Button variant="outline" size="sm">
              <GiftIcon className="h-4 w-4 mr-1" />
              Bundles
            </Button>
            <Button variant="outline" size="sm">
              <StarIcon className="h-4 w-4 mr-1" />
              Säsongspass
            </Button>
          </div>
        </section>

        {/* Item Cards Grid */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Item Cards (Grid)</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 max-w-2xl">
            {/* Epic Item with New badge */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center">
                <TagIcon className="h-10 w-10 text-gray-400" />
              </div>
              <CardContent className="p-3">
                <div className="flex gap-1 mb-1">
                  <Badge variant="accent" size="sm">Ny!</Badge>
                  <Badge variant="primary" size="sm">Episk</Badge>
                </div>
                <h3 className="font-medium text-gray-900 text-sm">Gyllene Avatar-ram</h3>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-sm">500</span>
                  </div>
                  <Button size="sm" variant="outline">Köp</Button>
                </div>
              </CardContent>
            </Card>

            {/* Rare Item */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center">
                <BoltIcon className="h-10 w-10 text-gray-400" />
              </div>
              <CardContent className="p-3">
                <div className="flex gap-1 mb-1">
                  <Badge variant="accent" size="sm">Sällsynt</Badge>
                </div>
                <h3 className="font-medium text-gray-900 text-sm">XP-boost (24h)</h3>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-sm">200</span>
                  </div>
                  <Button size="sm" variant="outline">Köp</Button>
                </div>
              </CardContent>
            </Card>

            {/* Common Item */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-32 flex items-center justify-center">
                <SparklesIcon className="h-10 w-10 text-gray-400" />
              </div>
              <CardContent className="p-3">
                <div className="flex gap-1 mb-1">
                  <Badge variant="default" size="sm">Vanlig</Badge>
                </div>
                <h3 className="font-medium text-gray-900 text-sm">Regnbågs-emoji</h3>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-sm">150</span>
                  </div>
                  <Button size="sm" variant="outline">Köp</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Rarity Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Rarity Badges</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">Legendarisk</Badge>
            <Badge variant="primary">Episk</Badge>
            <Badge variant="accent">Sällsynt</Badge>
            <Badge variant="default">Vanlig</Badge>
            <Badge variant="destructive">-20%</Badge>
            <Badge variant="accent">Ny!</Badge>
          </div>
        </section>

        {/* Empty State */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Empty State</h2>
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Inga artiklar hittades</h3>
              <p className="text-gray-600 text-sm">
                Prova att ändra din sökning eller filtrera efter en annan kategori.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Notes */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Valuta-display med CurrencyDollar-ikon</li>
            <li>Rarity badges: Legendarisk, Episk, Sällsynt, Vanlig</li>
            <li>Artikelkort med gradient-bakgrund</li>
            <li>Köp-knapp och priser</li>
          </ul>

          <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
        </div>
      </div>
    </SandboxShell>
  )
}
