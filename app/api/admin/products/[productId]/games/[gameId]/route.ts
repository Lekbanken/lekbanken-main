/**
 * DELETE /api/admin/products/[productId]/games/[gameId]
 * 
 * Admin-only endpoint to unlink a game from a product.
 * Sets games.product_id to NULL (doesn't delete the game).
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

type RouteParams = {
  params: Promise<{ productId: string; gameId: string }>;
};

export async function DELETE(request: Request, { params }: RouteParams) {
  const { productId, gameId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Verify game exists and belongs to this product
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, name, product_id')
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.product_id !== productId) {
    return NextResponse.json({ error: 'Game is not linked to this product' }, { status: 400 });
  }

  // Unlink the game from the product
  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      product_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId);

  if (updateError) {
    console.error('[api/admin/products/[productId]/games/[gameId]] Update error:', updateError);
    return NextResponse.json({ error: 'Failed to unlink game' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true,
    message: `Game "${game.name}" unlinked from product`
  });
}
