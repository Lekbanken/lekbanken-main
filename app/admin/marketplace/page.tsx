'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@/components/ui';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import {
  getShopItems,
  createShopItem,
  updateShopItem,
  getMarketplaceStats,
  getTopSellingItems,
  type ShopItem,
  type MarketplaceStats,
} from '@/lib/services/marketplaceService';

const ITEM_CATEGORIES = ['cosmetic', 'powerup', 'bundle', 'season_pass'];

interface FormData {
  name: string;
  description: string;
  category: string;
  price: number;
  currency_id: string;
  quantity_limit: number | null;
  is_featured: boolean;
  image_url?: string | null;
}

export default function MarketplaceAdminPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [topItems, setTopItems] = useState<ShopItem[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'items' | 'analytics'>('stats');
  const [showItemModal, setShowItemModal] = useState(false);
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
  });

  useEffect(() => {
    if (!currentTenant) return;

    const loadData = async () => {
      try {
        const [itemsData, statsData, topItemsData] = await Promise.all([
          getShopItems(currentTenant.id),
          getMarketplaceStats(currentTenant.id),
          getTopSellingItems(currentTenant.id),
        ]);

        setItems(itemsData || []);
        setStats(statsData);
        setTopItems(topItemsData || []);
      } catch (err) {
        console.error('Error loading marketplace data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentTenant]);

  const handleAddItem = async () => {
    if (!user || !currentTenant) return;

    try {
      const newItem = await createShopItem(currentTenant.id, user.id, {
        ...formData,
        image_url: formData.image_url || null,
        metadata: {},
        is_available: true,
        sort_order: items.length,
      });

      if (newItem) {
        setItems((prev) => [...prev, newItem]);
        setFormData({
          name: '',
          description: '',
          category: 'cosmetic',
          price: 100,
          currency_id: '',
          quantity_limit: null,
          is_featured: false,
          image_url: null,
        });
        setShowItemModal(false);
      }
    } catch (err) {
      console.error('Error creating item:', err);
    }
  };

  const handleFeatureItem = async (item: ShopItem) => {
    try {
      const updated = await updateShopItem(item.id, {
        is_featured: !item.is_featured,
      });

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
              onClick={() => setShowItemModal(true)}
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
                    <Input
                      type="number"
                      placeholder="Quantity Limit (optional)"
                      value={formData.quantity_limit || ''}
                      onChange={(e) => setFormData({ ...formData, quantity_limit: e.target.value ? Number(e.target.value) : null })}
                    />
                  </div>
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
                      onClick={handleAddItem}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Save Item
                    </Button>
                    <Button
                      onClick={() => setShowItemModal(false)}
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
                      {item.description && <p className="text-foreground mt-1">{item.description}</p>}
                    </div>
                    <Button
                      onClick={() => handleFeatureItem(item)}
                      variant={item.is_featured ? 'default' : 'outline'}
                      className={item.is_featured ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                      {item.is_featured ? 'Unfeature' : 'Feature'}
                    </Button>
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
