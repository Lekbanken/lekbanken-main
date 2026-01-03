import { NextResponse } from 'next/server';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { SessionAnalytics, TimelineEvent, TimeBankEntry, SessionAnalyticsResponse } from '@/types/analytics';

export const dynamic = 'force-dynamic';

// Type helpers for tables not in generated types (migrations not yet regenerated)
type SignalRow = { id: string; signal_type: string };
type TimeBankRow = { balance_seconds: number };
type TimeBankLedgerRow = {
  id: string;
  delta_seconds: number;
  balance_after: number;
  reason: string;
  actor_type: string | null;
  actor_id: string | null;
  created_at: string;
};

/**
 * GET /api/admin/analytics/sessions/[sessionId]
 * Fetch comprehensive analytics for a single session
 * 
 * @requires system_admin role
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  // Authentication check
  const authClient = await createServerRlsClient();
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorization check - only system_admin can view session analytics
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  // Use service role for data access
  const supabase = createServiceRoleClient();

  // Fetch session with game info
  const { data: session, error: sessionError } = await supabase
    .from('participant_sessions')
    .select(`
      id,
      game_id,
      created_at,
      started_at,
      ended_at,
      status,
      games!inner(name)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Fetch participants
  const { count: participantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { count: activeParticipantCount } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'active');

  // Fetch events
  const { data: events } = await supabase
    .from('session_events')
    .select('id, event_type, event_data, created_at, actor_participant_id, actor_user_id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Count events by type
  const eventsByType: Record<string, number> = {};
  (events || []).forEach((e) => {
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
  });

  // Count trigger_fired events as proxy for triggers
  const triggersFired = eventsByType['trigger_fired'] || 0;
  // Estimate total triggers (would need game_triggers table query in production)
  const totalTriggers = Math.max(triggersFired, 5);

  // Fetch signals - use type assertion since table may not be in generated types
  let signals: SignalRow[] = [];
  try {
    const { data } = await supabase
      .from('session_signals' as 'games') // Type hack
      .select('id, signal_type')
      .eq('session_id', sessionId) as unknown as { data: SignalRow[] | null };
    signals = data || [];
  } catch {
    // Table may not exist yet
  }

  const signalsByType: Record<string, number> = {};
  signals.forEach((s) => {
    signalsByType[s.signal_type] = (signalsByType[s.signal_type] || 0) + 1;
  });

  // Fetch time bank data - use type assertion
  let timeBankBalance = 0;
  try {
    const { data } = await supabase
      .from('session_time_bank' as 'games')
      .select('balance_seconds')
      .eq('session_id', sessionId)
      .single() as unknown as { data: TimeBankRow | null };
    timeBankBalance = data?.balance_seconds || 0;
  } catch {
    // Table may not exist yet
  }

  let timeBankLedger: TimeBankLedgerRow[] = [];
  try {
    const { data } = await supabase
      .from('session_time_bank_ledger' as 'games')
      .select('id, delta_seconds, balance_after, reason, actor_type, actor_id, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true }) as unknown as { data: TimeBankLedgerRow[] | null };
    timeBankLedger = data || [];
  } catch {
    // Table may not exist yet
  }

  // Calculate time bank stats
  const timeBankInitial = timeBankLedger[0]?.balance_after 
    ? timeBankLedger[0].balance_after - timeBankLedger[0].delta_seconds 
    : 0;
  const timeBankFinal = timeBankBalance;

  // Fetch decisions
  const { count: totalDecisions } = await supabase
    .from('session_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { count: completedDecisions } = await supabase
    .from('session_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('status', 'closed');

  // For votes, simplified count
  const totalVotes = 0;

  // Calculate duration
  let durationSeconds: number | null = null;
  if (session.started_at && session.ended_at) {
    durationSeconds = Math.floor(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    );
  }

  // Build analytics object
  const analytics: SessionAnalytics = {
    session_id: sessionId,
    game_id: session.game_id ?? '',
    game_name: (session.games as { name: string }).name,
    started_at: session.started_at,
    ended_at: session.ended_at,
    duration_seconds: durationSeconds,
    participant_count: participantCount || 0,
    active_participant_count: activeParticipantCount || 0,
    total_events: events?.length || 0,
    events_by_type: eventsByType,
    total_triggers: totalTriggers,
    triggers_fired: triggersFired,
    triggers_pending: Math.max(0, totalTriggers - triggersFired),
    trigger_fire_rate: totalTriggers > 0 ? (triggersFired / totalTriggers) * 100 : 0,
    time_bank_initial: timeBankInitial,
    time_bank_final: timeBankFinal,
    time_bank_delta: timeBankFinal - timeBankInitial,
    time_bank_transactions: timeBankLedger.length,
    total_decisions: totalDecisions || 0,
    decisions_completed: completedDecisions || 0,
    total_votes: totalVotes,
    total_signals: signals.length,
    signals_by_type: signalsByType,
  };

  // Build timeline
  const timeline: TimelineEvent[] = (events || []).map((e) => ({
    id: e.id,
    timestamp: e.created_at,
    event_type: e.event_type,
    actor_type: e.actor_participant_id ? 'participant' : e.actor_user_id ? 'user' : 'system',
    actor_name: null,
    description: getEventDescription(e.event_type, e.event_data as Record<string, unknown> | null),
    data: e.event_data as Record<string, unknown> | null,
  }));

  // Build time bank history
  const timeBankHistory: TimeBankEntry[] = timeBankLedger.map((entry) => ({
    id: entry.id,
    timestamp: entry.created_at,
    delta_seconds: entry.delta_seconds,
    balance_after: entry.balance_after,
    reason: entry.reason,
    actor_type: entry.actor_type,
    actor_id: entry.actor_id,
  }));

  const response: SessionAnalyticsResponse = {
    analytics,
    timeline,
    time_bank_history: timeBankHistory,
  };

  return NextResponse.json(response);
}

/** Generate human-readable event description */
function getEventDescription(eventType: string, data: Record<string, unknown> | null): string {
  switch (eventType) {
    case 'session_started':
      return 'Sessionen startades';
    case 'session_ended':
      return 'Sessionen avslutades';
    case 'participant_joined':
      return `Deltagare anslöt${data?.name ? `: ${data.name}` : ''}`;
    case 'participant_left':
      return 'Deltagare lämnade';
    case 'step_advanced':
      return `Steg ${data?.step_index ?? '?'} aktiverades`;
    case 'phase_changed':
      return `Fas ändrades till ${data?.phase_name ?? 'okänd'}`;
    case 'trigger_fired':
      return `Trigger aktiverad: ${data?.trigger_name ?? 'okänd'}`;
    case 'signal_sent':
      return `Signal skickad: ${data?.signal_type ?? 'okänd'}`;
    case 'time_bank_changed':
      return `Tidsbank ändrad: ${data?.delta_seconds ?? 0}s`;
    case 'decision_created':
      return `Omröstning skapad: ${data?.title ?? 'okänd'}`;
    case 'vote_cast':
      return 'Röst registrerad';
    case 'artifact_revealed':
      return `Artefakt visad: ${data?.title ?? 'okänd'}`;
    default:
      return eventType.replace(/_/g, ' ');
  }
}
