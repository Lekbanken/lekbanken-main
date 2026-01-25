import { type NextRequest, NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { PlanSchedule, CreateScheduleInput } from '@/features/planner/calendar/types';

/**
 * GET /api/plans/schedules
 * 
 * Fetch schedules for a date range, optionally filtered by planId and status.
 * 
 * NOTE: The plan_schedules table doesn't exist yet. This is a stub implementation
 * that returns empty results. When the table is created via migration, replace
 * this with actual database queries.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to' },
      { status: 400 }
    );
  }

  // TODO: Replace with actual database query when plan_schedules table exists
  // For now, return empty array as the table hasn't been created yet
  const schedules: PlanSchedule[] = [];

  return NextResponse.json(schedules);
}

/**
 * POST /api/plans/schedules
 * 
 * Create a new schedule.
 * 
 * NOTE: Stub implementation - returns error until table exists.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as CreateScheduleInput;

    if (!body.planId || !body.scheduledDate) {
      return NextResponse.json(
        { error: 'Missing required fields: planId, scheduledDate' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database insert when plan_schedules table exists
    // For now, return a mock response
    const mockSchedule: PlanSchedule = {
      id: crypto.randomUUID(),
      planId: body.planId,
      planName: 'Plan',
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      recurrence: body.recurrence,
      reminder: body.reminder,
      status: 'scheduled',
      notes: body.notes,
      totalTimeMinutes: 0,
      blockCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockSchedule, { status: 201 });
  } catch (err) {
    console.error('[schedules] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
