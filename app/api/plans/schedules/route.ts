import { type NextRequest, NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import type { PlanSchedule, CreateScheduleInput } from '@/features/planner/calendar/types';

/**
 * GET /api/plans/schedules
 * 
 * Fetch schedules for a date range, optionally filtered by planId and status.
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
  const planId = searchParams.get('planId');
  const status = searchParams.get('status');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Missing required parameters: from, to' },
      { status: 400 }
    );
  }

  try {
    let query = supabase
      .from('plan_schedules')
      .select(`
        id,
        plan_id,
        scheduled_date,
        scheduled_time,
        recurrence_rule,
        notes,
        status,
        completed_at,
        created_at,
        updated_at
      `)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: true });

    if (planId) {
      query = query.eq('plan_id', planId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: scheduleRows, error: scheduleError } = await query;

    if (scheduleError) {
      console.error('[schedules] fetch error:', scheduleError);
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    // Get plan details for each schedule
    const planIds = [...new Set((scheduleRows ?? []).map(s => s.plan_id))];
    const { data: plans } = planIds.length > 0
      ? await supabase
          .from('plans')
          .select('id, name')
          .in('id', planIds)
      : { data: [] };

    const { data: blocks } = planIds.length > 0
      ? await supabase
          .from('plan_blocks')
          .select('plan_id, duration_minutes')
          .in('plan_id', planIds)
      : { data: [] };

    const planMap = new Map((plans ?? []).map(p => [p.id, p]));
    const blocksByPlan = (blocks ?? []).reduce((acc, b) => {
      if (!acc.has(b.plan_id)) acc.set(b.plan_id, []);
      acc.get(b.plan_id)!.push(b);
      return acc;
    }, new Map<string, { duration_minutes: number | null }[]>());

    // Transform to API response format
    const schedules: PlanSchedule[] = (scheduleRows ?? []).map((row) => {
      const plan = planMap.get(row.plan_id);
      const planBlocks = blocksByPlan.get(row.plan_id) ?? [];
      const totalTimeMinutes = planBlocks.reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

      return {
        id: row.id,
        planId: row.plan_id,
        planName: plan?.name ?? 'Okänd plan',
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time ?? undefined,
        recurrence: row.recurrence_rule ? parseRecurrence(row.recurrence_rule) : undefined,
        status: row.status as 'scheduled' | 'completed' | 'skipped',
        completedAt: row.completed_at ?? undefined,
        notes: row.notes ?? undefined,
        totalTimeMinutes,
        blockCount: planBlocks.length,
        createdAt: row.created_at ?? new Date().toISOString(),
        updatedAt: row.updated_at ?? new Date().toISOString(),
      };
    });

    return NextResponse.json(schedules);
  } catch (err) {
    console.error('[schedules] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/plans/schedules
 * 
 * Create a new schedule.
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

    // Get plan details
    const { data: plan } = await supabase
      .from('plans')
      .select('id, name')
      .eq('id', body.planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const { data: blocks } = await supabase
      .from('plan_blocks')
      .select('duration_minutes')
      .eq('plan_id', body.planId);

    const { data, error } = await supabase
      .from('plan_schedules')
      .insert({
        plan_id: body.planId,
        scheduled_date: body.scheduledDate,
        scheduled_time: body.scheduledTime ?? null,
        recurrence_rule: body.recurrence ? JSON.stringify(body.recurrence) : null,
        notes: body.notes ?? null,
        status: 'scheduled',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[schedules] create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalTimeMinutes = (blocks ?? []).reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

    const schedule: PlanSchedule = {
      id: data.id,
      planId: data.plan_id,
      planName: plan.name,
      scheduledDate: data.scheduled_date,
      scheduledTime: data.scheduled_time ?? undefined,
      recurrence: data.recurrence_rule ? parseRecurrence(data.recurrence_rule) : undefined,
      status: data.status as 'scheduled' | 'completed' | 'skipped',
      completedAt: data.completed_at ?? undefined,
      notes: data.notes ?? undefined,
      totalTimeMinutes,
      blockCount: (blocks ?? []).length,
      createdAt: data.created_at ?? new Date().toISOString(),
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };

    return NextResponse.json(schedule, { status: 201 });
  } catch (err) {
    console.error('[schedules] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// =============================================================================
// Helpers
// =============================================================================

interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
}

function parseRecurrence(ruleStr: string): RecurrenceRule | undefined {
  try {
    return JSON.parse(ruleStr);
  } catch {
    return undefined;
  }
}
