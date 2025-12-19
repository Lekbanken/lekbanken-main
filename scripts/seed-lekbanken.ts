import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TENANT_SLUG = "lekbanken";
const TENANT_NAME = "Lekbanken";
const ADMIN_EMAIL = "admin@lekbanken.no";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run the seed.");
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureTenant() {
  const { error } = await supabase
    .from("tenants")
    .upsert(
      {
        id: TENANT_ID,
        name: TENANT_NAME,
        slug: TENANT_SLUG,
        type: "enterprise",
        status: "active",
        main_language: "NO",
      },
      { onConflict: "id" },
    );

  if (error) throw error;
  console.log("✅ Tenant ensured");
}

async function ensureAdminUser() {
  // List users and find by email since getUserByEmail doesn't exist
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existing = userList?.users?.find(u => u.email === ADMIN_EMAIL);
  let adminId: string | undefined = existing?.id;

  if (!adminId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD || "ChangeMeNow!123",
      email_confirm: true,
      user_metadata: { full_name: "Lekbanken Admin" },
    });
    if (error) throw error;
    adminId = data.user?.id;
  }

  if (!adminId) {
    throw new Error("Admin user could not be created or fetched.");
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: adminId,
      email: ADMIN_EMAIL,
      full_name: "Lekbanken Admin",
      role: "superadmin",
      language: "NO",
      preferred_theme: "dark",
      show_theme_toggle_in_header: true,
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const db = supabase as unknown as SupabaseClient;
  const { error: membershipError } = await db.from("user_tenant_memberships").upsert(
    {
      user_id: adminId,
      tenant_id: TENANT_ID,
      role: "owner",
      is_primary: true,
    },
    { onConflict: "user_id, tenant_id" },
  );
  if (membershipError) throw membershipError;

  console.log("✅ Admin user ensured:", adminId);
  return adminId;
}

async function ensureAchievements(adminId: string) {
  const achievements = [
    {
      achievement_key: "seed-planmaster",
      name: "Planeringsproffset",
      description: "Skapa din första plan i Lekbanken.",
      condition_type: "plan_created",
      condition_value: 1,
      badge_color: "#8b5cf6",
    },
    {
      achievement_key: "seed-coach",
      name: "Coach",
      description: "Tilldela en lek till ett lag.",
      condition_type: "assignment",
      condition_value: 1,
      badge_color: "#0ea5e9",
    },
    {
      achievement_key: "seed-streak",
      name: "Rutinkungen",
      description: "Logga in tre dagar i rad.",
      condition_type: "login_streak",
      condition_value: 3,
      badge_color: "#f59e0b",
    },
  ];

  const { data: upserted, error } = await supabase.from("achievements").upsert(achievements, {
    onConflict: "achievement_key",
    defaultToNull: false,
  }).select("id, achievement_key");
  if (error) throw error;

  const { data: existingAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", adminId);

  const existingIds = new Set((existingAchievements || []).map((row) => row.achievement_id));
  const unlocks = (upserted || [])
    .filter((row) => row.id && !existingIds.has(row.id))
    .map((row) => ({
      achievement_id: row.id,
      user_id: adminId,
      tenant_id: TENANT_ID,
    }));

  if (unlocks.length > 0) {
    const { error: unlockError } = await supabase.from("user_achievements").insert(unlocks);
    if (unlockError) throw unlockError;
  }

  console.log("✅ Achievements ensured and assigned");
}

async function run() {
  await ensureTenant();
  const adminId = await ensureAdminUser();
  await ensureAchievements(adminId);
  console.log("🎉 Seed completed");
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
