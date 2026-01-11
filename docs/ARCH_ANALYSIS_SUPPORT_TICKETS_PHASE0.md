# Phase 0: Architecture & Reality Analysis — Support & Tickets Admin

**Document Status:** READ-ONLY ANALYSIS  
**Feature Area (current):** `/admin/tickets`  
**Candidate Domain:** `/admin/support/*`  
**Date:** 2026-01-11  
**Purpose:** Surface facts, constraints, risks, and IA decisions BEFORE Phase 1/2 work

---

## 🎯 Core Question

> Is **Tickets** a standalone admin domain, or should it be a **sub-domain of Support** together with FAQ, Help articles, Notifications, and Automation rules?

**Answer:** Based on the evidence gathered, **Tickets should remain a standalone admin domain**, but there is a product decision needed about whether to consolidate it under a future **Support** parent group in the sidebar. See Section G for full analysis.

---

## Section A — Route & Navigation Inventory

### A.1 Route Scan

| File Path | URL | Type | Audience | Guard | Tenant-aware | Status |
|-----------|-----|------|----------|-------|--------------|--------|
| `app/admin/tickets/page.tsx` | `/admin/tickets` | Page | Admin | `SystemAdminClientGuard` | Yes (via `useTenant`) | ✅ Functional |
| `app/admin/support/page.tsx` | `/admin/support` | Redirect | Admin | None | N/A | ⚠️ Redirects to `/admin/tickets` |
| `app/admin/notifications/page.tsx` | `/admin/notifications` | Page | Admin | `SystemAdminClientGuard` | Yes (via `useTenant`) | ✅ Functional (send only) |
| `app/app/support/page.tsx` | `/app/support` | Page | User | Layout auth | Yes (implicit) | ⚠️ Partial (mock data) |
| `app/app/support/contact/page.tsx` | `/app/support/contact` | Page | User | Layout auth | No | ⚠️ Non-functional (simulated submit) |
| `app/app/notifications/page.tsx` | `/app/notifications` | Page | User | Layout auth | No | ⚠️ Mock data only |
| **NOT FOUND** | `/admin/faq` | — | — | — | — | ❌ Does not exist |
| **NOT FOUND** | `/admin/help` | — | — | — | — | ❌ Does not exist |
| **NOT FOUND** | `/api/tickets/*` | — | — | — | — | ❌ Does not exist |
| **NOT FOUND** | `/api/support/*` | — | — | — | — | ❌ Does not exist |

### A.2 Admin Layout Access Model

**Inspected:** `app/admin/layout.tsx`

```typescript
// Access Logic
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'
const allowedTenantRoles = new Set(['owner', 'admin', 'editor'])
const hasTenantAdminAccess = (authContext.memberships ?? []).some((m) =>
  allowedTenantRoles.has((m.role ?? 'member') as string)
)

if (!isSystemAdmin && !hasTenantAdminAccess) {
  redirect('/app')
}
```

**Truth Table:**

| Route | Layout Guard | Page Guard | Effective Access |
|-------|--------------|------------|------------------|
| `/admin/tickets` | System Admin OR Tenant Admin/Owner/Editor | `SystemAdminClientGuard` | **System Admin ONLY** |
| `/admin/notifications` | System Admin OR Tenant Admin/Owner/Editor | `SystemAdminClientGuard` | **System Admin ONLY** |
| `/admin/learning/*` | System Admin OR Tenant Admin/Owner/Editor | Varies (scope-based) | System Admin + Tenant Admin (scoped) |
| `/admin/gamification/*` | System Admin OR Tenant Admin/Owner/Editor | Varies | System Admin + Tenant Admin (scoped) |

**⚠️ Inconsistency Identified:**
- Tickets and Notifications use hard `SystemAdminClientGuard`
- Learning and Gamification use softer scope-based access
- **This means Tenant Admins CANNOT access Tickets admin**, unlike Learning/Gamification

### A.3 Navigation & IA Reality

**Inspected:** `lib/admin/nav.ts`

**Current Sidebar Structure (System Admin view):**

