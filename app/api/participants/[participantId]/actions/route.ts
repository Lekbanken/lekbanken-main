import { NextResponse } from 'next/server';

type ActionBody = {
  action: 'mute' | 'kick' | 'ban';
  reason?: string;
};

export async function POST(req: Request, { params }: { params: { participantId: string } }) {
  const { participantId } = params;
  const body = (await req.json().catch(() => ({}))) as ActionBody;
  const logEntry = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: 'admin',
    action: `${body.action} participant ${participantId}${body.reason ? ` – ${body.reason}` : ''}`,
  };
  return NextResponse.json({ ok: true, logEntry });
}
