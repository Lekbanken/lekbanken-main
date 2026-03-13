# Calendar Domain Audit (#17)

**Date:** 2026-03-12
**Auditor:** Claude (Opus)
**Status:** ✅ Complete — GPT-calibrated (2026-03-12)
**Scope:** Scheduling, date picker, plan linking, calendar UI, calendar data model, recurring events, timezone handling

---

## Domain Classification

**The Calendar is NOT a standalone domain.** It is a **sub-feature of the Planner domain**, scoped entirely under `features/planner/calendar/` and mounted at `/app/planner/calendar`. It shares the Planner's API namespace (`/api/plans/schedules`), uses the Planner's capability system (`requirePlanEditAccess`), and is gated by the Planner's feature flag system (`planner_calendar`).

All calendar data lives in a single table: `plan_schedules`. There is no separate "Calendar" database schema or independent domain boundary.

---

## Architecture Overview

| Layer | Location | Description |
|-------|----------|-------------|
| Page | `app/app/planner/calendar/page.tsx` | Feature-flagged calendar page |
| Components | `features/planner/calendar/components/` (7 files) | Custom calendar UI |
| Hooks | `features/planner/calendar/hooks/` (2 hooks) | `useCalendar`, `useSchedules` |
| Utils | `features/planner/calendar/utils/` (2 files) | Date math, grid generation |
| Types | `features/planner/calendar/types.ts` | TypeScript interfaces |
| API (collection) | `app/api/plans/schedules/route.ts` | GET (list), POST (create) |
| API (single) | `app/api/plans/schedules/[scheduleId]/route.ts` | GET, PUT, DELETE |
| DB Table | `plan_schedules` | Columns: id, plan_id, scheduled_date, scheduled_time, recurrence_rule, notes, status, group_id, group_name, location, completed_at, created_by, created_at, updated_at |
| RLS | `20260305100000_tenant_rls_planner.sql` L156–184 | SELECT/INSERT/UPDATE/DELETE policies |
| Feature flag | `lib/features/planner-features.ts` | `planner_calendar` (default: enabled) |
| i18n | `messages/sv.json` L895–929 | 25 Swedish translation keys |

---

## FINDINGS

### CAL-001 — No Zod schema validation on schedule endpoints (P2)

**Category:** Input Validation
**Location:** `app/api/plans/schedules/route.ts` L130–135, `app/api/plans/schedules/[scheduleId]/route.ts` L96–115
**Severity:** P2 — Defense-in-depth gap. DB schema provides some constraints, but invalid shapes pass through to Supabase.

**Description:** All schedule API endpoints use raw `req.json() as Type` with manual field checks instead of Zod validation. This means:
- GET: `from`/`to` query params accept any string (not validated as ISO dates)
- POST: `scheduledDate` accepts any string, `scheduledTime` not validated as HH:mm
- PUT: `scheduledDate`, `scheduledTime`, `status` not validated
- POST/PUT: `recurrence` object structure (type, interval, daysOfWeek, endDate) not validated
- `notes` field accepts arbitrary-length strings (no max length)

**Evidence:**
```ts
// route.ts L130
const body = await req.json() as CreateScheduleInput;
if (!body.planId || !body.scheduledDate) {
  return NextResponse.json(
    { error: 'Missing required fields: planId, scheduledDate' },
    { status: 400 }
  );
}
// No format or type validation beyond presence check
```

**Cross-reference:** Already tracked as **PLAN-012** in planner-launch-audit.md.

**Remediation:** Add Zod schemas for `CreateScheduleInput`, `UpdateScheduleInput`, and query params. Example:
```ts
const CreateScheduleSchema = z.object({
  planId: z.string().uuid(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  recurrence: RecurrenceSchema.optional(),
  notes: z.string().max(2000).optional(),
});
```

---

### CAL-002 — parseRecurrence returns unvalidated JSON to client (P3)

