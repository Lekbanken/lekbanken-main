import { NextResponse, type NextRequest } from "next/server";
import { createServerRlsClient } from "@/lib/supabase/server";

/**
 * POST /api/gamification/showcase
 * Body: { slots: Array<{ slot: 1|2|3|4, achievementId: string }> }
 *
 * Replace-all: deletes existing rows for user, inserts new ones.
 * Max 4 slots, no duplicate achievement IDs.
 * Empty array = clear showcase.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerRlsClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slots?: Array<{ slot: number; achievementId: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slots = body.slots ?? [];

  // Validate
  if (!Array.isArray(slots) || slots.length > 4) {
    return NextResponse.json({ error: "slots must be an array of max 4" }, { status: 400 });
  }

  const seenSlots = new Set<number>();
  const seenIds = new Set<string>();

  for (const s of slots) {
    if (typeof s.slot !== "number" || s.slot < 1 || s.slot > 4) {
      return NextResponse.json({ error: `Invalid slot: ${s.slot}` }, { status: 400 });
    }
    if (typeof s.achievementId !== "string" || !s.achievementId) {
      return NextResponse.json({ error: "achievementId required" }, { status: 400 });
    }
    if (seenSlots.has(s.slot)) {
      return NextResponse.json({ error: `Duplicate slot: ${s.slot}` }, { status: 400 });
    }
    if (seenIds.has(s.achievementId)) {
      return NextResponse.json({ error: `Duplicate achievementId: ${s.achievementId}` }, { status: 400 });
    }
    seenSlots.add(s.slot);
    seenIds.add(s.achievementId);
  }

  // Replace-all in a "transaction" (delete then insert)
  // RLS ensures only this user's rows are affected
  const db = supabase as ReturnType<typeof createServerRlsClient> extends Promise<infer T> ? T : never;

  // Delete all existing rows for this user
  const { error: deleteError } = await (db as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .from("user_achievement_showcase")
    .delete()
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to clear showcase" }, { status: 500 });
  }

  // Insert new rows
  if (slots.length > 0) {
    const rows = slots.map((s) => ({
      user_id: user.id,
      slot: s.slot,
      achievement_id: s.achievementId,
      pinned_at: new Date().toISOString(),
    }));

    const { error: insertError } = await (db as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("user_achievement_showcase")
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: "Failed to save showcase" }, { status: 500 });
    }
  }

  return NextResponse.json({
    slots: slots.map((s) => ({ slot: s.slot, achievementId: s.achievementId })),
  });
}
