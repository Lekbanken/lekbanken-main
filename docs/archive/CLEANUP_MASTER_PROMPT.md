# Lekbanken Cleanup Master Prompt (v1.0)

**Created**: 2026-01-28  
**Purpose**: Safe, controlled cleanup of duplicated/outdated code and low-risk DB optimizations

---

## CONTEXT

You are Claude Opus 4.5 running inside VS Code.
You are working in the Lekbanken repository.

---

## MISSION

Perform a SAFE, CONTROLLED cleanup of duplicated and outdated code
and LOW-RISK database optimizations in Supabase.

Lekbanken is LIVE but has NO active daily users.
Runtime usage, logs, and traffic metrics are NOT reliable signals.

Cleanup MUST be:
- Contract-driven
- Evidence-based
- Conservative by default
- Governed by explicit repository state, not assumptions

---

## CORE PRINCIPLES

1. Prefer QUARANTINE over DELETE
2. Never infer intent from lack of usage
3. Never act in UNCERTAIN areas without explicit approval
4. The repository (files + annotations) is the source of truth
5. Humans approve by editing files and committing — not by conversation

---

## HARD CONSTRAINTS (NON-NEGOTIABLE)

1. You MAY modify code, but ONLY in small, reviewable batches
2. You MUST NOT modify or delete anything security-critical
3. You MUST NOT delete anything without replacement evidence
4. You MUST NOT delete anything marked UNCERTAIN
5. You MUST STOP and PAUSE when approval is required

---

## STATUS DEFINITIONS

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Part of current core flows or architecture |
| **PLANNED** | Intentionally present but not yet wired |
| **LEGACY** | Replaced or redundant with a clear successor |
| **UNCERTAIN** | Intent cannot be proven — treat as protected |

**RULE:** If intent is unclear → status = UNCERTAIN → DO NOT DELETE.

---

## GOVERNANCE MODEL (IDENTITY-AGNOSTIC)

You do NOT know who the human is.
You do NOT request decisions from a named person.

Approval happens ONLY through repository state:
- `/.atlas/annotations.json`
- Git commits
- Branch merges

If approval is missing → PAUSE.

---

## CONFIRMATION MECHANISM

Human confirms by ONE of:
- Committing `/.atlas/phase-N-approved` (file can be empty)
- Adding annotation with `"approved_for_deletion": true` in annotations.json
- Merging a PR with `[APPROVED]` in title

Until confirmation exists in repository → agent MUST NOT proceed.

---

## ATLAS / ANNOTATIONS (REQUIRED)

Use `/.atlas/annotations.json` as the ONLY approval mechanism.

### Exact Schema

```json
{
  "version": "1.0",
  "annotations": [
    {
      "node_id": "path/to/file.ts",
      "status": "LEGACY",
      "approved_for_deletion": false,
      "rationale": "Replaced by X or obsolete due to Y",
      "date": "YYYY-MM-DD"
    }
  ]
}
```

### Rules
- `approved_for_deletion` MUST be `true` before deletion
- UNCERTAIN items may be annotated but NEVER deleted
- You may CREATE the file if missing, but not self-approve deletions
- If file EXISTS → READ and PRESERVE existing entries
- NEVER overwrite or remove existing annotations
- APPEND new annotations only

---

## ABSOLUTE NO-GO AREAS (DO NOT TOUCH)

### Billing / Stripe
- `app/api/billing/*`
- `lib/stripe/*`
- Webhook handlers
- Subscription logic

### Auth / RBAC
- `lib/auth/*`
- `lib/supabase/auth.tsx`
- `app/auth/*`

### Tenant Isolation & RLS
- All RLS policies
- RLS RPCs: `is_system_admin`, `has_tenant_role`
- `TenantProvider`
- `tenant_domains` table
- `lib/tenant/*`

### GDPR / Legal
- `app/api/gdpr/*`
- `app/actions/legal*`
- Export/delete flows

### Gamification Money Paths
- `coin_transactions` table
- `apply_coin_transaction_v1`
- `purchase_shop_item_v1`

### Edge Functions
- `supabase/functions/*` (until explicitly verified)

### UNCERTAIN Domains
- Journey
- Learning
- Social
- Moderation
- Personalization

---

## STOP CONDITIONS — PAUSE IMMEDIATELY

STOP and request human action if:
- Build, lint, or typecheck fails
- A change affects >3 domains
- A deprecated target has >5 usages
- Domain classification becomes unclear
- Deployment config may be involved:
  - `middleware.ts`
  - `next.config.ts` (rewrites/redirects)
  - `vercel.json`
  - `.env*` files
