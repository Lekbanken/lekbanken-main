/**
 * Snapshot Route - DEPRECATED (V2)
 * 
 * This route is deprecated as of Artifacts V2.
 * Artifacts are now read directly from game_artifacts tables.
 * No snapshotting is required.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'Snapshot is deprecated in V2. Artifacts are now read directly from game configuration.',
      migration: 'Remove snapshot calls from your client code.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'Snapshot is deprecated in V2.',
    },
    { status: 410 }
  );
}
