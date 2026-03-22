# Migration History

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Active migration-history normalization log for the canonical baseline transition. Use this as operational history, not as a replacement for the current migration workflow docs.

## 2026-03-16 — Migration history normalized

### Background

The local repo used a baseline migration (`00000000000000_baseline.sql`) generated 2026-03-13 from the sandbox DB (`vmpdejhgpsrfulimsoqn`) after 307 individual migrations. The remote production DB (`qohhnufxididbmzqnjwg`) still had all 307+ individual migration history entries, causing a mismatch that blocked `supabase db push`.

### What was done

1. **Baseline marked as applied** in remote history
2. **297 pre-baseline migrations marked as reverted** (they are consolidated into baseline)
3. **3 post-baseline remote-only migrations preserved** and given local representation files:
   - `20260313000000_game_content_schema_version.sql`
   - `20260314000000_tenant_admin_sessions_select_rls.sql`
   - `20260316095957_fix_notifications_global_rls.sql`
4. **1 already-applied migration marked as applied** without re-running:
   - `20260314100000_fix_rls_grants_and_admin_function.sql`
5. **4 missing migrations pushed to remote:**
   - `20260313200000_drop_duplicate_notification_indexes.sql`
   - `20260314200000_fix_demo_sessions_rls_and_rpcs.sql`
   - `20260315100000_planner_subtable_rls_tenant_admin.sql`
   - `20260315100100_fix_membership_rls_recursion.sql`

### Duplicate resolution

- `20260316095957` (remote) and `20260316200000` (local) contained identical SQL for `notifications_select` policy fix.
- **`20260316095957` is canonical.** The local duplicate `20260316200000` was archived to `supabase/migrations/_archived/`.

### Result

14/14 migrations synced. `supabase db push --dry-run` reports "Remote database is up to date."

### Commit

`fa3c55a` on `main`
