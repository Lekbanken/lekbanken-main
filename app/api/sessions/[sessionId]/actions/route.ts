import { NextResponse } from 'next/server';

/** @deprecated Stub removed — use real session management routes instead. */
export async function POST() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 });
}