```
📊 Översikt
   ├─ Dashboard
   └─ Analys

🏢 Organisationer
   ├─ Alla organisationer
   ├─ Licenser & Planer
   └─ Fakturering

👥 Användare
   ├─ Alla användare
   └─ Deltagare

📦 Produkter
   ├─ Alla produkter
   ├─ Lekhanteraren
   └─ Planläggaren

🏆 Bibliotek
   ├─ Badges
   ├─ Coach Diagrams
   └─ Mediefiler

🎮 Gamification          ← Parent group with sub-pages
   ├─ Översikt
   ├─ DiceCoin & XP
   ├─ Achievements
   └─ Shop & Rewards

📚 Utbildning (Learning)  ← Parent group with sub-pages
   ├─ Översikt
   ├─ Kurser
   ├─ Lärstigar
   ├─ Krav & Grind
   └─ Rapporter

⚙️ Drift (Operations)     ← Tickets lives here
   ├─ Sessioner
   ├─ Moderering
   ├─ Ärenden (Tickets)   ← Current location
   └─ Incidenter

🔧 System
   ├─ Design
   ├─ Notifikationer      ← Notifications here (separate from Tickets)
   ├─ Feature Flags
   ├─ API-nycklar
   ├─ Webhooks
   ├─ System Health
   ├─ Granskningslogg
   ├─ Release Notes
   └─ Inställningar
```

**IA Observations:**

| Item | Location | Concern |
|------|----------|---------|
| Tickets (Ärenden) | Drift category | Grouped with Sessions, Moderation, Incidents |
| Notifications | System category | Separate from Tickets, despite being support-related |
| FAQ/Help | **ABSENT** | No admin route exists |
| Support | N/A | Not a nav category; `/admin/support` just redirects |

**Dead Links / Placeholders:**
- `/admin/support` exists but immediately redirects → effectively dead route
- No "Support" parent group in navigation

---

## Section B — Domain Model & Data Reality

### B.1 Database Tables

**Source:** `supabase/migrations/20251129000003_support_domain.sql` and `20251129000007_notifications_domain.sql`

| Table | Purpose | `tenant_id` | Scope | Status | Notes |
|-------|---------|-------------|-------|--------|-------|
| `feedback` | User feedback (bugs, features, etc.) | NULLABLE | Hybrid | ✅ Ready | Links to games, tenant optional |
| `support_tickets` | Support ticket tracking | NULLABLE | Hybrid | ✅ Ready | Full status/priority workflow |
| `ticket_messages` | Conversation threads on tickets | Via ticket | Inherited | ✅ Ready | Internal flag for admin notes |
| `support_reports` | Aggregated stats per tenant | NULLABLE | Tenant | ⚠️ Partial | Schema exists, no population logic |
| `bug_reports` | Detailed bug reports | NULLABLE | Hybrid | ✅ Ready | Steps to reproduce, browser info |
| `notifications` | User notification items | **NOT NULL** | Tenant | ✅ Ready | Always requires tenant |
| `notification_preferences` | Per-user notification settings | NULLABLE | Hybrid | ✅ Ready | Category-level toggles |
| `notification_log` | Delivery audit trail | Via notification | Inherited | ✅ Ready | Analytics-focused |

**Key Schema Facts:**
- `support_tickets.tenant_id` is **NULLABLE** → supports both tenant-scoped and "global" tickets
- `notifications.tenant_id` is **NOT NULL** → always tenant-scoped
- No `faq` or `help_articles` table exists
- No `automation_rules` or `routing_rules` table exists

### B.2 Ticket Lifecycle

```
                    ┌─────────────┐
                    │   CREATED   │
                    │  (by user)  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    OPEN     │ ◄────── Default status
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │IN_PROGRESS│ │WAITING_FOR│ │  CLOSED   │
       │           │ │   USER    │ │(abandoned)│
       └─────┬─────┘ └─────┬─────┘ └───────────┘
             │             │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │  RESOLVED   │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │   CLOSED    │
             └─────────────┘
```

**Assignment Model:**
- `assigned_to_user_id` → Optional, references `users.id`
- No role-based assignment (e.g., "assign to support team")
- No SLA fields in schema

**Priority Model:**
- `low`, `medium`, `high`, `urgent` (enum)
- No SLA or escalation rules

**Tags/Categories:**
- `category` → Free-text field, not enum
- No tag system

**Message Types:**
- `is_internal` boolean → distinguishes admin notes from user-visible replies

