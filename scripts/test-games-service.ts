/**
 * Quick test with service role to bypass RLS
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing env vars");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testGames() {
  console.log("Testing with SERVICE ROLE KEY (bypasses RLS)...\n");

  const { data, error } = await supabase
    .from("games")
    .select("id, name, status, owner_tenant_id")
    .limit(10);

  if (error) {
    console.error("❌ Error:", error);
  } else {
    console.log("✅ Found", data?.length, "games:");
    data?.forEach(g => console.log(`   - ${g.name} (status: ${g.status}, tenant: ${g.owner_tenant_id})`));
  }
}

testGames();
