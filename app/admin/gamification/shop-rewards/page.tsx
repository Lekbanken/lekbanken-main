'use client';

import { useState, useMemo } from "react";
import {
  ShoppingBagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  GiftIcon,
  SparklesIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button, Card, CardContent, Badge, Input, EmptyState } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";

type ItemStatus = "active" | "draft" | "sold_out" | "archived";
type ItemCategory = "cosmetic" | "powerup" | "bundle" | "reward";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: ItemCategory;
  price: number;
  currency: "dicecoin" | "xp";
  status: ItemStatus;
  stock: number | null;
  sold: number;
  isFeatured: boolean;
  createdAt: string;
}

const statusConfig: Record<ItemStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Aktiv", variant: "default" },
  draft: { label: "Utkast", variant: "secondary" },
  sold_out: { label: "Slutsåld", variant: "destructive" },
  archived: { label: "Arkiverad", variant: "outline" },
};

const categoryConfig: Record<ItemCategory, { label: string; icon: React.ReactNode }> = {
  cosmetic: { label: "Kosmetisk", icon: <SparklesIcon className="h-4 w-4" /> },
  powerup: { label: "Power-up", icon: <SparklesIcon className="h-4 w-4" /> },
  bundle: { label: "Paket", icon: <GiftIcon className="h-4 w-4" /> },
  reward: { label: "Belöning", icon: <GiftIcon className="h-4 w-4" /> },
};

// Mock data
const mockItems: ShopItem[] = [
  {
    id: "1",
    name: "Guldram",
    description: "En gyllene ram för din profil",
    imageUrl: null,
    category: "cosmetic",
    price: 500,
    currency: "dicecoin",
    status: "active",
    stock: null,
    sold: 234,
    isFeatured: true,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "2x XP Boost",
    description: "Dubbla XP i 24 timmar",
    imageUrl: null,
    category: "powerup",
    price: 1000,
    currency: "dicecoin",
    status: "active",
    stock: 100,
    sold: 89,
    isFeatured: false,
    createdAt: "2024-01-20",
  },
  {
    id: "3",
    name: "Starter Pack",
    description: "500 DiceCoin + 2x XP Boost + Exklusiv badge",
    imageUrl: null,
    category: "bundle",
    price: 1500,
    currency: "dicecoin",
    status: "active",
    stock: 50,
    sold: 45,
    isFeatured: true,
    createdAt: "2024-02-01",
  },
  {
    id: "4",
    name: "VIP-badge",
    description: "Exklusiv VIP-badge för din profil",
    imageUrl: null,
    category: "reward",
    price: 2000,
    currency: "dicecoin",
    status: "active",
    stock: null,
    sold: 56,
    isFeatured: false,
    createdAt: "2024-02-10",
  },
  {
    id: "5",
    name: "Begränsad julhatt",
    description: "Säsongsexklusiv julhatt",
    imageUrl: null,
    category: "cosmetic",
    price: 300,
    currency: "dicecoin",
    status: "sold_out",
    stock: 100,
    sold: 100,
    isFeatured: false,
    createdAt: "2023-12-01",
  },
];

export default function ShopRewardsPage() {
  useAuth();
  const { currentTenant: _currentTenant } = useTenant();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">("all");

  const filteredItems = useMemo(() => {
    return mockItems.filter((item) => {
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  const stats = useMemo(() => ({
    totalItems: mockItems.length,
    activeItems: mockItems.filter(i => i.status === "active").length,
    totalSold: mockItems.reduce((sum, i) => sum + i.sold, 0),
    revenue: mockItems.reduce((sum, i) => sum + (i.sold * i.price), 0),
  }), []);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Gamification hub", href: "/admin/gamification" },
          { label: "Shop & Rewards" },
        ]}
      />

      <AdminPageHeader
        title="Shop & Rewards"
        description="Hantera butik, belöningar, priser och tillgänglighetsregler."
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Lägg till item
          </Button>
        }
      />

      {/* Stats */}
      <AdminStatGrid cols={4} className="mb-6">
        <AdminStatCard
          label="Totalt items"
          value={stats.totalItems}
          icon={<ShoppingBagIcon className="h-5 w-5" />}
          iconColor="primary"
        />
        <AdminStatCard
          label="Aktiva"
          value={stats.activeItems}
          icon={<TagIcon className="h-5 w-5" />}
          iconColor="green"
        />
        <AdminStatCard
          label="Totalt sålt"
          value={stats.totalSold.toLocaleString()}
          icon={<GiftIcon className="h-5 w-5" />}
          iconColor="blue"
        />
        <AdminStatCard
          label="Intäkter (DiceCoin)"
          value={stats.revenue.toLocaleString()}
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          iconColor="amber"
        />
      </AdminStatGrid>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            Alla
          </Button>
          {(Object.keys(categoryConfig) as ItemCategory[]).map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {categoryConfig[cat].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<ShoppingBagIcon className="h-12 w-12" />}
          title="Inga items hittades"
          description={searchQuery ? "Försök med en annan sökning." : "Lägg till ditt första item."}
          action={{ label: "Lägg till item", onClick: () => {} }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group cursor-pointer transition-all hover:border-primary hover:shadow-md">
              <CardContent className="p-4">
                {/* Image placeholder */}
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-muted">
                  <ShoppingBagIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>

                {/* Header */}
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {item.isFeatured && (
                        <SparklesIcon className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <Badge variant="outline" className="mt-1">
                      {categoryConfig[item.category].label}
                    </Badge>
                  </div>
                  <Badge variant={statusConfig[item.status].variant}>
                    {statusConfig[item.status].label}
                  </Badge>
                </div>

                {/* Description */}
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{item.description}</p>

                {/* Price and stats */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1">
                    <CurrencyDollarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-foreground">{item.price.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.currency === "dicecoin" ? "DC" : "XP"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Sålt</p>
                    <p className="font-semibold">{item.sold}</p>
                  </div>
                </div>

                {/* Stock indicator */}
                {item.stock !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Lager</span>
                      <span>{item.stock - item.sold} kvar</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((item.stock - item.sold) / item.stock) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
