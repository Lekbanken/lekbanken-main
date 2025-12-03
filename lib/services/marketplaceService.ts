/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';

// Types
export interface VirtualCurrency {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  symbol: string | null;
  exchange_rate: number;
  is_premium: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCurrencyBalance {
  id: string;
  tenant_id: string;
  user_id: string;
  currency_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  last_transaction_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopItem {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price: number;
  currency_id: string;
  quantity_limit: number | null;
  quantity_sold: number;
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

export interface UserPurchase {
  id: string;
  tenant_id: string;
  user_id: string;
  shop_item_id: string;
  quantity: number;
  price_paid: number;
  currency_id: string;
  is_gift: boolean;
  gifted_from_user_id: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  tenant_id: string;
  code: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  max_uses: number | null;
  times_used: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceStats {
  total_purchases: number;
  total_revenue: number;
  unique_buyers: number;
  average_purchase_value: number;
}

// Virtual Currencies
export async function getVirtualCurrencies(tenantId: string): Promise<VirtualCurrency[] | null> {
  try {
    const query = supabase.from('virtual_currencies' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching virtual currencies:', error);
      return null;
    }

    return (data as VirtualCurrency[]) || [];
  } catch (err) {
    console.error('Error fetching virtual currencies:', err);
    return null;
  }
}

// User Currency Balances
export async function getUserCurrencyBalances(userId: string, tenantId: string): Promise<UserCurrencyBalance[] | null> {
  try {
    const query = supabase.from('user_currency_balances' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching currency balances:', error);
      return null;
    }

    return (data as UserCurrencyBalance[]) || [];
  } catch (err) {
    console.error('Error fetching currency balances:', err);
    return null;
  }
}

export async function addCurrency(
  tenantId: string,
  userId: string,
  currencyId: string,
  amount: number
): Promise<UserCurrencyBalance | null> {
  try {
    // Get or create balance
    const query = supabase.from('user_currency_balances' as any) as any;
    const { data: balance, error: fetchError } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('currency_id', currencyId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching balance:', fetchError);
      return null;
    }

    if (!balance) {
      // Create new balance
      const createQuery = supabase.from('user_currency_balances' as any) as any;
      const { data: newBalance, error: createError } = await createQuery
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          currency_id: currencyId,
          balance: amount,
          total_earned: amount,
          last_transaction_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating balance:', createError);
        return null;
      }

      return newBalance as UserCurrencyBalance;
    }

    // Update existing balance
    const updateQuery = supabase.from('user_currency_balances' as any) as any;
    const { data: updated, error: updateError } = await updateQuery
      .update({
        balance: (balance.balance as number) + amount,
        total_earned: (balance.total_earned as number) + amount,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', balance.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return null;
    }

    return updated as UserCurrencyBalance;
  } catch (err) {
    console.error('Error adding currency:', err);
    return null;
  }
}

export async function spendCurrency(
  tenantId: string,
  userId: string,
  currencyId: string,
  amount: number
): Promise<UserCurrencyBalance | null> {
  try {
    const query = supabase.from('user_currency_balances' as any) as any;
    const { data: balance, error: fetchError } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('currency_id', currencyId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError) {
      console.error('Error fetching balance:', fetchError);
      return null;
    }

    if ((balance.balance as number) < amount) {
      console.error('Insufficient balance');
      return null;
    }

    const updateQuery = supabase.from('user_currency_balances' as any) as any;
    const { data: updated, error: updateError } = await updateQuery
      .update({
        balance: (balance.balance as number) - amount,
        total_spent: (balance.total_spent as number) + amount,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', balance.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating balance:', updateError);
      return null;
    }

    return updated as UserCurrencyBalance;
  } catch (err) {
    console.error('Error spending currency:', err);
    return null;
  }
}

// Shop Items
export async function getShopItems(
  tenantId: string,
  filter?: { category?: string; onlyFeatured?: boolean; onlyAvailable?: boolean }
): Promise<ShopItem[] | null> {
  try {
    let query = supabase.from('shop_items' as any) as any;

    query = query.select('*').eq('tenant_id', tenantId);

    if (filter?.category) query = query.eq('category', filter.category);
    if (filter?.onlyFeatured) query = query.eq('is_featured', true);
    if (filter?.onlyAvailable) query = query.eq('is_available', true);

    query = query.order('sort_order', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching shop items:', error);
      return null;
    }

    return (data as ShopItem[]) || [];
  } catch (err) {
    console.error('Error fetching shop items:', err);
    return null;
  }
}

export async function createShopItem(
  tenantId: string,
  userId: string,
  item: Omit<ShopItem, 'id' | 'tenant_id' | 'created_by_user_id' | 'created_at' | 'updated_at' | 'quantity_sold'>
): Promise<ShopItem | null> {
  try {
    const query = supabase.from('shop_items' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        created_by_user_id: userId,
        ...item,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shop item:', error);
      return null;
    }

    return data as ShopItem;
  } catch (err) {
    console.error('Error creating shop item:', err);
    return null;
  }
}

export async function updateShopItem(id: string, updates: Partial<ShopItem>): Promise<ShopItem | null> {
  try {
    const query = supabase.from('shop_items' as any) as any;
    const { data, error } = await query
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shop item:', error);
      return null;
    }

    return data as ShopItem;
  } catch (err) {
    console.error('Error updating shop item:', err);
    return null;
  }
}

// User Purchases
export async function getUserPurchases(userId: string, tenantId: string): Promise<UserPurchase[] | null> {
  try {
    const query = supabase.from('user_purchases' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      return null;
    }

    return (data as UserPurchase[]) || [];
  } catch (err) {
    console.error('Error fetching purchases:', err);
    return null;
  }
}

export async function purchaseShopItem(
  tenantId: string,
  userId: string,
  shopItemId: string,
  quantity: number = 1
): Promise<{ purchase: UserPurchase; newBalance: UserCurrencyBalance } | null> {
  try {
    // Get shop item
    const itemQuery = supabase.from('shop_items' as any) as any;
    const { data: item, error: itemError } = await itemQuery
      .select('*')
      .eq('id', shopItemId)
      .single();

    if (itemError) {
      console.error('Error fetching shop item:', itemError);
      return null;
    }

    const shopItem = item as ShopItem;

    // Check quantity limit
    if (shopItem.quantity_limit && shopItem.quantity_sold >= shopItem.quantity_limit) {
      console.error('Item out of stock');
      return null;
    }

    // Spend currency
    const newBalance = await spendCurrency(tenantId, userId, shopItem.currency_id, shopItem.price * quantity);

    if (!newBalance) {
      console.error('Insufficient currency');
      return null;
    }

    // Record purchase
    const purchaseQuery = supabase.from('user_purchases' as any) as any;
    const { data: purchase, error: purchaseError } = await purchaseQuery
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        shop_item_id: shopItemId,
        quantity,
        price_paid: shopItem.price,
        currency_id: shopItem.currency_id,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError);
      return null;
    }

    // Update quantity sold
    await updateShopItem(shopItemId, {
      quantity_sold: shopItem.quantity_sold + quantity,
    });

    return { purchase: purchase as UserPurchase, newBalance };
  } catch (err) {
    console.error('Error purchasing item:', err);
    return null;
  }
}

// Promo Codes
export async function validatePromoCode(tenantId: string, code: string): Promise<PromoCode | null> {
  try {
    const query = supabase.from('promo_codes' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Promo code not found:', error);
      return null;
    }

    const promo = data as PromoCode;

    // Check validity period
    const now = new Date();
    if (new Date(promo.valid_from) > now || new Date(promo.valid_until) < now) {
      console.error('Promo code expired or not yet valid');
      return null;
    }

    // Check max uses
    if (promo.max_uses && promo.times_used >= promo.max_uses) {
      console.error('Promo code usage limit reached');
      return null;
    }

    return promo;
  } catch (err) {
    console.error('Error validating promo code:', err);
    return null;
  }
}

export async function applyPromoCode(promoId: string): Promise<boolean> {
  try {
    const query = supabase.from('promo_codes' as any) as any;
    const { data: promo, error: fetchError } = await query
      .select('*')
      .eq('id', promoId)
      .single();

    if (fetchError) {
      console.error('Error fetching promo:', fetchError);
      return false;
    }

    const updateQuery = supabase.from('promo_codes' as any) as any;
    const { error: updateError } = await updateQuery
      .update({
        times_used: (promo.times_used as number) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoId);

    if (updateError) {
      console.error('Error updating promo:', updateError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error applying promo code:', err);
    return false;
  }
}

// Marketplace Analytics
export async function getMarketplaceStats(tenantId: string, days: number = 30): Promise<MarketplaceStats | null> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const query = supabase.from('marketplace_analytics' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching marketplace stats:', error);
      return null;
    }

    // Calculate totals
    const totals: MarketplaceStats = {
      total_purchases: 0,
      total_revenue: 0,
      unique_buyers: 0,
      average_purchase_value: 0,
    };

    (data || []).forEach((stat: Record<string, unknown>) => {
      totals.total_purchases += (stat.total_purchases as number) || 0;
      totals.total_revenue += (stat.total_revenue as number) || 0;
    });

    if (data && data.length > 0) {
      totals.average_purchase_value = totals.total_revenue / data.length;
    }

    return totals;
  } catch (err) {
    console.error('Error calculating marketplace stats:', err);
    return null;
  }
}

export async function getTopSellingItems(tenantId: string, limit: number = 10): Promise<ShopItem[] | null> {
  try {
    const query = supabase.from('user_purchases' as any) as any;
    const { data, error } = await query
      .select('shop_item_id, shop_items(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top selling items:', error);
      return null;
    }

    const items: ShopItem[] = [];
    (data || []).forEach((p: Record<string, unknown>) => {
      if (p.shop_items) {
        items.push(p.shop_items as ShopItem);
      }
    });

    return items;
  } catch (err) {
    console.error('Error fetching top selling items:', err);
    return null;
  }
}