- Security, auth, billing, or tenant isolation is suspected

### PAUSE Report Format

When stopped, output:

```markdown
---
## ⏸️ PAUSE REQUIRED

**Reason:** [one of the stop conditions]

**Blocked actions:**
- [ ] Action 1
- [ ] Action 2

**Required to proceed:**
- [ ] [specific repository change needed]

**Waiting for:** Repository state change (commit/merge/annotation)
---
```

---

## ROLLBACK PROTOCOL (MANDATORY)

### Branch Naming
```
cleanup/batch-{N}-{phase}-{target}
```

Examples:
- `cleanup/batch-1-phase0-infrastructure`
- `cleanup/batch-2-phase1-getCurrentUser`
- `cleanup/batch-3-phase1-admin-nav`
- `cleanup/batch-4-phase2-unused-indexes`

### Rules
- Each batch MUST run on its own branch
- Commits MUST be atomic
- Merge only after verification
- Rollback = revert the entire batch, not partial

---

## QUARANTINE & TRIPWIRE (EXACT IMPLEMENTATION)

### Purpose
Detect unexpected usage safely before deletion.

### Step 1: Create `/deprecated/index.ts`

```typescript
/**
 * Tripwire for deprecated modules.
 * Logs warning in development if deprecated code is imported.
 */
export function deprecatedImportWarning(moduleName: string) {
  if (process.env.NODE_ENV === 'development') {
    console.error(
      `⚠️ DEPRECATED IMPORT: ${moduleName} is scheduled for removal. ` +
      `If you see this, the module is still in use!`
    );
  }
}
```

### Step 2: Create `/deprecated/README.md`

```markdown
# Deprecated / Quarantined Code

This folder contains code scheduled for removal.

## Rules
1. All files here MUST call `deprecatedImportWarning()` at import
2. If you see warnings in dev → the code is still used → do not delete
3. After one full dev cycle with no warnings → safe to delete
4. All items here MUST have an entry in `/.atlas/annotations.json`

## Process
1. Move file here
2. Add tripwire import at top
3. Add annotation
4. Wait for approval
5. Delete only after approval
```

### Step 3: Quarantined Files Format

All quarantined files MUST start with:

```typescript
import { deprecatedImportWarning } from './index';
deprecatedImportWarning('<module-name>');

// Original code below...
```

### Policy
- If unsure → quarantine
- Never delete and quarantine in the same batch
- Always add annotation for quarantined items

---

## INVENTORY UPDATE RULES

After each batch, run the appropriate command:

| Change Location | Command |
|-----------------|---------|
| `lib/*` | `npm run inventory:shared` |
| `app/admin/*` | `npm run inventory:admin` |
| `app/app/*` | `npm run inventory:app` |
| `app/(marketing)/*` | `npm run inventory:marketing` |
| `sandbox/*` | `npm run inventory:sandbox` |
| Database changes | `npm run inventory:db` |

### Verification
1. Run relevant inventory command(s)
2. Verify removed nodes no longer appear
3. Add findings ONLY if pattern is reusable and rule-safe

---

## PHASE 0 — INFRASTRUCTURE SETUP

**Goal:** Create safety scaffolding before any code changes.

### Before Starting
1. Read `SYSTEM_STATUS_RISK_OVERVIEW.md`
2. List EXACT files to be touched (paths only)
3. Output list and PAUSE
4. Wait for repository confirmation

### Phase 0 Tasks (after confirmation)

| Task | Path |
|------|------|
| Create tripwire module | `/deprecated/index.ts` |
| Create quarantine README | `/deprecated/README.md` |
| Create annotations file | `/.atlas/annotations.json` |

### Annotations Initial Content
```json
{
  "version": "1.0",
  "annotations": []
}
```

---

## PHASE 1 — LOW-RISK CODE CLEANUP

**Allowed targets ONLY:**

### 1.1 `lib/db/users.ts` — deprecated `getCurrentUser()`

Steps:
1. Grep all usages: `grep -r "getCurrentUser" --include="*.ts" --include="*.tsx"`
2. If >5 usages → PAUSE
3. Migrate each usage to `getAuthUser()` from `lib/supabase/server.ts`
4. Quarantine or remove only if proven unused
5. Verify: `npm run type-check && npm run lint && npm run build`
6. Add annotation

### 1.2 Admin Nav Duplication

Files:
- `app/admin/components/admin-nav-config.tsx`
- `app/admin/components/admin-nav-items.tsx`

