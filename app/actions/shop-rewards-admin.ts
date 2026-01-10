'use server';

/**
 * Server Actions for Shop Rewards Admin
 * 
 * These actions handle CRUD operations for tenant-scoped shop items.
 * Accessible to: system_admin OR tenant owner/admin/editor
 * 
 * All actions validate tenant access via assertTenantAdminOrSystem.
 * 
 * Decision Log (Phase 1/2):
 * - D1: Using is_available only (no status enum migration)
 * - D2: Tenant selector required for system admin
 * - D3: owner/admin/editor can all CRUD
 * - D4: Keep existing stock model (quantity_limit + quantity_sold)
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertTenantAdminOrSystem, isSystemAdmin } from '@/lib/utils/tenantAuth';
import { z } from 'zod';
import type { Json } from '@/types/supabase';

// ============================================
// TYPES
// ============================================

export type ShopItemCategory = 'cosmetic' | 'powerup' | 'bundle' | 'season_pass';

export interface ShopItemRow {
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
  metadata: Json | null;
  created_at: string;
  updated_at: string | null;
  // Joined fields
  currency_name?: string | null;
  currency_symbol?: string | null;
}

export interface ShopItemListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: 'all' | ShopItemCategory;
  availability?: 'all' | 'available' | 'unavailable';
  featured?: 'all' | 'featured' | 'not_featured';
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'price' | 'quantity_sold';
  sortOrder?: 'asc' | 'desc';
}

export interface ShopItemListResult {
  data: ShopItemRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ShopItemStats {
  totalItems: number;
  availableItems: number;
  featuredItems: number;
  totalSold: number;
  totalRevenue: number;
}

export interface CurrencyOption {
  id: string;
  name: string;
  code: string;
  symbol: string | null;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const shopItemCreateSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(100),
  description: z.string().max(500).optional().nullable(),
  category: z.enum(['cosmetic', 'powerup', 'bundle', 'season_pass']),
  image_url: z.string().url().optional().nullable(),
  price: z.number().min(0, 'Pris måste vara 0 eller mer'),
  currency_id: z.string().uuid('Välj en valuta'),
  quantity_limit: z.number().int().min(1).optional().nullable(),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  metadata: z.any().optional().nullable(), // Json type
});

const shopItemUpdateSchema = shopItemCreateSchema.partial();

// ============================================
// LIST SHOP ITEMS
// ============================================

export async function listShopItems(
  tenantId: string,
  params: ShopItemListParams = {}
): Promise<ShopItemListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    category = 'all',
    availability = 'all',
    featured = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Authorization check
  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad: kräver organisationsadmin eller systemadmin');
  }

  // Build query with currency join
  let query = supabase
    .from('shop_items')
    .select(`
      *,
      virtual_currencies(name, symbol)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category !== 'all') {
    // Support category prefix (e.g., 'cosmetic:avatar_frame')
    query = query.or(`category.eq.${category},category.like.${category}:%`);
  }

  if (availability === 'available') {
    query = query.eq('is_available', true);
  } else if (availability === 'unavailable') {
    query = query.eq('is_available', false);
  }

  if (featured === 'featured') {
    query = query.eq('is_featured', true);
  } else if (featured === 'not_featured') {
    query = query.eq('is_featured', false);
  }

  // Apply sorting
  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing shop items:', error);
    throw new Error('Kunde inte ladda shop items');
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform data to flatten currency info
  const items: ShopItemRow[] = (data || []).map((row) => {
    const currency = row.virtual_currencies as { name?: string; symbol?: string } | null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description,
      category: row.category,
      image_url: row.image_url,
      price: Number(row.price),
      currency_id: row.currency_id,
      quantity_limit: row.quantity_limit,
      quantity_sold: row.quantity_sold ?? 0,
      is_available: row.is_available ?? true,
      is_featured: row.is_featured ?? false,
      sort_order: row.sort_order ?? 0,
      created_by_user_id: row.created_by_user_id,
      metadata: row.metadata,
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at,
      currency_name: currency?.name ?? null,
      currency_symbol: currency?.symbol ?? null,
    };
  });

  return {
    data: items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================
// GET SHOP ITEM STATS
// ============================================

export async function getShopItemStats(tenantId: string): Promise<ShopItemStats> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad');
  }

  const { data, error } = await supabase
    .from('shop_items')
    .select('is_available, is_featured, quantity_sold, price')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error getting shop item stats:', error);
    throw new Error('Kunde inte ladda statistik');
  }

  const items = data || [];
  const stats: ShopItemStats = {
    totalItems: items.length,
    availableItems: items.filter((i) => i.is_available).length,
    featuredItems: items.filter((i) => i.is_featured).length,
    totalSold: items.reduce((sum, i) => sum + (i.quantity_sold ?? 0), 0),
    totalRevenue: items.reduce((sum, i) => sum + (i.quantity_sold ?? 0) * Number(i.price), 0),
  };

  return stats;
}

// ============================================
// GET CURRENCIES FOR TENANT
// ============================================

export async function getTenantCurrencies(tenantId: string): Promise<CurrencyOption[]> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad');
  }

  const { data, error } = await supabase
    .from('virtual_currencies')
    .select('id, name, code, symbol')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error getting currencies:', error);
    throw new Error('Kunde inte ladda valutor');
  }

  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    symbol: c.symbol,
  }));
}

// ============================================
// GET SINGLE SHOP ITEM
// ============================================

export async function getShopItem(
  tenantId: string,
  itemId: string
): Promise<ShopItemRow | null> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad');
  }

  const { data, error } = await supabase
    .from('shop_items')
    .select(`
      *,
      virtual_currencies(name, symbol)
    `)
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting shop item:', error);
    throw new Error('Kunde inte ladda item');
  }

  const currency = data.virtual_currencies as { name?: string; symbol?: string } | null;
  return {
    id: data.id,
    tenant_id: data.tenant_id,
    name: data.name,
    description: data.description,
    category: data.category,
    image_url: data.image_url,
    price: Number(data.price),
    currency_id: data.currency_id,
    quantity_limit: data.quantity_limit,
    quantity_sold: data.quantity_sold ?? 0,
    is_available: data.is_available ?? true,
    is_featured: data.is_featured ?? false,
    sort_order: data.sort_order ?? 0,
    created_by_user_id: data.created_by_user_id,
    metadata: data.metadata,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at,
    currency_name: currency?.name ?? null,
    currency_symbol: currency?.symbol ?? null,
  };
}

// ============================================
// CREATE SHOP ITEM
// ============================================

export async function createShopItem(
  tenantId: string,
  input: z.infer<typeof shopItemCreateSchema>
): Promise<{ success: boolean; data?: ShopItemRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  // Validate input
  const parsed = shopItemCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  // Verify currency belongs to tenant
  const { data: currency } = await supabase
    .from('virtual_currencies')
    .select('id')
    .eq('id', parsed.data.currency_id)
    .eq('tenant_id', tenantId)
    .single();

  if (!currency) {
    return { success: false, error: 'Ogiltig valuta för denna organisation' };
  }

  // Use service role for insert
  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient
    .from('shop_items')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      image_url: parsed.data.image_url ?? null,
      price: parsed.data.price,
      currency_id: parsed.data.currency_id,
      quantity_limit: parsed.data.quantity_limit ?? null,
      is_available: parsed.data.is_available ?? true,
      is_featured: parsed.data.is_featured ?? false,
      sort_order: parsed.data.sort_order ?? 0,
      metadata: (parsed.data.metadata ?? {}) as Json,
      created_by_user_id: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating shop item:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return {
    success: true,
    data: {
      ...data,
      price: Number(data.price),
      quantity_sold: data.quantity_sold ?? 0,
      is_available: data.is_available ?? true,
      is_featured: data.is_featured ?? false,
      sort_order: data.sort_order ?? 0,
    } as ShopItemRow,
  };
}

// ============================================
// UPDATE SHOP ITEM
// ============================================

export async function updateShopItem(
  tenantId: string,
  itemId: string,
  input: z.infer<typeof shopItemUpdateSchema>
): Promise<{ success: boolean; data?: ShopItemRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  // Validate input
  const parsed = shopItemUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  // If currency_id is being updated, verify it belongs to tenant
  if (parsed.data.currency_id) {
    const { data: currency } = await supabase
      .from('virtual_currencies')
      .select('id')
      .eq('id', parsed.data.currency_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!currency) {
      return { success: false, error: 'Ogiltig valuta för denna organisation' };
    }
  }

  const adminClient = createServiceRoleClient();

  // Build update object, only including defined fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.image_url !== undefined) updateData.image_url = parsed.data.image_url;
  if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
  if (parsed.data.currency_id !== undefined) updateData.currency_id = parsed.data.currency_id;
  if (parsed.data.quantity_limit !== undefined) updateData.quantity_limit = parsed.data.quantity_limit;
  if (parsed.data.is_available !== undefined) updateData.is_available = parsed.data.is_available;
  if (parsed.data.is_featured !== undefined) updateData.is_featured = parsed.data.is_featured;
  if (parsed.data.sort_order !== undefined) updateData.sort_order = parsed.data.sort_order;
  if (parsed.data.metadata !== undefined) updateData.metadata = parsed.data.metadata;

  const { data, error } = await adminClient
    .from('shop_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating shop item:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return {
    success: true,
    data: {
      ...data,
      price: Number(data.price),
      quantity_sold: data.quantity_sold ?? 0,
      is_available: data.is_available ?? true,
      is_featured: data.is_featured ?? false,
      sort_order: data.sort_order ?? 0,
    } as ShopItemRow,
  };
}

// ============================================
// DELETE SHOP ITEM
// ============================================

export async function deleteShopItem(
  tenantId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  // Check if item has purchases (soft-delete by setting is_available = false instead)
  const { count: purchaseCount } = await supabase
    .from('user_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('shop_item_id', itemId)
    .eq('tenant_id', tenantId);

  if (purchaseCount && purchaseCount > 0) {
    return { 
      success: false, 
      error: `Kan inte ta bort: ${purchaseCount} köp finns. Dölj istället genom att sätta "Ej tillgänglig".` 
    };
  }

  const adminClient = createServiceRoleClient();

  const { error } = await adminClient
    .from('shop_items')
    .delete()
    .eq('id', itemId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting shop item:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return { success: true };
}

// ============================================
// TOGGLE AVAILABILITY
// ============================================

export async function toggleShopItemAvailability(
  tenantId: string,
  itemId: string,
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  const adminClient = createServiceRoleClient();

  const { error } = await adminClient
    .from('shop_items')
    .update({ 
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error toggling availability:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return { success: true };
}

// ============================================
// TOGGLE FEATURED
// ============================================

export async function toggleShopItemFeatured(
  tenantId: string,
  itemId: string,
  isFeatured: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  const adminClient = createServiceRoleClient();

  const { error } = await adminClient
    .from('shop_items')
    .update({ 
      is_featured: isFeatured,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error toggling featured:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return { success: true };
}

// ============================================
// BULK TOGGLE AVAILABILITY
// ============================================

export async function bulkToggleAvailability(
  tenantId: string,
  itemIds: string[],
  isAvailable: boolean
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, updatedCount: 0, error: 'Åtkomst nekad' };
  }

  if (itemIds.length === 0) {
    return { success: false, updatedCount: 0, error: 'Inga items valda' };
  }

  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient
    .from('shop_items')
    .update({ 
      is_available: isAvailable,
      updated_at: new Date().toISOString(),
    })
    .in('id', itemIds)
    .eq('tenant_id', tenantId)
    .select('id');

  if (error) {
    console.error('Error bulk toggling availability:', error);
    return { success: false, updatedCount: 0, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return { success: true, updatedCount: data?.length ?? 0 };
}

// ============================================
// DUPLICATE SHOP ITEM
// ============================================

export async function duplicateShopItem(
  tenantId: string,
  itemId: string
): Promise<{ success: boolean; data?: ShopItemRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  // Fetch original item
  const original = await getShopItem(tenantId, itemId);
  if (!original) {
    return { success: false, error: 'Item hittades inte' };
  }

  // Create duplicate with modified name
  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient
    .from('shop_items')
    .insert({
      tenant_id: tenantId,
      name: `${original.name} (kopia)`,
      description: original.description,
      category: original.category,
      image_url: original.image_url,
      price: original.price,
      currency_id: original.currency_id,
      quantity_limit: original.quantity_limit,
      is_available: false, // Duplicates start as unavailable
      is_featured: false,
      sort_order: original.sort_order,
      metadata: original.metadata,
      created_by_user_id: user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error duplicating shop item:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/shop-rewards');
  return {
    success: true,
    data: {
      ...data,
      price: Number(data.price),
      quantity_sold: 0,
      is_available: false,
      is_featured: false,
      sort_order: data.sort_order ?? 0,
    } as ShopItemRow,
  };
}

// ============================================
// LIST TENANTS FOR SELECTOR (System Admin)
// ============================================

export interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
}

export async function listTenantsForShopAdmin(): Promise<{ tenants: TenantOption[] }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { tenants: [] };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error listing tenants:', error);
    return { tenants: [] };
  }

  return { tenants: data || [] };
}

// ============================================
// GET USER'S TENANT MEMBERSHIPS (for non-system admins)
// ============================================

export async function getUserAdminTenants(): Promise<{ tenants: TenantOption[] }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { tenants: [] };
  }

  // System admin gets all tenants
  if (isSystemAdmin(user)) {
    return listTenantsForShopAdmin();
  }

  // Regular tenant admin gets only their tenants with admin roles
  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role, tenant:tenants!inner(id, name, slug)')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin', 'editor']);

  if (error) {
    console.error('Error listing user tenants:', error);
    return { tenants: [] };
  }

  const tenants: TenantOption[] = (data || [])
    .filter((m): m is typeof m & { tenant: { id: string; name: string; slug: string | null } } => !!m.tenant)
    .map((m) => ({
      id: m.tenant.id,
      name: m.tenant.name,
      slug: m.tenant.slug,
    }));

  return { tenants };
}

