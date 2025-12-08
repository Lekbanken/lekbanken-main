/**
 * Quick test to verify games can be fetched
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  throw new Error("Missing env vars");
}

console.log("URL:", SUPABASE_URL);
console.log("ANON_KEY:", ANON_KEY?.substring(0, 20) + "...");

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testGames() {
  console.log("\n1. Testing: Get all games...");
  const { data: allGames, error: allError } = await supabase
    .from("games")
    .select("id, name, status, owner_tenant_id")
    .limit(5);

  if (allError) {
    console.error("❌ Error getting all games:", allError);
  } else {
    console.log("✅ All games:", allGames?.length, "found");
    allGames?.forEach(g => console.log(`   - ${g.name} (status: ${g.status}, tenant: ${g.owner_tenant_id})`));
  }

  console.log("\n2. Testing: Get published games...");
  const { data: published, error: pubError } = await supabase
    .from("games")
    .select("id, name, status, owner_tenant_id")
    .eq("status", "published")
    .limit(5);

  if (pubError) {
    console.error("❌ Error getting published games:", pubError);
  } else {
    console.log("✅ Published games:", published?.length, "found");
    published?.forEach(g => console.log(`   - ${g.name}`));
  }

  console.log("\n3. Testing: Get published games with owner_tenant_id IS NULL...");
  const { data: global, error: globalError } = await supabase
    .from("games")
    .select("id, name, status, owner_tenant_id")
    .eq("status", "published")
    .is("owner_tenant_id", null)
    .limit(5);

  if (globalError) {
    console.error("❌ Error getting global games:", globalError);
  } else {
    console.log("✅ Global published games:", global?.length, "found");
    global?.forEach(g => console.log(`   - ${g.name}`));
  }
}

testGames();
