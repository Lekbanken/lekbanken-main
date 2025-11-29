'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  getShopItems,
  createShopItem,
  updateShopItem,
  getMarketplaceStats,
  getTopSellingItems,
  ShopItem,
  MarketplaceStats,
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

  if (!currentTenant) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Marketplace Admin</h1>
          <p className="text-slate-300">Manage shop items, currency, and promotions</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-700">
          {['stats', 'items', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'stats' | 'items' | 'analytics')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
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
              <p className="text-slate-300">Loading stats...</p>
            ) : (
              <>
                {/* Stats Grid */}
                {stats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                      <p className="text-slate-400 text-sm mb-2">Total Purchases</p>
                      <p className="text-3xl font-bold text-white">{stats.total_purchases}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                      <p className="text-slate-400 text-sm mb-2">Revenue</p>
                      <p className="text-3xl font-bold text-green-400">${stats.total_revenue}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                      <p className="text-slate-400 text-sm mb-2">Avg Purchase</p>
                      <p className="text-3xl font-bold text-blue-400">${stats.average_purchase_value.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                      <p className="text-slate-400 text-sm mb-2">Total Items</p>
                      <p className="text-3xl font-bold text-purple-400">{items.length}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowItemModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition"
            >
              Add New Item
            </button>

            {/* Item Modal */}
            {showItemModal && (
              <div className="bg-slate-700 rounded-lg p-6 border border-slate-600">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded"
                  />
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded"
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Quantity Limit (optional)"
                    value={formData.quantity_limit || ''}
                    onChange={(e) => setFormData({ ...formData, quantity_limit: e.target.value ? Number(e.target.value) : null })}
                    className="bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 text-white px-3 py-2 rounded mb-4 resize-none"
                  rows={3}
                />
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Featured Item</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddItem}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded transition"
                  >
                    Save Item
                  </button>
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-6 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-bold flex items-center gap-2">
                      {item.name}
                      {item.is_featured && <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">Featured</span>}
                    </h3>
                    <p className="text-slate-400 text-sm">{item.category} • ${item.price}</p>
                    {item.description && <p className="text-slate-300 mt-1">{item.description}</p>}
                  </div>
                  <button
                    onClick={() => handleFeatureItem(item)}
                    className={`${
                      item.is_featured
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-slate-600 hover:bg-slate-700'
                    } text-white font-medium py-1 px-4 rounded transition`}
                  >
                    {item.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Top Selling Items</h2>
              <div className="space-y-2">
                {topItems.slice(0, 10).map((item, idx) => (
                  <div key={item.id} className="bg-slate-700 rounded p-3 border border-slate-600 flex justify-between items-center">
                    <span className="text-slate-300">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="text-yellow-400 font-bold">${item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
