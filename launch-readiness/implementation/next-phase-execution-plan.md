# Next Phase Execution Plan

## Metadata

> **Date:** 2026-03-13  
> **Last updated:** 2026-03-21  
> **Last validated:** 2026-03-21  
> **Status:** historical snapshot  
> **Author:** Claude Opus 4.6 (automated analysis)  
> **Based on:** audits/system-verification-2026.md + launch-readiness implementation plan  
> **Note:** Historical plan snapshot from before the post-launch Observe Mode alignment. Treat `next-execution-plan.md`, `launch-control.md`, and `implementation/README.md` as the current navigation surfaces.
> **Superseded facts warning:** Repository evidence in this document reflects pre-resolution state. Statements such as `Docker not installed`, `.env.local` pointing to prod, and preview/dev sharing prod data-plane are no longer current.

---

## 1. Selected Phase

### **Phase 1B — Environment Isolation (Sandbox Strategy)**

Phase 1B is selected as the next phase to execute.

---

## 2. Technical Rationale

### Why Phase 1B first, not Phase 2, 5, or 6?

| Candidate | Risk if deferred | Blocked by 1B? | Effort | Verdict |
|-----------|------------------|-----------------|--------|---------|
| **1B — Sandbox** | **HIGH** — prod data corruption, migration accidents, unusable previews | — | Medium | ✅ **Selected** |
| 2 — Test Foundation | Medium — large refactors lack safety net | Partially — E2E tests need a safe DB | Medium-High | Second priority |
| 5 — Regression Audits | Low — audits ran recently, system is stable | Yes — re-auditing against prod DB is risky | Medium | After 2 |
| 6 — Docs Cleanup | Low — AI agent drift risk, but no data risk | No | Low-Medium | Can run in parallel |

**Core argument:** Every other phase either **depends on** or **benefits from** environment isolation:

1. **Phase 2 (Test Foundation)** — E2E and integration tests need a database they can seed, mutate, and reset without affecting production. Writing tests against prod is both dangerous and unreliable.
2. **Phase 5 (Regression Audits)** — Re-running deep code audits while dev still hits prod means any discovered issue that needs a test fix carries prod risk.
3. **Phase 6 (Docs Cleanup)** — Independent, can run in parallel with 1B.

**The verified finding that seals this:** `.env.local` currently points to the **production Supabase instance**. This is not theoretical — it is confirmed by reading the actual file.

> **Cross-reference:** This finding is tracked as **OPS-SAND-001** (P1) in `platform-operations-audit.md`. It is the highest-priority open operational risk across all workstreams. Första exekverbara operationsmål = få bort preview/dev från prod-data-plane.

---

## 3. Repository Evidence

### Evidence supporting this decision

| Finding | Source | Impact |
|---------|--------|--------|
| `.env.local` → remote Supabase (prod) | Verified via file read | **All local dev mutations hit prod** |
| `supabase/config.toml` missing | Verified via `Test-Path` | `supabase start` cannot run — local DB impossible |
| Docker not installed | Verified via `docker --version` | Local Supabase requires Docker; **blocks Alt A entirely** |
| Supabase CLI v2.67.1 installed | Verified via `supabase --version` | CLI is ready but cannot start without Docker + config |
| Seed files exist (3 files) | Verified in `supabase/seeds/` | Foundation for sandbox seeding exists |
| 304 migrations exist | Verified via file count | Need to be replayed on sandbox DB |
| Vercel previews use prod DB | No `.env.preview` exists; architecture doc confirms | **Preview deployments can mutate production data** |
| RLS tests workflow uses `supabase db start` | Verified in `.github/workflows/rls-tests.yml` | CI already uses local Supabase — proves the pattern works |

### Architecture doc reference

From `launch-readiness-architecture.md` §2:

> **Problem:** Idag delar development, preview och production samma Supabase-instans. Det gör det farligt att testa migrations och omöjligt att köra destructive tests.

> **Rekommendation: Alt C — Hybrid** (local for dev + remote sandbox for preview)

