# Support / Tickets Audit (#15)

> **Scope:** Support tickets, FAQ/KB, contact form, feedback, bug reports, SLA tracking, admin support dashboard, routing rules  
> **Auditor:** Claude (automated, independently verified)  
> **Status:** ✅ Complete — GPT-calibrated (2026-03-12)  
> **Date:** 2026-03-12  

---

## Executive Summary

**10 findings (0 P0, 0 P1, 8 P2, 2 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 8 | Post-launch hardening |
| P3 | 2 | Polish |

The Support domain is a **fully implemented, production-grade system** — not a placeholder. It includes user-facing ticket creation/messaging (3 app pages), admin support hub/dashboard (6 admin pages), 6 server action files, 7+ database tables with full RLS, SLA tracking with escalation, routing rules, notification templates, and FAQ/KB management.

Security posture is **solid**: auth is properly layered (server action + RLS), internal notes are hidden from users, notifications have idempotency, and the FAQ RLS hole was proactively caught and fixed (migration `20260111100000`). The key gaps are input validation (no Zod schemas), overly broad RLS SELECT policies on tickets/messages (all tenant members can read all org tickets), PostgREST search interpolation (same pattern as GAME-004), and a missing `await` bug in routing rule creation.

---

## Findings

### SUP-001 — No Zod schema validation on support server actions (P2)

**Category:** Input Validation  
**Location:** `app/actions/tickets-user.ts` L80–93, `app/actions/tickets-admin.ts` L652–657, `app/actions/support-automation.ts` L200–240

**Description:** None of the 6 support server action files use Zod. Inputs like `CreateTicketInput`, `AddUserMessageInput`, `CreateRoutingRuleInput`, `CreateFAQInput` are TypeScript interfaces only — no runtime validation. All fields validated only via `.trim()` / truthy checks. No max-length enforcement on `title`, `description`, or `message` fields.

**Risk:** Unbounded text can be sent to the database (Postgres `text` type accepts any length). Not P1 because RLS provides baseline protection and server actions require authentication.

**Cross-reference:** Same pattern as PLAN-012 (calendar), PROF-003 (profile).

**Remediation:** Add Zod schemas. Enforce `z.string().max(200)` on title, `z.string().max(10000)` on description/message, `z.enum()` on category/priority.

---

### SUP-002 — Search input interpolated unsanitized into PostgREST `.or()` filters (P2)

**Category:** Input Sanitization  
**Location:** `app/actions/tickets-admin.ts` L279, `app/actions/feedback-admin.ts` L134, `app/actions/support-kb.ts` L159, L490

**Description:** Raw user `search` parameter is interpolated directly into PostgREST `.or()` and `.ilike()` filters without stripping metacharacters. Same vulnerable pattern as remediated GAME-004.

```ts
// tickets-admin.ts L279
query = query.or(`title.ilike.%${search}%,ticket_key.ilike.%${search}%,description.ilike.%${search}%`);
```

**Risk:** PostgREST DSL metacharacters `,()` in search strings could manipulate filter logic. RLS + AND-chain containment limits practical exploitation — consistent with GAME-004's calibrated P2.

**Remediation:** Apply `search.replace(/[,()]/g, '')` before interpolation — project's established pattern from Games M2.

---

### SUP-003 — Missing `await` on `createServiceRoleClient()` in `createRoutingRule()` (P2)

**Category:** Functional Bug  
**Location:** `app/actions/support-automation.ts` L223

**Description:** `createServiceRoleClient()` returns a Promise, but `createRoutingRule()` calls it without `await`. The variable `supabase` is a Promise, not a client instance — all subsequent DB operations will fail with a runtime error. This means routing rules can never be created.

```ts
// L223 — missing await
const supabase = createServiceRoleClient();
// All other usages in same file correctly use:
const supabase = await createServiceRoleClient(); // L279, L347, etc.
```

**Risk:** Functional bug — routing rule creation is broken. Not a security issue (fails safely). Not P1 because routing rules are an admin feature and the system works without them.

**Remediation:** Add `await`: `const supabase = await createServiceRoleClient();`

---

### SUP-004 — RLS UPDATE policy on `support_tickets` excludes system admins; no DELETE policy (P2)

**Category:** RLS Coverage  
**Location:** `supabase/migrations/20251129000003_support_domain.sql` L218–224

**Description:** The `admins_can_update_tickets` policy requires `tenant_id = ANY(get_user_tenant_ids()) AND has_tenant_role(...)`. System admins not enrolled as tenant members cannot update tickets via RLS client. Additionally, no DELETE policy exists — tickets can never be deleted via RLS.

```sql
CREATE POLICY "admins_can_update_tickets"
ON support_tickets FOR UPDATE
USING (
  tenant_id = ANY(get_user_tenant_ids())
  AND (has_tenant_role(tenant_id, 'admin') OR has_tenant_role(tenant_id, 'owner'))
);
-- No DELETE policy at all
```

**Risk:** System admin operations work only because `tickets-admin.ts` uses `createServiceRoleClient()` for system admins. RLS policy itself is incomplete — if any code path uses RLS client for system admin updates, it will silently fail. Not P1 because server actions handle this correctly.

**Remediation:** Add `OR public.is_system_admin()` to UPDATE policy. Consider whether ticket deletion should be supported.

---

### SUP-005 — Dead client-side `supportService.ts` bypasses server validation (P2)

**Category:** Dead Code / Architecture  
**Location:** `lib/services/supportService.ts` (entire file, ~520 lines)

**Description:** This file uses the browser Supabase client to perform direct `.insert()`, `.update()`, `.delete()` operations (create tickets, update status, assign, add messages) without any server-side validation. **Verified: zero imports exist** — all app pages use server actions instead, making this dead code.

The file was identified in Phase 0 analysis (`docs/ARCH_ANALYSIS_SUPPORT_TICKETS_PHASE0.md`) but never removed.

**Risk:** Dead code that could be accidentally imported, bypassing server-side validation and audit trails. Not P1 because RLS still applies and no active callers exist.

**Remediation:** Delete `lib/services/supportService.ts`.

---

### SUP-006 — No rate limiting on ticket/feedback creation (P2)

**Category:** Abuse Prevention  
**Location:** `app/actions/tickets-user.ts` L80–125 (`createUserTicket`), L300–340 (`addUserTicketMessage`)

**Description:** `createUserTicket()` and `addUserTicketMessage()` have no rate limiting, throttling, or per-user creation caps. An authenticated user can spam-create tickets indefinitely.

**Risk:** DoS against admin dashboard and storage. Not P1 because authentication is required and RLS scopes user data.

**Cross-reference:** Same pattern as abuse audit (SEC-002a — rate limiting covers 13.6% of routes).

**Remediation:** Add rate limiting to `createUserTicket()` (e.g., 5/min) and `addUserTicketMessage()` (e.g., 10/min).

---

### SUP-007 — GDPR data export/deletion does not cover support tables (P2)

**Category:** Privacy / Compliance  
**Location:** `lib/gdpr/user-rights.ts`, `lib/gdpr/data-registry.ts`

**Description:** The GDPR deletion function covers only `user_consents`, `cookie_consents`, and `user_tenant_memberships`. The 5 support tables (`support_tickets`, `ticket_messages`, `feedback`, `bug_reports`, `support_reports`) are not included in deletion or export. The data registry has no entry for support domain data.

**Risk:** Manual DSAR processing must account for these tables. Already partially tracked in PRIV-001/003. Not P1 because self-service GDPR is kill-switched and manual DSAR via `privacy@lekbanken.se` covers all data.

**Remediation:** Add support tables to the GDPR data registry. Document in ops runbook for manual DSAR. Note: if `users` row is ever deleted, `ON DELETE CASCADE` will cascade to tickets/messages.

---

### SUP-008 — Hardcoded Swedish strings in contact/ticket detail pages (P3)

**Category:** i18n  
**Location:** `app/app/support/contact/page.tsx` L2, `app/app/support/tickets/[id]/page.tsx` L2

**Description:** These files bypass the project's i18n convention with `/* eslint-disable lekbanken/no-hardcoded-strings */`. All UI text ("Ärende", "Tekniskt problem", "Fakturering", "Öppen", "Pågår", etc.) is hardcoded in Swedish. The main support page (`/app/support`) correctly uses `useTranslations()`.

**Remediation:** Move strings to `messages/{sv,en,no}.json` under `app.support.*` keys.

---

### SUP-009 — `ticket_messages` RLS allows any tenant member to read all messages (P2)

**Category:** RLS / Privacy  
**Location:** `supabase/migrations/20251129000003_support_domain.sql` L227–236

**Description:** The SELECT policy on `ticket_messages` includes `tenant_id = ANY(get_user_tenant_ids())` in the subquery, meaning any tenant member (including regular `member` role) can read all ticket messages for that tenant's tickets — including sensitive support conversations from other users.

```sql
CREATE POLICY "users_can_select_ticket_messages"
ON ticket_messages FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
       OR assigned_to_user_id = auth.uid()
       OR tenant_id = ANY(get_user_tenant_ids())  -- Too broad
  )
);
```

**Risk:** Regular members can read other users' support conversations within the same org. The policy name "users_can_select_**own**_tickets" suggests intent was to limit scope. Not P1 because it's within the same tenant boundary and B2B context where shared ticket queues can be a valid feature.

**Remediation:** Restrict tenant scope to admin/owner roles in the subquery.

---

### SUP-010 — `support_tickets` SELECT RLS allows any tenant member to read all tickets (P3)

**Category:** RLS / Privacy  
**Location:** `supabase/migrations/20251129000003_support_domain.sql` L198–206

**Description:** Same pattern as SUP-009. The `users_can_select_own_tickets` policy includes `tenant_id = ANY(get_user_tenant_ids())`, allowing any tenant member to query all tickets for their organization. In a B2B context, shared ticket visibility could be intentional (many helpdesk systems work this way). The policy name suggests otherwise.

```sql
CREATE POLICY "users_can_select_own_tickets"
ON support_tickets FOR SELECT
USING (
  user_id = auth.uid()
  OR assigned_to_user_id = auth.uid()
  OR tenant_id = ANY(get_user_tenant_ids())  -- Broad
);
```

**Risk:** Lower than SUP-009 because ticket metadata (title, status, category) is less sensitive than message content. Design intent unclear — could be intentional for shared support queues.

**Remediation:** Product decision: if shared ticket queue is intended, rename policy and document. Otherwise, restrict to admin/owner.

---

## Cross-References (Already Tracked)

| Issue | Tracked In | Finding ID | Status |
|-------|-----------|------------|--------|
| PostgREST search interpolation | games-audit.md | GAME-004 (P2) | ✅ Fixed in Games M2 — pattern not yet applied to support |
| GDPR data coverage | abuse-privacy-audit.md | PRIV-001/003 (P1) | ✅ Kill-switched — manual DSAR covers all data |
| Rate limiting coverage | abuse-privacy-audit.md | SEC-002a | 🟡 Open — 13.6% coverage |
| Error message leakage | abuse-privacy-audit.md | LEAK-001 (P1) | 🟡 Open — planned remediation |

---

## Positive Findings

| # | Finding | Details |
|---|---------|---------|
| P1 | Server actions with proper auth layering | `tickets-user.ts` authenticates via `getUser()` + RLS client, explicitly filters by `user_id = user.id` belt-and-suspenders |
| P2 | Internal notes hidden from users | `listUserTicketMessages()` filters `.eq('is_internal', false)`, `addUserTicketMessage()` forces `is_internal: false` server-side |
| P3 | Ticket status transitions validated | Users can't reply to closed tickets. Auto-updates `waiting_for_user → open` on user reply |
| P4 | SLA tracking well-implemented | `first_response_at` set only on first admin non-internal reply. SLA deadline, escalation level, `sla_breached` columns |
| P5 | Notification idempotency | `event_key` with unique constraint prevents duplicate notifications |
| P6 | FAQ RLS proactively fixed | Initial migration allowed any auth user CRUD on global FAQs — caught and fixed in migration `20260111100000` |
| P7 | Service role usage scoped | Admin actions use service role only when verified as system admin via `isSystemAdmin()`. Tenant admins use RLS client |
| P8 | SLA escalation has re-escalation guard | `escalate_overdue_tickets()` prevents re-escalation within 1 hour, stops at `urgent` priority |
| P9 | Routing rules have safety limit | `apply_ticket_routing_rules()` limits to 5 matching rules, preventing infinite loops |
| P10 | Comprehensive data model | Well-designed tables with FKs, cascading deletes, indexes, and enum types |

---

## Severity Distribution

| Finding | Category | Severity | Remediation |
|---------|----------|----------|-------------|
| SUP-001 | Input Validation | P2 | Add Zod schemas to all support server actions |
| SUP-002 | Input Sanitization | P2 | Apply GAME-004 sanitization to 4 search sites |
| SUP-003 | Functional Bug | P2 | Add missing `await` in `createRoutingRule()` |
| SUP-004 | RLS Coverage | P2 | Add `is_system_admin()` to UPDATE, consider DELETE |
| SUP-005 | Dead Code | P2 | Delete `lib/services/supportService.ts` |
| SUP-006 | Abuse Prevention | P2 | Rate limit ticket/message creation |
| SUP-007 | Privacy | P2 | Add support tables to GDPR registry |
| SUP-008 | i18n | P3 | Move hardcoded Swedish to translation files |
| SUP-009 | RLS / Privacy | P2 | Restrict ticket_messages read to owner/assignee/admin |
| SUP-010 | RLS / Privacy | P3 | Product decision: shared queue or restrict SELECT |

---

## Remediation Milestones

### M1 — Quick Wins (SUP-003, SUP-005) — Post-launch
- [ ] Fix missing `await` in `support-automation.ts` L223
- [ ] Delete dead `lib/services/supportService.ts`

### M2 — Input Validation + Search Sanitization (SUP-001, SUP-002) — Post-launch
- [ ] Add Zod schemas to all support server actions
- [ ] Apply `search.replace(/[,()]/g, '')` to 4 search interpolation sites

### M3 — RLS Hardening (SUP-004, SUP-009, SUP-010) — Post-launch
- [ ] Add `is_system_admin()` to tickets UPDATE policy
- [ ] Restrict ticket/messages SELECT to owner/assignee/admin (product decision required)
- [ ] Consider adding DELETE policy

### M4 — Compliance + Polish (SUP-006, SUP-007, SUP-008) — Post-launch
- [ ] Add rate limiting to ticket/message creation
- [ ] Add support tables to GDPR data registry
- [ ] Move hardcoded Swedish strings to i18n

---

## Files Examined

### Server Actions
- `app/actions/tickets-user.ts` — User ticket operations
- `app/actions/tickets-admin.ts` — Admin ticket management
- `app/actions/support-hub.ts` — Support dashboard
- `app/actions/support-kb.ts` — FAQ/KB management
- `app/actions/support-automation.ts` — Routing rules, automation
- `app/actions/feedback-admin.ts` — Feedback management

### App Pages
- `app/app/support/page.tsx` — Main support page (uses `useTranslations`)
- `app/app/support/contact/page.tsx` — Contact form (hardcoded Swedish)
- `app/app/support/tickets/[id]/page.tsx` — Ticket detail (hardcoded Swedish)
- `app/admin/support/page.tsx` — Admin support dashboard

### Services
- `lib/services/supportService.ts` — Dead client-side service (zero imports)

### GDPR
- `lib/gdpr/user-rights.ts` — Missing support tables
- `lib/gdpr/data-registry.ts` — Missing support entries

### Migrations / RLS
- `supabase/migrations/20251129000003_support_domain.sql` — Main schema + RLS
- `supabase/migrations/20260111000001_support_faq_entries.sql` — FAQ entries
- `supabase/migrations/20260111100000_fix_faq_rls_global.sql` — FAQ RLS fix
- `supabase/migrations/20260111200000_tickets_sla_and_notification_idempotency.sql` — SLA tracking
- `supabase/migrations/20260111300000_support_automation_rules_templates.sql` — Routing rules

### i18n
- `messages/sv.json` — Support translation keys verified

### Cross-reference
- `docs/ARCH_ANALYSIS_SUPPORT_TICKETS_PHASE0.md` — Phase 0 support analysis
- `launch-readiness/audits/abuse-privacy-audit.md` — LEAK-001, PRIV-001/003, SEC-002a
