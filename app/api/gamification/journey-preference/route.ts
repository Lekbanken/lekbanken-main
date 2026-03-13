import { NextResponse } from "next/server";
import { createServerRlsClient } from "@/lib/supabase/server";
import { apiHandler } from "@/lib/api/route-handler";

export const dynamic = "force-dynamic";

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const supabase = await createServerRlsClient();
    const userId = auth!.user!.id;

    let body: unknown;
    try {
      body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || typeof (body as Record<string, unknown>).enabled !== "boolean") {
    return NextResponse.json({ error: "Body must contain { enabled: boolean }" }, { status: 400 });
  }

  const enabled = (body as { enabled: boolean }).enabled;
  const now = new Date().toISOString();

  // Check if row exists and already has a decision timestamp
  type PrefsRow = { journey_decision_at: string | null };
  const existingRes = await (
    supabase.from("user_journey_preferences" as never) as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: PrefsRow | null; error: unknown }>;
        };
      };
    }
  )
    .select("journey_decision_at")
    .eq("user_id", userId)
    .maybeSingle();

  const existingDecisionAt = (existingRes.data as PrefsRow | null)?.journey_decision_at ?? null;
  // COALESCE: preserve the first decision date, only set if null
  const decisionAt = existingDecisionAt ?? now;

  // Upsert with preserved journey_decision_at
  const { error } = await (
    supabase.from("user_journey_preferences" as never) as unknown as {
      upsert: (
        row: Record<string, unknown>,
        opts: { onConflict: string }
      ) => Promise<{ error: unknown }>;
    }
  )
    .upsert(
      {
        user_id: userId,
        journey_enabled: enabled,
        journey_decision_at: decisionAt,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to update preference" }, { status: 500 });
  }

  return NextResponse.json({
    enabled,
    decisionAt,
  });
  },
})
