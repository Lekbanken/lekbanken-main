/**
 * Quick script to make games globally visible by setting owner_tenant_id to NULL
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing env vars");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function makeGamesGlobal() {
  // Update all games to have no owner (globally visible)
  const { data, error } = await supabase
    .from("games")
    .update({ owner_tenant_id: null })
    .neq("id", "00000000-0000-0000-0000-000000000000") // update all
    .select("id, name");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`✅ Updated ${data?.length ?? 0} games to be globally visible`);
}

makeGamesGlobal();
