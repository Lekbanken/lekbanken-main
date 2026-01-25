import { type NextRequest, NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { UpdateScheduleInput } from '@/features/planner/calendar/types';

interface RouteParams {
  params: Promise<{ scheduleId: string }>;
}

/**
 * GET /api/plans/schedules/[scheduleId]
 * 
 * Get a single schedule by ID.
 * 
 * NOTE: Stub implementation - returns 404 until plan_schedules table exists.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { scheduleId } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Replace with actual database query when plan_schedules table exists
  void scheduleId;
  return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
}

/**
 * PUT /api/plans/schedules/[scheduleId]
 * 
 * Update a schedule.
 * 
 * NOTE: Stub implementation - returns 404 until plan_schedules table exists.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { scheduleId } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const _body = await request.json() as UpdateScheduleInput;

    // TODO: Replace with actual database update when plan_schedules table exists
    void scheduleId;
    return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
  } catch (err) {
    console.error('[schedule] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/plans/schedules/[scheduleId]
 * 
 * Delete a schedule.
 * 
 * NOTE: Stub implementation - returns 404 until plan_schedules table exists.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { scheduleId } = await params;
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: Replace with actual database delete when plan_schedules table exists
  void scheduleId;
  return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
}