**Category:** Input Validation / Data Integrity
**Location:** `app/api/plans/schedules/route.ts` L216–222, `app/api/plans/schedules/[scheduleId]/route.ts` L224–230
**Severity:** P3 — Low risk. JSON.parse is safe from injection, but malformed data gets returned to the client.

**Description:** The `parseRecurrence` function does `JSON.parse(ruleStr)` and returns the result directly typed as `RecurrenceRule`. If stored JSON doesn't match the expected shape (e.g., missing `type`, unexpected properties), the client receives an invalid object. The same helper is also duplicated across both route files.

**Evidence:**
```ts
function parseRecurrence(ruleStr: string): RecurrenceRule | undefined {
  try {
    return JSON.parse(ruleStr); // No runtime type validation
  } catch {
    return undefined;
  }
}
```

**Remediation:** Validate parsed JSON against a Zod schema. Extract to shared module to eliminate duplication.

---

### CAL-003 — Supabase error messages leaked in schedule API responses (P2)

**Category:** Information Disclosure
**Location:** `app/api/plans/schedules/route.ts` L64, L174, `app/api/plans/schedules/[scheduleId]/route.ts` L200
**Severity:** P2 — Leaks table names, column names, and PostgreSQL error codes to the client.

**Description:** When Supabase queries fail, the raw `error.message` is returned in the API response. This exposes internal schema details.

**Evidence:**
```ts
// route.ts L64
if (scheduleError) {
  console.error('[schedules] fetch error:', scheduleError);
  return NextResponse.json({ error: scheduleError.message }, { status: 500 });
}
// route.ts L174
if (error) {
  console.error('[schedules] create error:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
}
```

**Cross-reference:** Already tracked as **LEAK-001** in abuse-privacy-audit.md (plans/schedules explicitly listed).

**Remediation:** Return generic error message: `{ error: 'Failed to create schedule' }`. Log details server-side only.

---

### CAL-004 — Recurrence rules stored but never expanded (P3)

**Category:** Feature Completeness / Data Integrity
**Location:** `app/api/plans/schedules/route.ts` L166, `features/planner/calendar/types.ts` L15–22
**Severity:** P3 — Feature gap, not a security issue. No user-facing promise of recurring scheduling.

**Description:** The API accepts `recurrence` objects (daily/weekly/monthly with interval, daysOfWeek, endDate) and stores them as JSON in `recurrence_rule`. However:
1. No backend logic expands recurrence into future schedule instances
2. GET queries only return schedules where `scheduled_date` falls in the requested range — recurring entries only appear on their original date
3. The calendar UI displays the recurrence data but it has no practical effect

**Evidence:**
```ts
// POST handler stores recurrence but creates a single row:
.insert({
  plan_id: body.planId,
  scheduled_date: body.scheduledDate,
  recurrence_rule: body.recurrence ? JSON.stringify(body.recurrence) : null,
  // Only 1 row created regardless of recurrence
})
```

**Remediation:** Either: (a) remove recurrence from the API/UI until expansion is implemented, or (b) implement a background job or GET-time expansion of recurrence rules. Document as a known limitation.

---

### CAL-005 — No error boundary for calendar route segment (P3)

**Category:** Resilience / UX
**Location:** `app/app/planner/calendar/` — missing `error.tsx` and `loading.tsx`
**Severity:** P3 — A runtime error in the calendar crashes the entire page with no recovery option.

**Description:** The calendar page at `/app/planner/calendar` has no `error.tsx` or `loading.tsx`. A runtime error (e.g., invalid date, network failure during render) propagates to the nearest parent error boundary.

**Cross-reference:** Already noted in architecture-audit.md (many route segments missing error boundaries).

**Remediation:** Add `error.tsx` with retry button and `loading.tsx` with skeleton UI.

---

### CAL-006 — No rate limiting on schedule creation endpoint (P2)

**Category:** Abuse Prevention
**Location:** `app/api/plans/schedules/route.ts` POST handler
**Severity:** P2 — A user can create unlimited schedule entries, potentially causing performance degradation and storage bloat.

