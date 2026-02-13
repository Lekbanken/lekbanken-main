import { NextResponse, type NextRequest } from "next/server";
import { createServerRlsClient } from "@/lib/supabase/server";

const VALID_FACTIONS = new Set(["forest", "sea", "sky", "void"]);

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

  // Upsert user_progress with faction_id.
  // If row doesn't exist yet, create one with defaults.
  const { error: upsertError } = await supabase
    .from("user_progress")
    .upsert(
      {
        user_id: user.id,
        faction_id: factionId as string | null,
      },
      { onConflict: "user_id,tenant_id" },
    );

  if (upsertError) {
    console.error("[POST /api/gamification/faction] upsert error:", upsertError);
    return NextResponse.json({ error: "Failed to save faction" }, { status: 500 });
  }

  return NextResponse.json({ factionId }, { status: 200 });
}
