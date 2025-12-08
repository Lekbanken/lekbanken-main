/**
 * Apply RLS fix for games table
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing env vars");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyMigration() {
  console.log("Applying RLS fix for games table...\n");

  // Read the migration file
  const sql = readFileSync("supabase/migrations/20251207100000_fix_games_rls.sql", "utf-8");
  
  console.log("SQL to execute:");
  console.log(sql);
  console.log("\n");

  // Execute via rpc or direct query
  const { error } = await supabase.rpc("exec_sql", { sql_query: sql });
  
  if (error) {
    // Try alternative approach - execute each statement
    console.log("RPC not available, trying direct execution...");
    
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    for (const stmt of statements) {
      console.log("Executing:", stmt.substring(0, 60) + "...");
      // We can't execute raw SQL via supabase-js client
      // User needs to run this in Supabase Dashboard
    }
    
    console.log("\n⚠️  Cannot execute raw SQL via API.");
    console.log("Please run the following in Supabase Dashboard → SQL Editor:\n");
    console.log("=".repeat(60));
    console.log(sql);
    console.log("=".repeat(60));
  } else {
    console.log("✅ Migration applied successfully!");
  }
}

applyMigration();