**Description:** POST `/api/plans/schedules` has no rate limiting or per-user quota. While `requirePlanEditAccess` prevents cross-plan abuse, a user with edit access to a plan could create thousands of schedule entries.

**Cross-reference:** Already tracked in abuse-privacy-audit.md (plans/schedules listed as affected route).

**Remediation:** Add rate limiting via `apiHandler` rate limit option or middleware. Consider a reasonable per-plan schedule limit (e.g., max 365 active schedules per plan).

---

### CAL-007 — plan_schedules table creation not in tracked migrations (P3)

**Category:** Database Governance
**Location:** No migration file found
**Severity:** P3 — The table exists and works, but there's no migration file documenting its creation. This complicates re-provisioning and schema auditing.

**Description:** The `plan_schedules` table was created outside tracked migration files (likely via Supabase Dashboard). The `planner-implementation-plan.md` explicitly documents this: "⚠️ CREATE TABLE migration — Saknas i migreringsfiler — tabellen skapades troligen via Supabase Dashboard eller en squashed migration."

RLS policies *are* tracked (migration `20260305100000`), but the DDL is not.

**Remediation:** Add a backfill migration with `CREATE TABLE IF NOT EXISTS plan_schedules (...)` to document the schema for reproducibility.

---

## POSITIVE FINDINGS

1. **All 5 API handlers wrapped in `apiHandler()`** — Uses centralized auth wrapper with `auth: 'user'`. No raw `getServerSession()` calls. (route.ts L13, L120; [scheduleId]/route.ts L12, L72, L170)

2. **`requirePlanEditAccess()` on all mutation handlers** — POST, PUT, and DELETE all call capability checks before any DB mutation. GET routes correctly use RLS-only access (reads cascade via plan visibility). PLAN-006 fully resolved.

3. **Comprehensive RLS policies** — SELECT cascades via plans table + own schedules. INSERT requires `created_by = auth.uid()`. UPDATE/DELETE restricted to own schedules + system_admin. Properly scoped in migration `20260305100000`.

4. **Feature-flagged deployment** — Calendar gated by `planner_calendar` flag via `usePlannerFeature()`. Graceful fallback shows "coming soon" UI when disabled. No dead route exposure.

5. **Custom calendar (zero third-party dependencies)** — Built with pure React + Intl API. No FullCalendar, react-big-calendar, or other heavy libraries to maintain/audit for vulnerabilities.

6. **Proper locale support** — Swedish (sv-SE), English (en-US), Norwegian (nb-NO) via BCP-47 locale mapping. Monday-start weeks correct for Swedish locale. ISO 8601 week numbering.

7. **Timezone-safe date handling** — `toISODateString()` uses local time components (getFullYear/getMonth/getDate) instead of `toISOString()` which would shift dates across timezone boundaries. All dates stored as `DATE` type in DB (no timestamp drift). Comments document the reasoning.

8. **Plan deletion cascades to schedules** — FK `plan_schedules_plan_id_fkey` → plans with CASCADE delete (confirmed via generated types). No orphaned schedule entries when a plan is deleted.

9. **`ScheduleCard` wrapped in `React.memo`** — Prevents unnecessary re-renders in the schedule list.

10. **`useSchedules` hook has proper cleanup** — Uses `cancelled` flag pattern for async operations to prevent state updates on unmounted components.

11. **Complete i18n coverage** — All 25 user-facing strings in Swedish translation file (`messages/sv.json` L895–929). No hardcoded Swedish text in components.

12. **Calendar view preference persisted** — User's month/week view choice saved to localStorage with graceful fallback (mobile defaults to week view).

13. **Responsive split layout** — Desktop: side-by-side (calendar + schedule list). Mobile: stacked. Uses standard Tailwind breakpoints.

14. **Active run integration** — Calendar shows amber "in progress" dots for plans with active play runs, with "Fortsätt" (Resume) button instead of "Starta". Connects calendar to play domain.

---

## FILES EXAMINED

