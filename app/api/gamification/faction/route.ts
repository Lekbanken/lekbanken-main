import { NextResponse, type NextRequest } from "next/server";
import { createServerRlsClient } from "@/lib/supabase/server";

const VALID_FACTIONS = new Set(["forest", "sea", "sky", "void"]);

// faction_id column exists in DB but Supabase codegen hasn't been re-run yet.
// Use a typed helper to send the update without fighting generated types.
type FactionUpdate = { faction_id: string | null };
type FactionInsert = { user_id: string; faction_id: string | null };

/**
 * POST /api/gamification/faction
 * Body: { factionId: "forest" | "sea" | "sky" | "void" | null }
 *
 * Sets (or clears) the user's cosmetic faction.
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

  let body: { factionId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { factionId } = body;

  // Validate: must be a known faction string or null (to reset)
  if (factionId !== null && (typeof factionId !== "string" || !VALID_FACTIONS.has(factionId))) {
    return NextResponse.json(
      { error: `Invalid factionId. Must be one of: ${[...VALID_FACTIONS].join(", ")}, or null.` },
      { status: 400 },
    );
  }

  // Update the user's existing progress row.
  // We match on user_id only — faction is global per user, regardless of tenant.
  // If no row exists yet we insert one (tenant_id will be NULL = global).
  const { data: existing } = await supabase
    .from("user_progress")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const writeError = existing
    ? (
        await (supabase
          .from("user_progress") as unknown as { update: (v: FactionUpdate) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } })
          .update({ faction_id: factionId as string | null })
          .eq("user_id", user.id)
      ).error
    : (
        await (supabase
          .from("user_progress") as unknown as { insert: (v: FactionInsert) => Promise<{ error: unknown }> })
          .insert({ user_id: user.id, faction_id: factionId as string | null })
      ).error;

  if (writeError) {
    console.error("[POST /api/gamification/faction] write error:", writeError);
    return NextResponse.json({ error: "Failed to save faction" }, { status: 500 });
  }

  return NextResponse.json({ factionId }, { status: 200 });
}
