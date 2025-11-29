'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { getShopItems, getUserCurrencyBalances, purchaseShopItem, ShopItem, UserCurrencyBalance } from '@/lib/services/marketplaceService';

const SHOP_CATEGORIES = ['cosmetic', 'powerup', 'bundle', 'season_pass'];

export default function ShopPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [balances, setBalances] = useState<UserCurrencyBalance[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('cosmetic');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadData = async () => {
      try {
        const [itemsData, balancesData] = await Promise.all([
          getShopItems(currentTenant.id, { category: selectedCategory, onlyAvailable: true }),
          getUserCurrencyBalances(user.id, currentTenant.id),
        ]);

        setItems(itemsData || []);
        setBalances(balancesData || []);
      } catch (err) {
        console.error('Error loading shop data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, currentTenant, selectedCategory]);

  const handlePurchase = async (item: ShopItem) => {
    if (!user || !currentTenant) return;

    setPurchasing(item.id);
    try {
      const result = await purchaseShopItem(currentTenant.id, user.id, item.id, 1);
      if (result) {
        setBalances((prev) =>
          prev.map((b) =>
            b.id === result.newBalance.id ? result.newBalance : b
          )
        );
      }
    } catch (err) {
      console.error('Error purchasing item:', err);
    } finally {
      setPurchasing(null);
    }
  };

  if (!currentTenant) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Shop</h1>
          <p className="text-purple-200">Browse and purchase items</p>
        </div>

        {/* Currency Balances */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {balances.map((balance) => (
            <div key={balance.id} className="bg-white/10 border border-purple-400 rounded-lg p-4">
              <p className="text-sm text-gray-300 mb-2">Balance</p>
              <p className="text-2xl font-bold text-white">{balance.balance}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SHOP_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded font-medium transition ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'border border-purple-400 text-purple-200 hover:bg-purple-700/30'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Shop Items Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-300">Loading shop...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/10 border border-purple-400 rounded-lg overflow-hidden hover:border-purple-300 transition"
                >
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-bold text-lg">{item.name}</h3>
                        {item.description && (
                          <p className="text-purple-200 text-sm">{item.description}</p>
                        )}
                      </div>
                      {item.is_featured && (
                        <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-yellow-400">{item.price}</span>
                      {item.quantity_limit && (
                        <span className="text-sm text-gray-300">
                          {item.quantity_limit - item.quantity_sold} left
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePurchase(item)}
                      disabled={purchasing === item.id || !item.is_available}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 rounded transition"
                    >
                      {purchasing === item.id ? 'Purchasing...' : 'Purchase'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-300 text-lg">No items available in this category</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
