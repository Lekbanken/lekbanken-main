import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { requirePlanEditAccess } from '@/lib/planner/require-plan-access';
import type { PlanSchedule, UpdateScheduleInput } from '@/features/planner/calendar/types';

/**
 * GET /api/plans/schedules/[scheduleId]
 * 
 * Get a single schedule by ID.
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
  const { scheduleId } = params;
  const supabase = await createServerRlsClient();

  try {
    const { data, error } = await supabase
      .from('plan_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('plans')
      .select('id, name')
      .eq('id', data.plan_id)
      .single();

    const { data: blocks } = await supabase
      .from('plan_blocks')
      .select('duration_minutes')
      .eq('plan_id', data.plan_id);

    const totalTimeMinutes = (blocks ?? []).reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

    const schedule: PlanSchedule = {
      id: data.id,
      planId: data.plan_id,
      planName: plan?.name ?? 'Okänd plan',
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

    return NextResponse.json(schedule);
  } catch (err) {
    console.error('[schedule] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  },
});

/**
 * PUT /api/plans/schedules/[scheduleId]
 * 
 * Update a schedule.
 */
export const PUT = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const { scheduleId } = params;
  const supabase = await createServerRlsClient();

  try {
    // Fetch schedule to get plan_id for capability check
    const { data: existing, error: existingError } = await supabase
      .from('plan_schedules')
      .select('plan_id')
      .eq('id', scheduleId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Capability check: user must be able to edit the plan
    const access = await requirePlanEditAccess(supabase, auth!.user!, existing.plan_id);
    if (!access.allowed) return access.response;

    const body = await req.json() as UpdateScheduleInput;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.scheduledDate !== undefined) {
      updates.scheduled_date = body.scheduledDate;
    }
    if (body.scheduledTime !== undefined) {
      updates.scheduled_time = body.scheduledTime;
    }
    if (body.recurrence !== undefined) {
      updates.recurrence_rule = body.recurrence ? JSON.stringify(body.recurrence) : null;
    }
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (body.notes !== undefined) {
      updates.notes = body.notes;
    }

    const { data, error } = await supabase
      .from('plan_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get plan details
    const { data: plan } = await supabase
      .from('plans')
      .select('id, name')
      .eq('id', data.plan_id)
      .single();

    const { data: blocks } = await supabase
      .from('plan_blocks')
      .select('duration_minutes')
      .eq('plan_id', data.plan_id);

    const totalTimeMinutes = (blocks ?? []).reduce((sum, b) => sum + (b.duration_minutes ?? 0), 0);

    const schedule: PlanSchedule = {
      id: data.id,
      planId: data.plan_id,
      planName: plan?.name ?? 'Okänd plan',
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

    return NextResponse.json(schedule);
  } catch (err) {
    console.error('[schedule] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  },
});

/**
 * DELETE /api/plans/schedules/[scheduleId]
 * 
 * Delete a schedule.
 */
export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const { scheduleId } = params;
  const supabase = await createServerRlsClient();

  try {
    // Fetch schedule to get plan_id for capability check
    const { data: existing, error: existingError } = await supabase
      .from('plan_schedules')
      .select('plan_id')
      .eq('id', scheduleId)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Capability check: user must be able to edit the plan
    const access = await requirePlanEditAccess(supabase, auth!.user!, existing.plan_id);
    if (!access.allowed) return access.response;

    const { error } = await supabase
      .from('plan_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('[schedule] delete error:', error);
      return NextResponse.json({ error: 'Schedule update failed' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[schedule] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  },
});

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
