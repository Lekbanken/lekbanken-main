import { supabase } from "./client";

/**
 * Force sign out and clear local session data.
 * Safe to call from client; only clears local/session storage.
 */
export async function resetAuth() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.warn("resetAuth signOut local failed", err);
  }

  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("resetAuth signOut failed", err);
  }

  try {
    // Clear common Supabase keys; Supabase v2 mainly uses IndexedDB, but localStorage may have remnants.
    const keys = Object.keys(localStorage).filter((key) => key.includes("supabase"));
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.warn("resetAuth localStorage cleanup failed", err);
  }
}