---

## Section C — APIs & Server Actions

### C.1 API Routes

| File | Method | Purpose | Auth Model | Tenant Validation | Status |
|------|--------|---------|------------|-------------------|--------|
| **NONE** | — | — | — | — | ❌ No API routes exist |

**Finding:** All ticket/support operations use **client-side Supabase calls** via `supportService.ts`, not server actions or API routes.

### C.2 Server Actions

| Function | Purpose | Admin/User | CRUD Level |
|----------|---------|------------|------------|
| **NONE in `app/actions/`** | — | — | — |

**Finding:** No server actions exist for tickets/support. This diverges from Learning and Gamification patterns, which use `app/actions/*.ts`.

### C.3 Service Layer (`lib/services/supportService.ts`)

| Function | Purpose | Access |
|----------|---------|--------|
| `submitFeedback` | Create feedback entry | User |
| `getUserFeedback` | List user's feedback | User |
| `createTicket` | Create support ticket | User |
| `getUserTickets` | List user's tickets | User |
| `getTicketById` | Get single ticket | User/Admin |
| `updateTicketStatus` | Change ticket status | Admin (RLS) |
| `updateTicketPriority` | Change priority | Admin (RLS) |
| `assignTicket` | Assign to user | Admin (RLS) |
| `addTicketMessage` | Post reply/note | User/Admin |
| `getTicketMessages` | Get conversation | User/Admin |
| `getAdminTickets` | List tickets for admin | Admin |
| `getTicketStats` | Aggregate statistics | Admin |
| `submitBugReport` | Create bug report | User |

**⚠️ Pattern Divergence:**
- Learning uses server actions (`app/actions/learning-admin.ts`) with explicit auth checks
- Support uses client-side service with RLS-only protection
- No audit logging for admin operations

---

## Section D — Admin UI Reality

### D.1 `/admin/tickets` Page

| Feature | Implemented | Real Data | Notes |
|---------|-------------|-----------|-------|
| Ticket list | ✅ Yes | ✅ Yes | Paginated, fetches from Supabase |
| Status filter | ✅ Yes | ✅ Yes | All 5 statuses |
| Priority filter | ✅ Yes | ✅ Yes | All 4 priorities |
| Search | ✅ Yes | ✅ Yes | Title/ID/Key search |
| Tenant filter | ❌ No | — | Uses `currentTenant` only, no cross-tenant |
| Assignment UI | ❌ No | — | Schema supports it, UI doesn't |
| Message thread | ✅ Yes | ✅ Yes | Shows all messages |
| Internal notes | ⚠️ Partial | ✅ Yes | Schema supports, UI always sends `isInternal: false` |
| Status transitions | ✅ Yes | ✅ Yes | Dropdown select |
| Bulk actions | ❌ No | — | Not implemented |
| Create ticket (admin) | ❌ No | — | Admins can only manage, not create |

**Summary:** Functional for basic ticket management, but missing:
- Assignment workflow
- Internal notes toggle
- Bulk operations
- Cross-tenant view (system admin)

### D.2 `/admin/notifications` Page

| Feature | Implemented | Real Data | Notes |
|---------|-------------|-----------|-------|
| Send notification | ✅ Yes | ✅ Yes | To all or specific users |
| Target selection | ✅ Yes | ✅ Yes | Checkboxes for users |
| Notification list | ❌ No | — | Only send, no history view |
| Templates | ❌ No | — | Freeform only |
| Scheduled send | ❌ No | — | Not implemented |
| Analytics | ❌ No | — | No delivery stats shown |

**Summary:** Send-only interface. No admin view of sent notifications or analytics.

### D.3 FAQ / Help Admin

**Status:** ❌ DOES NOT EXIST

- No database tables for FAQ or help articles
- No admin routes
- No navigation entries

---

## Section E — User (App-side) Reality

### E.1 `/app/support`

| Feature | Implemented | Real Data | Notes |
|---------|-------------|-----------|-------|
| Contact form | ✅ Yes | ❌ Mock | `handleSubmit` simulates success |
| Ticket list | ✅ Yes | ❌ Mock | Uses `mockTickets` array |
| FAQ | ✅ Yes | ❌ Mock | Uses `mockFAQs` array |
| Bug report | ❌ No | — | Type exists but no dedicated UI |

