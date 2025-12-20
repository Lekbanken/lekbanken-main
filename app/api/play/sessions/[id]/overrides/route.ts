/**
 * Session Admin Overrides API
 *
 * GET  /api/play/sessions/[id]/overrides - Fetch session-local admin overrides
 * PATCH /api/play/sessions/[id]/overrides - Replace overrides for the session
 *
 * Notes
 * - Overrides are stored under participant_sessions.settings.admin_overrides
 * - Host-only; participants and non-hosts are blocked
 * - Fields are session-local and never touch the underlying game data
 */

import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

type StepOverride = {
  id: string;
  title?: string;
  description?: string;
  durationMinutes?: number;
  order?: number;
};

type PhaseOverride = {
  id: string;
  name?: string;
  description?: string;
  duration?: number | null;
  order?: number;
};

type SafetyOverride = {
  safetyNotes?: string;
  accessibilityNotes?: string;
  spaceRequirements?: string;
  leaderTips?: string;
};

type AdminOverrides = {
  steps?: StepOverride[];
  phases?: PhaseOverride[];
  safety?: SafetyOverride;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeOverrides(payload: unknown): AdminOverrides {
  if (!isObject(payload)) return {};

  const steps = Array.isArray(payload.steps)
    ? (payload.steps
        .map((s) =>
          isObject(s) && typeof s.id === 'string'
            ? ({
                id: s.id,
                title: typeof s.title === 'string' ? s.title : undefined,
                description: typeof s.description === 'string' ? s.description : undefined,
                durationMinutes:
                  typeof (s as { durationMinutes?: unknown }).durationMinutes === 'number'
                    ? (s as { durationMinutes: number }).durationMinutes
                    : undefined,
                order: typeof (s as { order?: unknown }).order === 'number'
                  ? (s as { order: number }).order
                  : undefined,
              } satisfies StepOverride)
            : null
        )
        .filter(Boolean) as StepOverride[])
    : undefined;

  const phases = Array.isArray(payload.phases)
    ? (payload.phases
        .map((p) =>
          isObject(p) && typeof p.id === 'string'
            ? ({
                id: p.id,
                name: typeof p.name === 'string' ? p.name : undefined,
                description: typeof p.description === 'string' ? p.description : undefined,
                duration:
                  typeof (p as { duration?: unknown }).duration === 'number' || (p as { duration?: unknown }).duration === null
                    ? (p as { duration: number | null }).duration
                    : undefined,
                order: typeof (p as { order?: unknown }).order === 'number'
                  ? (p as { order: number }).order
                  : undefined,
              } satisfies PhaseOverride)
            : null
        )
        .filter(Boolean) as PhaseOverride[])
    : undefined;

  const safetyPayload = isObject(payload.safety) ? payload.safety : undefined;
  const safety = safetyPayload
    ? {
        safetyNotes: typeof safetyPayload.safetyNotes === 'string' ? safetyPayload.safetyNotes : undefined,
        accessibilityNotes:
          typeof safetyPayload.accessibilityNotes === 'string' ? safetyPayload.accessibilityNotes : undefined,
        spaceRequirements:
          typeof safetyPayload.spaceRequirements === 'string' ? safetyPayload.spaceRequirements : undefined,
        leaderTips: typeof safetyPayload.leaderTips === 'string' ? safetyPayload.leaderTips : undefined,
      }
    : undefined;

  return { steps, phases, safety };
}

async function getSessionAndAssertHost(sessionId: string) {
  const supabaseRls = await createServerRlsClient();
  const { data: auth } = await supabaseRls.auth.getUser();
  const user = auth.user;

  if (!user) return { status: 401 as const, error: 'Unauthorized', session: null };

  const supabaseAdmin = await createServiceRoleClient();
  const { data: session, error } = await supabaseAdmin
    .from('participant_sessions')
    .select('id, host_user_id, settings')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return { status: 404 as const, error: 'Session not found', session: null };
  }

  if (session.host_user_id !== user.id) {
    return { status: 403 as const, error: 'Only host can manage overrides', session: null };
  }

  return { status: 200 as const, error: null, session };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const { status, error, session } = await getSessionAndAssertHost(sessionId);
  if (!session) {
    return NextResponse.json({ error }, { status });
  }

  const settings = (session.settings as Record<string, unknown> | null) ?? {};
  const adminOverrides = (settings.admin_overrides as AdminOverrides | undefined) ?? {};

  return NextResponse.json({ overrides: adminOverrides }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const { status, error, session } = await getSessionAndAssertHost(sessionId);
  if (!session) {
    return NextResponse.json({ error }, { status });
  }

  const body = await request.json().catch(() => ({}));
  const sanitized = sanitizeOverrides(body);

  const supabaseAdmin = await createServiceRoleClient();

  const rawSettings = (session.settings as unknown) ?? {};
  const baseSettings = typeof rawSettings === 'object' && rawSettings !== null ? (rawSettings as Record<string, unknown>) : {};

  const nextSettings: Record<string, unknown> = {
    ...baseSettings,
    admin_overrides: sanitized,
  };

  const { error: updateError } = await supabaseAdmin
    .from('participant_sessions')
    .update({ settings: nextSettings as unknown as Json })
    .eq('id', sessionId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save overrides' }, { status: 500 });
  }

  return NextResponse.json({ success: true, overrides: sanitized });
}