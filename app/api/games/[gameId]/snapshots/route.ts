/**
 * Game Snapshots API
 *
 * POST - Create a new snapshot for a game
 * GET  - List snapshots for a game
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerRlsClient } from '@/lib/supabase/server';

// =============================================================================
// GET /api/games/[gameId]/snapshots - List snapshots
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const supabase = createServiceRoleClient();

    const { data: snapshots, error } = await supabase
      .from('game_snapshots')
      .select(`
        id,
        game_id,
        version,
        version_label,
        includes_steps,
        includes_phases,
        includes_roles,
        includes_artifacts,
        includes_triggers,
        includes_board_config,
        checksum,
        created_by,
        created_at
      `)
      .eq('game_id', gameId)
      .order('version', { ascending: false });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ snapshots: [], message: 'Snapshot table not yet created' });
      }
      console.error('[snapshots] List error:', error);
      return NextResponse.json(
        { error: 'Failed to list snapshots', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ snapshots: snapshots ?? [] });
  } catch (err) {
    console.error('[snapshots] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/games/[gameId]/snapshots - Create snapshot
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const rlsClient = await createServerRlsClient();
    const supabase = createServiceRoleClient();

    // Get current user
    const {
      data: { user },
    } = await rlsClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body
    const body = await request.json().catch(() => ({}));
    const versionLabel = body.versionLabel as string | undefined;

    const { data: snapshotId, error } = await supabase.rpc('create_game_snapshot', {
      p_game_id: gameId,
      p_version_label: versionLabel,
      p_created_by: user.id,
    });

    if (error) {
      // RPC might not exist yet
      if (error.code === '42883') {
        return NextResponse.json(
          { error: 'Snapshot system not yet deployed. Run migrations first.' },
          { status: 501 }
        );
      }
      console.error('[snapshots] Create error:', error);
      return NextResponse.json(
        { error: 'Failed to create snapshot', details: error.message },
        { status: 500 }
      );
    }

    // Fetch the created snapshot
    const { data: snapshot } = await supabase
      .from('game_snapshots')
      .select('id, version, version_label, created_at')
      .eq('id', snapshotId)
      .single();

    return NextResponse.json({
      success: true,
      snapshot: snapshot ?? { id: snapshotId },
    });
  } catch (err) {
    console.error('[snapshots] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