Steps:
1. Trace imports from:
   - `app/admin/layout.tsx`
   - `components/admin/AdminShell.tsx`
   - `components/admin/AdminSidebar.tsx`
2. Determine which is actually used
3. Consolidate OR quarantine the unused one
4. Do NOT guess — if unclear → PAUSE

### 1.3 `proxy.ts` Orphan

Verification checklist:
- [ ] `next.config.ts` — check rewrites/redirects sections
- [ ] `middleware.ts` — check if exists and references proxy
- [ ] `vercel.json` — check if exists
- [ ] `.env*` files — check for CUSTOM_DOMAIN or similar
- [ ] `lib/tenant/*` — check for custom domain logic
- [ ] `tenant_domains` table references in code

If ANY reference found → status = UNCERTAIN → do NOT quarantine.
If clearly unused → quarantine only (no delete).

### No Other Changes Allowed in Phase 1

---

## PHASE 2 — SUPABASE DB CLEANUP (LOW-RISK ONLY)

**Only allowed DB change:** Removal of unused game indexes.

### Target Indexes (from report)
```
games.popularity_score_idx     — 0 scans
games.idx_games_energy_level   — 0 scans
games.idx_games_location_type  — 0 scans
games.idx_games_category       — 0 scans
games.idx_games_time_estimate  — 0 scans
games.idx_games_age_range      — 0 scans
```

### Verification Steps (ALL REQUIRED)

1. **Identify representative queries**
   ```sql
   -- Example: Does category filter use index?
   EXPLAIN ANALYZE SELECT * FROM games WHERE category = 'test';
   ```

2. **Confirm index absence in query plan**
   - If index appears → DO NOT DROP

3. **Verify 0 scans in pg_stat_user_indexes**
   ```sql
   SELECT indexrelname, idx_scan 
   FROM pg_stat_user_indexes 
   WHERE schemaname = 'public' 
   AND relname = 'games';
   ```

4. **Grep codebase for index name references**
   ```bash
   grep -r "idx_games_" --include="*.sql" --include="*.ts"
   ```

5. **Migration MUST include rollback**
   ```sql
   -- Drop
   DROP INDEX IF EXISTS idx_games_category;
   
   -- Rollback (comment block)
   -- CREATE INDEX idx_games_category ON games(category);
   ```

---

## PHASE 3 — EDGE FUNCTION VERIFICATION (OPTIONAL)

Only if needed for cleanup scope:

1. Check Supabase Dashboard → Functions → Invocations
2. Check cron schedules in `supabase/functions/*/config.json`
3. Grep for `fetch('/functions/')` or similar in codebase
4. Add verification result to annotations.json

---

## PHASE 4 — DELETE (RARE, EXPLICIT)

Deletion is allowed ONLY if ALL conditions met:
- [ ] `status = LEGACY` in annotations
- [ ] `approved_for_deletion = true` in annotations
- [ ] Replacement exists and is documented
- [ ] Quarantine tested OR risk = low
- [ ] No tripwire warnings observed

---

## MANDATORY BATCH CHECKLIST

Before each batch:
- [ ] NO-GO areas verified (not touching protected code)
- [ ] Scope defined (exact file list)
- [ ] Evidence collected (grep results, traces)
- [ ] Changes isolated (single theme)

After each batch:
- [ ] Build passed: `npm run build`
- [ ] Lint passed: `npm run lint`
- [ ] Typecheck passed: `npm run type-check`
- [ ] Inventory updated (if applicable)
- [ ] Annotation added (if quarantine/delete)
- [ ] Rollback documented (branch exists)

---

## BEGIN PROTOCOL

### Step 1
Read `SYSTEM_STATUS_RISK_OVERVIEW.md` completely.

### Step 2
List the exact files you intend to CREATE in Phase 0:
```
/.atlas/annotations.json
/deprecated/index.ts
/deprecated/README.md
```

### Step 3
Output this confirmation request:

```markdown
## 📋 Phase 0 Confirmation Required

I will create the following files:
1. `/.atlas/annotations.json` — Empty annotations structure
2. `/deprecated/index.ts` — Tripwire warning function
3. `/deprecated/README.md` — Quarantine rules

**No existing files will be modified.**

To proceed, please:
- Commit an empty file at `/.atlas/phase-0-approved`
- OR reply with "proceed" (note: conversation approval is weaker than commit)
```

### Step 4
PAUSE and wait for repository confirmation.

---

## VERSION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | System | Initial production-ready prompt |

---

**END OF PROMPT**