### Route Files
- `app/api/plans/schedules/route.ts` (222 lines — GET, POST)
- `app/api/plans/schedules/[scheduleId]/route.ts` (230 lines — GET, PUT, DELETE)

### Page Files
- `app/app/planner/calendar/page.tsx` (50 lines)

### Feature Components
- `features/planner/calendar/components/PlanCalendar.tsx` (192 lines)
- `features/planner/calendar/components/CalendarGrid.tsx` (82 lines)
- `features/planner/calendar/components/CalendarHeader.tsx` (128 lines)
- `features/planner/calendar/components/CalendarDay.tsx` (110 lines)
- `features/planner/calendar/components/ScheduleList.tsx` (155 lines)
- `features/planner/calendar/components/ScheduleCard.tsx` (210+ lines)
- `features/planner/calendar/components/PlanPickerModal.tsx` (195 lines)
- `features/planner/calendar/components/index.ts` (11 lines)

### Hooks
- `features/planner/calendar/hooks/useCalendar.ts` (240 lines)
- `features/planner/calendar/hooks/useSchedules.ts` (325 lines)
- `features/planner/calendar/hooks/index.ts` (5 lines)

### Utils
- `features/planner/calendar/utils/dateUtils.ts` (240 lines)
- `features/planner/calendar/utils/calendarUtils.ts` (175 lines)
- `features/planner/calendar/utils/index.ts` (5 lines)

### Types
- `features/planner/calendar/types.ts` (120 lines)
- `features/planner/calendar/index.ts` (47 lines)

### Infrastructure
- `lib/features/planner-features.ts` (60 lines — feature flag system)
- `types/supabase.ts` L8560–8640 (generated plan_schedules types)

### Migrations / RLS
- `supabase/migrations/20260305100000_tenant_rls_planner.sql` L155–184 (plan_schedules RLS)
- `supabase/migrations/20260220220000_fix_policy_initplan_and_search_path.sql` L145–146 (prior policy)
- `supabase/migrations/20251129000009_content_planner_domain.sql` L23–101 (content_schedules — unrelated)

### i18n
- `messages/sv.json` L895–929 (calendar translation keys)

### Cross-reference Documents
- `launch-readiness/audits/planner-launch-audit.md` (PLAN-006, PLAN-012)
- `launch-readiness/audits/abuse-privacy-audit.md` (LEAK-001, rate limiting)
- `planner-implementation-plan.md` (plan_schedules verification)
- `planner-architecture.md` (route mapping, feature flags)

---

## SUMMARY

| Severity | Count |
|----------|-------|
| P0 (Critical) | 0 |
| P1 (High) | 0 |
| P2 (Medium) | 3 |
| P3 (Low) | 4 |
| **Total** | **7** |

### Overall Assessment

The Calendar domain is a **well-implemented sub-feature of the Planner** — not a standalone domain. It has solid security fundamentals:

- **Auth:** All routes wrapped in `apiHandler()`, capability checks on all mutations, RLS on all operations.
- **Tenant isolation:** RLS policies properly cascade from plans table. No cross-tenant access possible.
- **No P0/P1 findings:** No critical security gaps. All serious issues (PLAN-006) were already fixed.

The main gaps are **input validation** (no Zod schemas — CAL-001, already tracked as PLAN-012) and **information disclosure** (Supabase error leaks — CAL-003, already tracked as LEAK-001). Both are tracked findings from prior audits with remediation planned.

The recurrence feature (CAL-004) is a stored-but-unused data pattern — not harmful, but should be either completed or removed before it confuses users.

### Overlap with Prior Audits

| This Audit | Prior Finding | Status |
|------------|---------------|--------|
| CAL-001 | PLAN-012 (P2) | Open — post-launch |
| CAL-003 | LEAK-001 (P2) | Open — remediation planned |
| CAL-006 | Abuse audit (P2) | Open — rate limiting batch |
| — | PLAN-006 (P1) | ✅ FIXED (M2) |
