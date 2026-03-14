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
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireSessionHost } from '@/lib/api/auth-guard';
import { apiHandler } from '@/lib/api/route-handler';
import { z } from 'zod';
import type { Json } from '@/types/supabase';

// ── Zod schemas for admin overrides ──────────────────────────────

const stepOverrideSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  durationMinutes: z.number().optional(),
  order: z.number().optional(),
  display_mode: z.enum(['instant', 'typewriter', 'dramatic']).nullable().optional(),
});

const phaseOverrideSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  duration: z.number().nullable().optional(),
  order: z.number().optional(),
});

const safetyOverrideSchema = z.object({
  safetyNotes: z.string().optional(),
  accessibilityNotes: z.string().optional(),
  spaceRequirements: z.string().optional(),
  leaderTips: z.string().optional(),
});

const adminOverridesSchema = z.object({
  steps: z.array(stepOverrideSchema).optional(),
  phases: z.array(phaseOverrideSchema).optional(),
  safety: safetyOverrideSchema.optional(),
});

type AdminOverrides = z.infer<typeof adminOverridesSchema>;

// ── GET: fetch overrides ─────────────────────────────────────────

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const sessionId = params.id;
    await requireSessionHost(sessionId);

    const supabaseAdmin = await createServiceRoleClient();
    const { data: session } = await supabaseAdmin
      .from('participant_sessions')
      .select('settings')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const settings = (session.settings as Record<string, unknown> | null) ?? {};
    const adminOverrides = (settings.admin_overrides as AdminOverrides | undefined) ?? {};

    return NextResponse.json({ overrides: adminOverrides }, { status: 200 });
  },
});

// ── PATCH: replace overrides ─────────────────────────────────────

export const PATCH = apiHandler({
  auth: 'user',
  input: adminOverridesSchema,
  handler: async ({ params, body }) => {
    const sessionId = params.id;
    await requireSessionHost(sessionId);

    const supabaseAdmin = await createServiceRoleClient();

    // Fetch current settings to merge
    const { data: session } = await supabaseAdmin
      .from('participant_sessions')
      .select('settings')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const rawSettings = (session.settings as unknown) ?? {};
    const baseSettings =
      typeof rawSettings === 'object' && rawSettings !== null
        ? (rawSettings as Record<string, unknown>)
        : {};

    const nextSettings: Record<string, unknown> = {
      ...baseSettings,
      admin_overrides: body,
    };

    const { error: updateError } = await supabaseAdmin
      .from('participant_sessions')
      .update({ settings: nextSettings as unknown as Json })
      .eq('id', sessionId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save overrides' }, { status: 500 });
    }

    return NextResponse.json({ success: true, overrides: body });
  },
});