~~ADR-005 was proposed but **never decided**.~~ ✅ **DECIDED (2026-03-13):** Alt B (remote sandbox) implementerat. Preview + Development Vercel-scopes pekar mot sandbox Supabase (`vmpdejhgpsrfulimsoqn`). Verifierat via Vercel Dashboard screenshots (Production, Preview, Development scopes alla korrekt konfigurerade).

---

## 4. Execution Plan

### Constraint: Docker not installed on current dev machine

The original Phase 1B plan (Alt C — Hybrid) assumed Docker for local Supabase. Since Docker is **not installed on the current machine**, the plan starts with remote sandbox as the immediately executable track.

> **Status update (2026-03-13):**
> - Step 1 ✅ DONE — Sandbox Supabase created (`vmpdejhgpsrfulimsoqn`)
> - Step 2 ✅ DONE — Canonical baseline applied (replaces 304 migrations), schema verified (247/156/545/28)
> - Step 3 — Superseded — `.env.sandbox` not needed; using Vercel Preview env vars instead
> - Step 4 ✅ READY — Set Preview-scoped env vars in existing Vercel project (not separate project)
> - **Decision (GPT, 2026-03-13):** Separate Vercel sandbox project deferred. Preview env vars in existing project is sufficient for OPS-SAND-001.
> - See `sandbox-implementation-brief.md` for current implementation plan.

```
Phase 1B — Execution Order
━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Create remote sandbox Supabase project
Step 2 — Apply all 304 migrations to sandbox
Step 3 — Configure environment files
Step 4 — Configure Vercel preview environment
Step 5 — Create supabase/config.toml (for future local dev)
Step 6 — Update CI to use sandbox for integration tests
Step 7 — Document and update ADR-005
```

### Step 1 — Create remote sandbox Supabase project

**Action:** Create a new Supabase project named `lekbanken-sandbox` (or `lekbanken-staging`).

**Owner:** Manual — requires Supabase Dashboard.

**Details:**
- Same region as production (for latency parity)
- Free tier is sufficient for dev/preview
- Note the new project URL and keys

**Deliverable:** Sandbox project URL + anon key + service role key.

### Step 2 — Apply all 304 migrations to sandbox

**Action:** Link Supabase CLI to the sandbox project and push migrations.

```bash
supabase link --project-ref <sandbox-ref>
supabase db push
```

**Verification:**
- All 304 migrations apply cleanly
- RLS policies are created
- Functions/triggers exist

**Deliverable:** Sandbox DB has identical schema to production.

### Step 3 — Configure environment files

**Action:** Create separated environment configs.

**New files to create:**
- `.env.sandbox` — Sandbox Supabase credentials
- Update `.env.local.example` — Add comments for sandbox vs prod

**Env var structure:**
```
# .env.sandbox (used for development and preview)
NEXT_PUBLIC_SUPABASE_URL=https://<sandbox-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sandbox-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sandbox-service-role>
```

**Developer workflow change:**
- `.env.local` should point to sandbox by default
- Production keys only used in Vercel production environment

### Step 4 — Configure Vercel preview environment

**Action:** In Vercel Dashboard → Settings → Environment Variables:
- Set `NEXT_PUBLIC_SUPABASE_URL` for **Preview** environment to sandbox URL
- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` for **Preview** to sandbox anon key
- Set `SUPABASE_SERVICE_ROLE_KEY` for **Preview** to sandbox service role
- **Production** environment keeps production keys (unchanged)

**Verification:** Deploy a preview branch → verify it uses sandbox DB (check network requests in browser DevTools).

### Step 5 — Create `supabase/config.toml`

**Action:** Generate the standard Supabase config for future local development.

```bash
supabase init  # Regenerates config.toml
```

Or create manually with project-appropriate settings. This enables `supabase start` once Docker is installed.

**Note:** This step is preparation for Alt C (hybrid) but is non-blocking.

### Step 6 — Update CI for sandbox integration

**Action:** Add migration verification to CI.

**New workflow:** `.github/workflows/migration-check.yml`
```yaml
name: Migration Check
on:
  pull_request:
    paths: ['supabase/migrations/**']
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db start
      - run: supabase db diff --linked  # Verify no drift
