import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { BulkOperationResult } from '@/features/admin/games/v2/types';

// ============================================================================
// SCHEMA
// ============================================================================

const bulkOperationSchema = z.object({
  operation: z.enum([
    'publish',
    'unpublish',
    'change_status',
    'assign_purposes',
    'remove_purposes',
    'add_tags',
    'remove_tags',
    'assign_tenant_availability',
    'change_visibility',
    'export',
    'revalidate',
    'archive',
    'delete',
  ]),
  gameIds: z.array(z.string().uuid()).min(1).max(500),
  params: z.record(z.unknown()).optional(),
});

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

type OperationContext = {
  supabase: Awaited<ReturnType<typeof createServerRlsClient>>;
  gameIds: string[];
  params?: Record<string, unknown>;
};

async function handlePublish(ctx: OperationContext): Promise<BulkOperationResult> {
  const { supabase, gameIds } = ctx;
  
  const { error, count } = await supabase
    .from('games')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .in('id', gameIds);

  if (error) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.message }],
    };
  }

  return { success: true, affected: count || gameIds.length, failed: 0 };
}

async function handleUnpublish(ctx: OperationContext): Promise<BulkOperationResult> {
  const { supabase, gameIds } = ctx;
  
  const { error, count } = await supabase
    .from('games')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .in('id', gameIds);

  if (error) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.message }],
    };
  }

  return { success: true, affected: count || gameIds.length, failed: 0 };
}

async function handleRevalidate(ctx: OperationContext): Promise<BulkOperationResult> {
  // For now, just touch updated_at to trigger any validation hooks
  const { supabase, gameIds } = ctx;
  
  const { error, count } = await supabase
    .from('games')
    .update({ updated_at: new Date().toISOString() })
    .in('id', gameIds);

  if (error) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.message }],
    };
  }

  return { 
    success: true, 
    affected: count || gameIds.length, 
    failed: 0,
    warnings: [{ gameId: 'all', warning: 'Validation re-run is a placeholder operation' }],
  };
}

async function handleArchive(ctx: OperationContext): Promise<BulkOperationResult> {
  // Archive = set to draft status for now (could add an 'archived' status enum later)
  const { supabase, gameIds } = ctx;
  
  const { error, count } = await supabase
    .from('games')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .in('id', gameIds);

  if (error) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.message }],
    };
  }

  return { success: true, affected: count || gameIds.length, failed: 0 };
}

async function handleDelete(ctx: OperationContext): Promise<BulkOperationResult> {
  const { supabase, gameIds } = ctx;
  const errors: Array<{ gameId: string; error: string }> = [];
  let affected = 0;

  // Delete one by one to handle individual errors
  for (const gameId of gameIds) {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      errors.push({ gameId, error: error.message });
    } else {
      affected++;
    }
  }

  return {
    success: errors.length === 0,
    affected,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function handleExport(ctx: OperationContext): Promise<BulkOperationResult> {
  // Export is handled client-side, this just validates the request
  return {
    success: true,
    affected: ctx.gameIds.length,
    failed: 0,
  };
}

async function handleAssignPurposes(ctx: OperationContext): Promise<BulkOperationResult> {
  const { supabase, gameIds, params } = ctx;
  const purposeIds = (params?.purposeIds as string[]) || [];
  const mode = (params?.mode as 'add' | 'replace') || 'add';

  if (purposeIds.length === 0) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: 'No purpose IDs provided' }],
    };
  }

  const errors: Array<{ gameId: string; error: string }> = [];
  let affected = 0;

  for (const gameId of gameIds) {
    try {
      if (mode === 'replace') {
        // Remove existing secondary purposes
        await supabase
          .from('game_secondary_purposes')
          .delete()
          .eq('game_id', gameId);
      }

      // Add new purposes
      const inserts = purposeIds.map(purposeId => ({
        game_id: gameId,
        purpose_id: purposeId,
      }));

      const { error } = await supabase
        .from('game_secondary_purposes')
        .upsert(inserts, { onConflict: 'game_id,purpose_id' });

      if (error) {
        errors.push({ gameId, error: error.message });
      } else {
        affected++;
      }
    } catch (err) {
      errors.push({ gameId, error: String(err) });
    }
  }

  return {
    success: errors.length === 0,
    affected,
    failed: errors.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function handleRemovePurposes(ctx: OperationContext): Promise<BulkOperationResult> {
  const { supabase, gameIds, params } = ctx;
  const purposeIds = (params?.purposeIds as string[]) || [];

  if (purposeIds.length === 0) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: 'No purpose IDs provided' }],
    };
  }

  const { error, count } = await supabase
    .from('game_secondary_purposes')
    .delete()
    .in('game_id', gameIds)
    .in('purpose_id', purposeIds);

  if (error) {
    return {
      success: false,
      affected: 0,
      failed: gameIds.length,
      errors: [{ gameId: 'all', error: error.message }],
    };
  }

  return { success: true, affected: count || 0, failed: 0 };
}

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: Request) {
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (user.app_metadata as { role?: string } | undefined)?.role ?? null;
  const isAdmin = role === 'system_admin' || role === 'superadmin';

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
  }

  // Parse and validate body
  const body = await request.json().catch(() => ({}));
  const parsed = bulkOperationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { operation, gameIds, params } = parsed.data;
  const ctx: OperationContext = { supabase, gameIds, params };

  let result: BulkOperationResult;

  try {
    switch (operation) {
      case 'publish':
        result = await handlePublish(ctx);
        break;
      case 'unpublish':
        result = await handleUnpublish(ctx);
        break;
      case 'revalidate':
        result = await handleRevalidate(ctx);
        break;
      case 'archive':
        result = await handleArchive(ctx);
        break;
      case 'delete':
        result = await handleDelete(ctx);
        break;
      case 'export':
        result = await handleExport(ctx);
        break;
      case 'assign_purposes':
        result = await handleAssignPurposes(ctx);
        break;
      case 'remove_purposes':
        result = await handleRemovePurposes(ctx);
        break;
      default:
        result = {
          success: false,
          affected: 0,
          failed: gameIds.length,
          errors: [{ gameId: 'all', error: `Operation '${operation}' not implemented yet` }],
        };
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[api/admin/games/bulk] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