**Critical Finding:** The user-facing support page **does not actually create tickets**. It shows mock data and simulates submission.

### E.2 `/app/notifications`

| Feature | Implemented | Real Data | Notes |
|---------|-------------|-----------|-------|
| Notification list | ✅ Yes | ❌ Mock | Uses `mockNotifications` array |
| Mark as read | ✅ Yes | ❌ Local state | Not persisted to DB |
| Delete | ✅ Yes | ❌ Local state | Not persisted to DB |
| Filter (all/unread/read) | ✅ Yes | — | Works on mock data |

**Critical Finding:** User notifications page is **100% mock**. No Supabase integration despite service functions existing.

---

## Section F — Cross-Domain Dependencies

### F.1 Tickets DEPEND ON

| Domain | How | Coupling Level |
|--------|-----|----------------|
| Users | `user_id`, `assigned_to_user_id` FK | Strong |
| Tenants | `tenant_id` FK (nullable) | Medium |
| Games | `game_id` FK in feedback/bug_reports | Weak (optional) |
| Notifications | Could notify on status change | None (not implemented) |
| Roles | RLS uses `has_tenant_role()` | Medium |
| Files/Media | None | None |

### F.2 Other Domains DEPEND ON Tickets

| Domain | How | Notes |
|--------|-----|-------|
| Onboarding | None | — |
| Learning | None | — |
| Billing | None | — |
| Gamification | None | — |
| **None** | — | Tickets is a leaf domain |

**No circular dependencies detected.**

---

## Section G — IA & Product Ambiguity (CRITICAL)

### G.1 Is Tickets Standalone or Sub-domain?

**Evidence FOR Standalone `/admin/tickets`:**

1. **Current Implementation:** Tickets has its own service layer, schema, and admin page
2. **Precedent:** Moderation, Sessions, Incidents are siblings, not grouped under "Operations Hub"
3. **Scope:** Tickets is relatively simple (CRUD + status workflow)
4. **SUPPORT_DOMAIN.md:** Explicitly documents Support as its own domain

**Evidence FOR Sub-domain `/admin/support/tickets`:**

1. **Logical Grouping:** Tickets, FAQ, Help Articles, Bug Reports are conceptually "Support"
2. **Navigation Precedent:** Learning and Gamification use parent groups with sub-pages
3. **Future Expansion:** If FAQ/Help are added, they'd need a home
4. **Route Redirect:** `/admin/support` already exists, just redirects

### G.2 Should Support Include These?

| Component | Current State | Logical Fit | Schema Exists |
|-----------|---------------|-------------|---------------|
| Tickets | Functional | ✅ Core | ✅ Yes |
| FAQ / Knowledge Base | Non-existent | ✅ High | ❌ No |
| Bug Reports | Schema only | ✅ High | ✅ Yes |
| Feedback | Schema only | ✅ High | ✅ Yes |
| Notifications | Separate domain | ⚠️ Partial | ✅ Yes (separate migration) |
| Automation/Rules | Non-existent | ✅ High (future) | ❌ No |

### G.3 Learning/Gamification Precedent

Both Learning and Gamification follow this pattern:
```
/admin/[domain]/                  ← Hub page (overview/stats)
/admin/[domain]/[resource]/       ← Sub-pages for CRUD
```

If Support follows this pattern:
```
/admin/support/                   ← Hub (stats, quick actions)
/admin/support/tickets/           ← Ticket management
/admin/support/feedback/          ← Feedback review (future)
/admin/support/faq/               ← FAQ management (future)
```

### G.4 Recommendation

**RECOMMENDED: Consolidate under Support, but defer route migration**

| Option | Pros | Cons |
|--------|------|------|
| Keep `/admin/tickets` | No migration needed, simple | IA inconsistent with Learning/Gamification |
| Move to `/admin/support/tickets` | Consistent IA, room for growth | Requires route migration, redirect handling |

**Decision: DEFER route migration to Phase 2+**

Phase 1 should:
- Build the missing functionality within `/admin/tickets`
- NOT move routes
- Prepare for future consolidation by keeping code modular

---

## Section H — Risks & Decisions Matrix

### H.1 Risks if We Build Now