```

**Enhancement:** Add Playwright E2E to CI (runs against localhost + local Supabase).

### Step 7 — Document and update ADR-005

**Action:** Update `launch-readiness-architecture.md`:
- Mark ADR-005 as **DECIDED — Remote Sandbox first**: Alt B is the immediately executable track
- Note explicitly: **strategic target may remain Hybrid (Alt C)** pending Docker availability and project owner decision
- Update environment table with sandbox entry
- Add migration verification process

**Update:** `launch-control.md`:
- Phase 1B status → 🟡 In Progress (remote sandbox track)
- Update Phase 1B leverabler with checked items

---

## 5. Expected Artifacts

| Artifact | Type | Description |
|----------|------|-------------|
| Supabase sandbox project | Infrastructure | New Supabase project for dev/preview |
| `.env.sandbox` | Config file | Sandbox environment variables |
| `.env.local.example` (updated) | Config file | Updated with sandbox instructions |
| `supabase/config.toml` | Config file | Enables future local Supabase |
| `.github/workflows/migration-check.yml` | CI config | Migration drift detection |
| `launch-readiness-architecture.md` (updated) | Documentation | ADR-005 updated (remote sandbox first, hybrid TBD) |
| `launch-control.md` (updated) | Documentation | Phase 1B marked in progress |

---

## 6. Post-1B: Recommended Next Phases

After Phase 1B is complete, the recommended order is:

### Phase 6 — Documentation Cleanup (can start in parallel with 1B)

**Reason:** 397 markdown files (6.5 MB) across the repo. Many are outdated AI-generated execution briefs. This directly impacts AI agent effectiveness — outdated docs cause "AI drift" where agents try to use deleted components or re-implement completed features.

**Effort:** Low-Medium (mostly deletions and consolidation).

### Phase 2 — Test Foundation (after 1B)

**Reason:** With sandbox available, tests can now safely:
- Seed test data
- Run destructive assertions
- Use `supabase db reset` between test runs

**Important reclassification (GPT-calibrated):** Phase 2 is **not absent — it is fragmented and not launch-gated**. 84 test files exist (12 E2E + 72 unit), and 4 CI workflows already run (Vitest, TypeCheck, RLS, i18n). The work is therefore:

1. **Inventory existing test mass** — verify what passes, what's stale, what's meaningful
2. **Classify coverage** — map tests to golden-path flows and domains
3. **Connect critical tests to CI** — add Playwright E2E to GitHub Actions
4. **Define minimum launch gate** — which tests must pass for release confidence

### Phase 5 — Regression Audits (after 2)

**Reason:** Re-run domain audits to verify nothing has regressed. Most effective after test foundation provides automated verification.

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 304 migrations fail on sandbox | Medium | Medium | Run incrementally, fix any ordering issues |
| Sandbox project costs money | Low | Low | Free tier covers dev needs |
| Team forgets to switch env | Medium | High | Add startup check in `next.config.ts` or middleware |
| Vercel env misconfiguration | Low | High | Document exact variable names/values in architecture doc |
| Seed data insufficient | Medium | Low | Iteratively add seed data as needed |

---

## 8. Definition of Done — Phase 1B

- [ ] Sandbox Supabase project created and accessible
- [ ] All 304 migrations applied to sandbox
- [ ] Seed data loaded on sandbox
- [ ] `.env.local` switched to sandbox for development
- [ ] Vercel Preview environment uses sandbox
- [ ] Vercel Production environment unchanged (uses prod)
- [ ] `supabase/config.toml` created
- [ ] Migration check CI workflow added
- [ ] `launch-readiness-architecture.md` updated (ADR-005 decided)
- [ ] `launch-control.md` Phase 1B marked complete
