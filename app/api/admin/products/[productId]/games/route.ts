/**
 * GET /api/admin/products/[productId]/games
 * 
 * Admin-only endpoint to list all games linked to a product.
 * Returns games with their basic info for display in the product detail page.
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export type LinkedGame = {
  id: string;
  game_key: string | null;
  name: string;
  status: string;
  play_mode: string | null;
  owner_tenant_id: string | null;
  owner_tenant_name: string | null;
  updated_at: string;
};

export type LinkedGamesResponse = {
  games: LinkedGame[];
  total: number;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Verify product exists
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // Fetch all games linked to this product
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select(`
      id,
      game_key,
      name,
      status,
      play_mode,
      owner_tenant_id,
      updated_at,
      owner_tenant:tenants(name)
    `)
    .eq('product_id', productId)
    .order('name', { ascending: true });

  if (gamesError) {
    console.error('[api/admin/products/[productId]/games] Fetch error:', gamesError);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }

  // Map to response format
  const linkedGames: LinkedGame[] = (games || []).map((game) => ({
    id: game.id,
    game_key: game.game_key,
    name: game.name,
    status: game.status,
    play_mode: game.play_mode,
    owner_tenant_id: game.owner_tenant_id,
    owner_tenant_name: (game.owner_tenant as { name: string } | null)?.name ?? null,
    updated_at: game.updated_at,
  }));

  const response: LinkedGamesResponse = {
    games: linkedGames,
    total: linkedGames.length,
  };

  return NextResponse.json(response);
}
