import { NextResponse } from 'next/server';

type ActionBody = {
  action: 'mute' | 'kick' | 'ban';
  targetParticipantId?: string;
  reason?: string;
};

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const body = (await req.json().catch(() => ({}))) as ActionBody;
  const logEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: 'admin',
    action: `${body.action} ${body.targetParticipantId ? `participant ${body.targetParticipantId}` : 'session'} (${sessionId})${body.reason ? ` – ${body.reason}` : ''}`,
  };
  // Hook: here you could persist to DB or trigger Supabase function/webhook
  return NextResponse.json({ ok: true, logEntry });
}
