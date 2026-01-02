'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@/components/ui';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import {
  getShopItems,
  getVirtualCurrencies,
  getMarketplaceStats,
  getTopSellingItems,
  type ShopItem,
  type MarketplaceStats,
  type VirtualCurrency,
} from '@/lib/services/marketplaceService';

const ITEM_CATEGORIES = ['cosmetic', 'powerup', 'bundle', 'season_pass'];

function baseItemCategory(category: string): string {
  const raw = typeof category === 'string' ? category : '';
  const base = raw.includes(':') ? raw.split(':', 1)[0] : raw;
  return base || raw;
}

interface FormData {
  name: string;
  description: string;
  category: string;
  price: number;
  currency_id: string;
  quantity_limit: number | null;
  is_featured: boolean;
  image_url?: string | null;

  // Unlocks
  min_level?: number | null;

  // Bundle metadata (only used when base category === 'bundle')
  bundle_items_json?: string;

  // Powerup metadata (only used when category === 'powerup')
  powerup_effect_type?: string;
  powerup_multiplier?: number | null;
  powerup_duration_seconds?: number | null;
}

export default function MarketplaceAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [topItems, setTopItems] = useState<ShopItem[]>([]);
  const [currencies, setCurrencies] = useState<VirtualCurrency[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'items' | 'analytics'>('stats');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: 'cosmetic',
    price: 100,
    currency_id: '',
    quantity_limit: null,
    is_featured: false,
    image_url: null,

    min_level: null,

    powerup_effect_type: 'coin_multiplier',
    powerup_multiplier: 2,
    powerup_duration_seconds: 86400,

    bundle_items_json: '[]',
  });

  useEffect(() => {
    if (!currentTenant) return;

    const loadData = async () => {
      try {
        const [itemsData, statsData, topItemsData, currenciesData] = await Promise.all([
          getShopItems(currentTenant.id),
          getMarketplaceStats(currentTenant.id),
          getTopSellingItems(currentTenant.id),
          getVirtualCurrencies(currentTenant.id),
        ]);

        setItems(itemsData || []);
        setStats(statsData);
        setTopItems(topItemsData || []);
        setCurrencies(currenciesData || []);

        if (currenciesData && currenciesData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            currency_id: prev.currency_id || currenciesData[0].id,
          }));
        }
      } catch (err) {
        console.error('Error loading marketplace data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentTenant]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData((prev) => ({
      name: '',
      description: '',
      category: 'cosmetic',
      price: 100,
      currency_id: currencies[0]?.id ?? prev.currency_id,
      quantity_limit: null,
      is_featured: false,
      image_url: null,

      min_level: null,

      powerup_effect_type: 'coin_multiplier',
      powerup_multiplier: 2,
      powerup_duration_seconds: 86400,

      bundle_items_json: '[]',
    }));
    setShowItemModal(true);
  };

  const openEditModal = (item: ShopItem) => {
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;
    const bundleItems = (metadata.bundleItems ?? []) as unknown;
    const bundleItemsJson = (() => {
      try {
        return JSON.stringify(bundleItems, null, 2);
      } catch {
        return '[]';
      }
    })();

    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description ?? '',
      category: item.category,
      price: item.price,
      currency_id: item.currency_id,
      quantity_limit: item.quantity_limit,
      is_featured: item.is_featured,
      image_url: item.image_url,

      min_level:
        readMetadataNumber(metadata, 'minLevel') ??
        readMetadataNumber(metadata, 'min_level') ??
        null,

      powerup_effect_type: typeof metadata.effectType === 'string' ? metadata.effectType : 'coin_multiplier',
      powerup_multiplier: typeof metadata.multiplier === 'number' ? metadata.multiplier : 2,
      powerup_duration_seconds: typeof metadata.durationSeconds === 'number' ? metadata.durationSeconds : 86400,

      bundle_items_json: bundleItemsJson,
    });
    setShowItemModal(true);
  };

  const buildMetadata = (data: FormData) => {
    const base = baseItemCategory(data.category);

    const minLevel =
      typeof data.min_level === 'number' && Number.isFinite(data.min_level) && data.min_level > 1
        ? Math.floor(data.min_level)
        : undefined;

    if (base === 'bundle') {
      const raw = (data.bundle_items_json || '').trim();
      if (!raw) throw new Error('bundle_items_json is required');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('bundle_items_json must be valid JSON');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('bundleItems must be a non-empty array');
      }

      return { ...(minLevel ? { minLevel } : {}), bundleItems: parsed };
    }

    if (base !== 'powerup') return { ...(minLevel ? { minLevel } : {}) };

    const effectType = (data.powerup_effect_type || '').trim();
    const multiplier = data.powerup_multiplier ?? null;
    const durationSeconds = data.powerup_duration_seconds ?? null;

    return {
      ...(minLevel ? { minLevel } : {}),
      ...(effectType ? { effectType } : {}),
      ...(typeof multiplier === 'number' && Number.isFinite(multiplier) ? { multiplier } : {}),
      ...(typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
        ? { durationSeconds }
        : {}),
    };
  };

  const readMetadataString = (metadata: Record<string, unknown>, key: string): string | null => {
    const value = metadata[key];
    return typeof value === 'string' ? value : null;
  };

  const readMetadataNumber = (metadata: Record<string, unknown>, key: string): number | null => {
    const value = metadata[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };

  const formatDurationSeconds = (seconds: number | null): string => {
    if (seconds === null) return '—';
    if (!Number.isFinite(seconds) || seconds <= 0) return `${seconds}s`;

    if (seconds % 3600 === 0) return `${seconds / 3600}h`;
    if (seconds % 60 === 0) return `${seconds / 60}m`;
    return `${seconds}s`;
  };

  const readApiError = async (res: Response) => {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await res.json().catch(() => null);
      return { status: res.status, statusText: res.statusText, contentType, json, text: null as string | null };
    }

    const text = await res.text().catch(() => null);
    return { status: res.status, statusText: res.statusText, contentType, json: null as unknown, text };
  };

  const handleSaveItem = async () => {
    if (!user || !currentTenant) return;

    try {
      const metadata = buildMetadata(formData);

      if (editingItem) {
        const res = await fetch('/api/admin/marketplace/items', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId: currentTenant.id,
            itemId: editingItem.id,
            updates: {
              name: formData.name,
              description: formData.description,
              category: formData.category,
              price: formData.price,
              currency_id: formData.currency_id,
              quantity_limit: formData.quantity_limit,
              is_featured: formData.is_featured,
              image_url: formData.image_url || null,
              metadata,
            },
          }),
        });

        if (!res.ok) {
          console.error('Failed to update item', await readApiError(res));
          return;
        }

        const json = (await res.json().catch(() => null)) as { item?: ShopItem } | null;
        const updated = json?.item ?? null;

        if (updated) {
          setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setShowItemModal(false);
          setEditingItem(null);
        }
        return;
      }

      const res = await fetch('/api/admin/marketplace/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          item: {
            name: formData.name,
            description: formData.description,
            category: formData.category,
            price: formData.price,
            currency_id: formData.currency_id,
            quantity_limit: formData.quantity_limit,
            is_featured: formData.is_featured,
            image_url: formData.image_url || null,
            metadata,
            is_available: true,
            sort_order: items.length,
          },
        }),
      });

      if (!res.ok) {
        console.error('Failed to create item', await readApiError(res));
        return;
      }

      const json = (await res.json().catch(() => null)) as { item?: ShopItem } | null;
      const newItem = json?.item ?? null;

      if (newItem) {
        setItems((prev) => [...prev, newItem]);
        setShowItemModal(false);
      }
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const handleFeatureItem = async (item: ShopItem) => {
    try {
      if (!currentTenant) return;

      const res = await fetch('/api/admin/marketplace/items', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          itemId: item.id,
          updates: { is_featured: !item.is_featured },
        }),
      });

      if (!res.ok) {
        console.error('Failed to update item', await readApiError(res));
        return;
      }

      const json = (await res.json().catch(() => null)) as { item?: ShopItem } | null;
      const updated = json?.item ?? null;

      if (updated) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? updated : i))
        );
      }
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  if (!currentTenant) return <div className="p-4 text-muted-foreground">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBagIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Marketplace Admin</h1>
          </div>
          <p className="text-muted-foreground">Manage shop items, currency, and promotions</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {['stats', 'items', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'stats' | 'items' | 'analytics')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {loading ? (
              <p className="text-muted-foreground">Loading stats...</p>
            ) : (
              <>
                {/* Stats Grid */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Purchases</p>
                        <p className="text-3xl font-bold text-foreground">{stats.total_purchases}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Revenue</p>
                        <p className="text-3xl font-bold text-green-500">${stats.total_revenue}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Avg Purchase</p>
                        <p className="text-3xl font-bold text-primary">${stats.average_purchase_value.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Items</p>
                        <p className="text-3xl font-bold text-accent">{items.length}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <Button
              onClick={openCreateModal}
            >
              Add New Item
            </Button>

            {/* Item Modal */}
            {showItemModal && (
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Input
                      type="text"
                      placeholder="Item Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="bg-muted border border-border text-foreground px-3 py-2 rounded-lg"
                    >
                      {formData.category && !ITEM_CATEGORIES.includes(formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                    <select
                      value={formData.currency_id}
                      onChange={(e) => setFormData({ ...formData, currency_id: e.target.value })}
                      className="bg-muted border border-border text-foreground px-3 py-2 rounded-lg"
                    >
                      {currencies.length === 0 ? (
                        <option value="">No currencies</option>
                      ) : (
                        currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </option>
                        ))
                      )}
                    </select>
                    <Input
                      type="number"
                      placeholder="Quantity Limit (optional)"
                      value={formData.quantity_limit || ''}
                      onChange={(e) => setFormData({ ...formData, quantity_limit: e.target.value ? Number(e.target.value) : null })}
                    />

                    <Input
                      type="number"
                      placeholder="Min level (optional)"
                      value={formData.min_level ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          min_level: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>

                  {baseItemCategory(formData.category) === 'powerup' && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Input
                        type="text"
                        placeholder="Powerup effectType (e.g. coin_multiplier)"
                        value={formData.powerup_effect_type || ''}
                        onChange={(e) => setFormData({ ...formData, powerup_effect_type: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Multiplier (e.g. 2)"
                        value={formData.powerup_multiplier ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            powerup_multiplier: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Duration seconds (e.g. 86400)"
                        value={formData.powerup_duration_seconds ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            powerup_duration_seconds: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <div className="col-span-2 -mt-2 text-sm text-muted-foreground">
                        Visas som: {formatDurationSeconds(formData.powerup_duration_seconds ?? null)}
                      </div>
                    </div>
                  )}

                  {baseItemCategory(formData.category) === 'bundle' && (
                    <textarea
                      placeholder='Bundle items JSON, e.g. [{"shopItemId":"...","quantity":1}]'
                      value={formData.bundle_items_json || ''}
                      onChange={(e) => setFormData({ ...formData, bundle_items_json: e.target.value })}
                      className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-lg mb-4 resize-none font-mono"
                      rows={5}
                    />
                  )}

                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-muted border border-border text-foreground px-3 py-2 rounded-lg mb-4 resize-none"
                    rows={3}
                  />
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-foreground">Featured Item</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveItem}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {editingItem ? 'Save Changes' : 'Save Item'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowItemModal(false);
                        setEditingItem(null);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items List */}
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex justify-between items-start">
                    <div>
                      <h3 className="text-foreground font-bold flex items-center gap-2">
                        {item.name}
                        {item.is_featured && <Badge variant="warning">Featured</Badge>}
                      </h3>
                      <p className="text-muted-foreground text-sm">{item.category} • ${item.price}</p>
                      {baseItemCategory(item.category) === 'powerup' && (
                        <p className="text-muted-foreground text-sm mt-1">
                          {(() => {
                            const metadata = (item.metadata ?? {}) as Record<string, unknown>;
                            const effectType = readMetadataString(metadata, 'effectType');
                            const multiplier = readMetadataNumber(metadata, 'multiplier');
                            const durationSeconds = readMetadataNumber(metadata, 'durationSeconds');

                            return (
                              <>
                                Effect: {effectType ?? '—'}
                                {multiplier !== null ? ` • x${multiplier}` : ''}
                                {durationSeconds !== null ? ` • ${formatDurationSeconds(durationSeconds)}` : ''}
                              </>
                            );
                          })()}
                        </p>
                      )}
                      {item.description && <p className="text-foreground mt-1">{item.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openEditModal(item)}
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleFeatureItem(item)}
                        variant={item.is_featured ? 'default' : 'outline'}
                        className={item.is_featured ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                      >
                        {item.is_featured ? 'Unfeature' : 'Feature'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Selling Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topItems.slice(0, 10).map((item, idx) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-b-0">
                      <span className="text-foreground">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-accent font-bold">${item.price}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
  );
}