| Risk | Description | Severity |
|------|-------------|----------|
| **IA Lock-in** | Building more under `/admin/tickets` makes future migration harder | Medium |
| **Permission Inconsistency** | `SystemAdminClientGuard` blocks tenant admins unlike other domains | High |
| **No Server Actions** | Client-side service lacks audit trail and server validation | Medium |
| **Mock User Pages** | Building admin improvements while user-facing is broken creates confusion | High |
| **Notification Ownership** | Unclear if Notifications belongs to Support or System | Low |

### H.2 Decisions Required Before Phase 1

| Decision | Options | Blocks | Recommended |
|----------|---------|--------|-------------|
| Tickets location | `/admin/tickets` vs `/admin/support/tickets` | Admin IA, navigation | **Keep `/admin/tickets` for now** |
| Support as domain | Create parent group or not | Nav config | **No, defer to Phase 2** |
| Notification ownership | Support domain vs System domain | Logic, nav | **Keep in System (status quo)** |
| Tenant Admin access | Enable scoped access or keep system-only | Permissions | **Enable scoped access (like Learning)** |
| Server actions | Create actions or keep service layer | Architecture | **Create actions for admin operations** |
| User-side priority | Fix user support page or defer | UX | **Product decision needed** |

---

## Section I — Phase 1 Constraints Contract (Draft)

### MUST NOT Change
- ❌ Route structure (`/admin/tickets` stays as-is)
- ❌ Database schema (no migrations that break existing data)
- ❌ Navigation category (Tickets stays in "Drift")
- ❌ `supportService.ts` public API (backwards compatible)

### CAN Change Without Migration
- ✅ Add `app/actions/tickets-admin.ts` server actions
- ✅ Add UI for assignment workflow
- ✅ Add internal notes toggle
- ✅ Add bulk actions UI
- ✅ Change `SystemAdminClientGuard` to scope-based guard
- ✅ Add cross-tenant filter for system admins
- ✅ Fix user-side support page to use real data

### REQUIRES Migration
- ⚠️ Adding `sla_deadline`, `tags`, `first_response_at` columns
- ⚠️ Adding `faq` or `help_articles` tables
- ⚠️ Moving routes to `/admin/support/*`
- ⚠️ Adding `automation_rules` table

---

## Final Output

### 1. Clear Recommendation

**Keep Tickets as a standalone domain at `/admin/tickets` for Phase 1.**

Justification:
- Route migration is disruptive and not necessary for core functionality
- Learning/Gamification patterns can be followed without route changes
- Focus Phase 1 on making Tickets functional and consistent with other domains
- Revisit IA consolidation in Phase 2 when FAQ/Help requirements are clearer

### 2. Open Questions for Product Input

1. **User Support Priority:** Should we fix the mock user support page before enhancing admin? Users currently cannot actually create tickets.

2. **Tenant Admin Access:** Should Tenant Admins be able to see/manage tickets for their organization? (Currently blocked by `SystemAdminClientGuard`)

3. **FAQ/Knowledge Base:** Is this a Phase 2 priority? If so, should it live under Support or as a separate Content domain?

4. **Notifications Integration:** Should ticket status changes trigger notifications? If so, what's the notification strategy?

5. **Bug Reports vs Tickets:** Are bug reports a separate workflow or should they become a ticket category?

### 3. Suggested Phase 1 Scope (High-Level)

**Goal:** Make Tickets admin consistent with Learning/Gamification patterns

| Item | Priority | Effort |
|------|----------|--------|
| Create `app/actions/tickets-admin.ts` with proper auth | P0 | Medium |
| Replace `SystemAdminClientGuard` with scope-based access | P0 | Low |
| Add assignment dropdown UI | P1 | Low |
| Add internal notes checkbox | P1 | Low |
| Add cross-tenant filter for system admins | P1 | Medium |
| Fix `/app/support` to create real tickets | P1 | Medium |
| Fix `/app/notifications` to use real data | P2 | Medium |
| Add bulk actions (close, assign) | P2 | Medium |

---

## Important Reminder

This phase was about **thinking clearly**, not building fast.

**Missing information acknowledged:**
- Product intent for FAQ/Knowledge Base scope
- Priority of user-facing support vs admin enhancements
- SLA/escalation requirements (not in current schema)
- Notification trigger requirements
