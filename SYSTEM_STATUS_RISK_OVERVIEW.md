# Lekbanken – System Status & Risk Overview

**Generated**: 2026-01-27  
**Type**: READ-ONLY Architectural Analysis  
**Purpose**: Trustworthy cleanup status report for future master prompt

---

## 1. High-Level System Summary

### Technology Stack
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.0.7 |
| Runtime | React | 19.2.1 |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth | SSR 0.8.0 |
| Styling | Tailwind CSS | 4.x |
| Payments | Stripe | 16.6.0 |
| i18n | next-intl | 4.7.0 |
| State | Zustand + React Context | 4.5.7 |

### Scale Metrics (from inventory.json v3)
| Metric | Count | Notes |
|--------|-------|-------|
| **Total Nodes** | 1,776 | Routes, handlers, components, DB objects |
| **Total Edges** | 1,816 | Dependencies/relationships |
| **Page Routes** | ~270 | Under `app/` |
| **API Route Handlers** | ~230 | Under `app/api/` |
| **Server Actions** | ~25 | Under `app/actions/` |
| **Database Tables** | 105+ | Excl. views |
| **RLS Policies** | 957 | Enumerated in inventory |
| **DB Triggers** | 79 | Automation/sync |
| **DB Functions (RPC)** | 50+ | Security-critical operations |
| **Migrations** | 180+ | Nov 2024 – Jan 2026 |
| **Services** | 32 | In `lib/services/` |
| **Components** | ~40+ | Shared UI |
| **Docs Files** | 150+ | In `docs/` |

### Database Snapshot (2026-01-07)
| Metric | Value |
|--------|-------|
| Database Size | 29 MB |
| Index Size | 7,960 kB |
| Table Size | 816 kB |
| Index Hit Rate | 100% |
| Table Hit Rate | 100% |
| Time Since Stats Reset | 40 days |

---

## 2. Domain Breakdown

### Documented Domains (from DOCS_INDEX.md + PROJECT_STATUS.md)

| Domain | Status | Primary Routes | Primary Tables | Risk Level |
|--------|--------|----------------|----------------|------------|
| **Accounts** | ACTIVE | `/auth/*`, `/app/profile` | `users`, `user_tenant_memberships` | Medium (security-critical) |
| **Browse** | ACTIVE | `/app/browse`, `/app/games` | `games`, `browse_search_logs` | Low |
| **Play** | ACTIVE | `/app/play/*`, `/participants/*` | `participant_sessions`, `session_*` | Medium (real-time) |
| **Gamification** | ACTIVE | `/app/gamification`, `/app/shop` | `coin_transactions`, `user_achievements`, `shop_items` | Medium |
| **Planner** | ACTIVE | `/app/planner` | `plans`, `plan_blocks` | Low |
| **Billing** | ACTIVE | `/admin/billing`, `/api/billing/*` | `billing_products`, `subscriptions` | High (Stripe) |
| **Support** | ACTIVE | `/app/support`, `/admin/tickets` | `support_tickets` | Low |
| **Admin** | ACTIVE | `/admin/*` | (cross-domain) | High (RBAC) |
| **Participants** | ACTIVE | `/participants/*`, `/api/participants/*` | `participants`, `participant_sessions` | Medium |
| **Games** | ACTIVE | `/admin/games/*` | `games`, `game_steps`, `game_phases` | Low |
| **Media** | ACTIVE | `/admin/media`, `/api/media/*` | `media`, `media_templates` | Low |
| **Notifications** | ACTIVE | `/app/notifications` | `notifications` | Low |
| **Marketing** | ACTIVE | `/pricing`, `/` | `products` | Low |
| **Demo** | ACTIVE | `/demo/*` | `demo_sessions` | Low (isolated) |
| **Sandbox** | DEV_ONLY | `/sandbox/*` | N/A | Low |
| **Journey** | UNCERTAIN | `/app/journey` | TBD | Medium |
| **Achievements** | ACTIVE | `/admin/achievements*` | `achievements`, `user_achievements` | Low |
| **Learning** | UNCERTAIN | `/app/learning`, `/admin/learning` | `learning_requirements` | Medium |
| **Social** | UNCERTAIN | Documented in migrations | `leaderboards`, friends tables | Medium |
| **Moderation** | UNCERTAIN | `/admin/moderation` | `moderation_actions` | Low |
| **Personalization** | UNCERTAIN | `/admin/personalization` | `user_preferences` | Low |
| **Analytics** | ACTIVE | `/admin/analytics` | `session_analytics`, events | Low |

### Domain Classification Legend
- **ACTIVE**: In production use, actively maintained
- **PLANNED**: Documented/migrated but not fully wired
- **LEGACY**: Superseded, kept for compatibility
- **UNCERTAIN**: Insufficient evidence, needs verification

---

## 3. Entry Points & Runtime Surface

### Primary Entry Points
| Type | Count | Examples |
|------|-------|----------|
| Page Routes | ~270 | `/app/page.tsx`, `/admin/page.tsx`, `/pricing/page.tsx` |
| API Handlers | ~230 | `/api/games/*`, `/api/billing/*`, `/api/play/*` |
| Server Actions | 20 | `achievements-admin.ts`, `tickets-user.ts`, `support-hub.ts` |
| Webhooks | 3+ | `/api/billing/webhooks/stripe`, auth callbacks |
| Edge Functions | 1 | `cleanup-demo-data` |

### Server Actions (app/actions/)
```
achievements-admin.ts    learning.ts              support-hub.ts
bug-reports-admin.ts     legal-admin.ts           support-kb.ts
design.ts                legal.ts                 tenant-achievements-admin.ts
feedback-admin.ts        locale.ts                tenant.ts
learning-admin.ts        notifications-admin.ts   tickets-admin.ts
learning-requirements.ts notifications-user.ts    tickets-user.ts
                        shop-rewards-admin.ts    support-automation.ts
```

### API Route Domains (app/api/)
```
accounts/     billing/      demo/         gamification/  media/        public/
admin/        browse/       enterprise/   gdpr/          participants/ purposes/
atlas/        checkout/     games/        gift/          plans/        sandbox/
              coach-diagrams/ consent/    health/        play/         sessions/
              cosmetics/    journey/      learning/      products/     shop/
                                                                       system/
                                                                       tenants/
                                                                       toolbelt/
```

### Feature Modules (features/)
```
admin/              gamification/       play/               tools/
browse/             journey/            play-participant/
conversation-cards/ participants/       planner/
                   profile/
```

---

## 4. Duplication & Drift Observations

### Known Duplicate/Parallel Implementations

| Area | Finding | Risk |
|------|---------|------|
| **Admin Shell** | Two competing shells: `AdminShell` (active) vs `layout-client.tsx` (likely legacy) | Medium |
| **Admin Nav** | `admin-nav-config.tsx` vs `admin-nav-items.tsx` | Low |
| **User Profile** | `lib/db/users.ts` has deprecated `getCurrentUser()` vs `lib/supabase/server.ts` | Low |
| **Gamification Events** | v1 (`gamification-events.server.ts`) vs v2 (`gamification-events-v2.server.ts`) | Low |
| **Trigger/Artifact State** | v1 → v2 migration completed (backfill migrations exist) | Low |
| **Role System** | Legacy `organisation_admin`/`organisation_user` roles deprecated | Low |

### Schema Drift Indicators
- `games.popularity_score_idx` - 0 scans (unused index)
- `games.idx_games_energy_level` - 0 scans (unused index)
- `games.idx_games_location_type` - 0 scans (unused index)
- `games.idx_games_category` - 0 scans (unused index)
- `games.idx_games_time_estimate` - 0 scans (unused index)
- `games.idx_games_age_range` - 0 scans (unused index)

### Deprecated Elements (from codebase search)
| Item | Location | Status |
|------|----------|--------|
| `middleware.ts` | docs/AI_CODING_GUIDELINES | Deprecated, should not be used |
| `multiplayer_sessions` | docs/AI_CODING_GUIDELINES | Deprecated for new features |
| `getCurrentUser()` | lib/db/users.ts | Use `getAuthUser()` from server.ts |
| `userRole` | lib/supabase/auth.tsx | Deprecated alias for `effectiveGlobalRole` |
| `GameBuilderForm.tsx` | app/admin/games/builder | Legacy form, kept for reference |
| `media.game_id` | Database | Deprecated, use `game_media` junction |
| `icon_url` | Gamification | Legacy, replaced by media refs |

---

## 5. Supabase/Data Layer Overview

### Table Categories by Size (top 20)
| Table | Size | Est. Rows | Seq Scans |
|-------|------|-----------|-----------|
| `games` | 312 kB | 53 | 1,397 |
| `session_events` | 232 kB | 101 | 96 |
| `media` | 192 kB | 73 | 239 |
| `purposes` | 176 kB | 98 | 2,369 |
| `plans` | 176 kB | 2 | 990 |
| `participants` | 144 kB | 23 | 22,023 |
| `participant_sessions` | 136 kB | 10 | 223,391 |
| `products` | 128 kB | 36 | 3,948 |
| `users` | 112 kB | 4 | 210,159 |

### RLS Policy Coverage
- **Total Policies**: 957 enumerated in inventory
- **Policy Coverage**: 100% of tables have RLS enabled
- **SECURITY DEFINER Functions**: 52 (all with search_path hardening)

### Security Migrations Applied (010-024)
```
20260108000000_security_definer_fix.sql
20260108000001_view_security_invoker.sql
20260108000002_consolidate_duplicate_policies.sql
...through...
20260108000024_add_missing_fk_index.sql
```

### Database Functions (RPC) - Security Critical
| Function | Purpose | Called From |
|----------|---------|-------------|
| `is_system_admin` | Admin check | Multiple admin routes |
| `has_tenant_role` | RBAC check | Tenant-scoped routes |
| `apply_coin_transaction_v1` | Coin ops | Gamification |
| `purchase_shop_item_v1` | Shop | `/api/shop` |
| `admin_award_achievement_v1` | Awards | Admin actions |
| `create_game_snapshot` | Snapshots | Session creation |

### Edge Functions
| Function | Status | Notes |
|----------|--------|-------|
| `cleanup-demo-data` | UNCERTAIN | Invocation not verified - check Supabase schedules |

---

## 6. Risk Map

### High Risk (Requires Care)
| Area | Risk | Mitigation |
|------|------|------------|
| **Billing/Stripe** | Payment disruption | Security-critical, full audit before changes |
| **Auth/RBAC** | Access control bypass | Test role gates extensively |
| **Tenant Isolation** | Data leakage | RLS policies critical, never disable |
| **Admin Gate** | Currently hard-coded to `system_admin` only | Documented issue - tenant admins blocked |

### Medium Risk
| Area | Risk | Notes |
|------|------|-------|
| **Play System** | Session state corruption | Complex real-time state |
| **Gamification** | Coin balance issues | ACID transactions via RPC |
| **proxy.ts** | Orphan finding | No detected imports - verify deployment |
| **Edge Functions** | Unverified invocation | Check Supabase dashboard |

### Low Risk (Safe for Cleanup)
| Area | Notes |
|------|-------|
| **Unused indexes** | 6 game indexes with 0 scans - candidates for removal |
| **Deprecated functions** | `getCurrentUser()` can be removed after migration |
| **Legacy admin nav** | `admin-nav-items.tsx` after shell consolidation |

---

## 7. Cleanup Readiness Assessment

### Existing Findings (from inventory.json)
1. **proxy.ts** (orphan)
   - Summary: No detected imports or middleware wiring
   - Recommendation: Confirm runtime use or remove
   - Prechecks: Search deployment/proxy config

2. **cleanup-demo-data edge function** (unreachable)
   - Summary: Invocation not verified
   - Recommendation: Check Supabase schedules/invocations
   - Prechecks: Review Supabase dashboard logs

### Active Disputes (from disputes.md)
| Dispute | Status | Resolution |
|---------|--------|------------|
| Layout usage classification | PENDING | Verify Next.js layout runtime behavior |
| Security-critical area status | PENDING | Requires security audit |
| RLS policy node type | PENDING | Schema clarification needed |
| Component granularity | PENDING | Scope clarification needed |
| Server action count | ACKNOWLEDGED | Claude under-sampled |
| Route count discrepancy | PENDING | Selection criteria differ |

### Inventory System Maturity
- **v3 (current)**: Partitioned storage, 1,776 nodes, 1,816 edges
- **Tooling**: `npm run inventory:*` for domain-specific updates
- **Annotations**: `.atlas/annotations.json` (not yet created)
- **Atlas UI**: `/sandbox/atlas` for visualization

### Safe Cleanup Candidates
| Item | Type | Confidence | Action |
|------|------|------------|--------|
| Game unused indexes (6) | DB | High | DROP after confirming no query plans use them |
| `lib/db/users.ts:getCurrentUser` | Code | High | Remove after grep for usages |
| Legacy admin nav files | Code | Medium | Consolidate after shell audit |
| `GameBuilderForm.tsx` | Code | Medium | Archive/remove after builder v2 stable |

---

## 8. Rules for Future Master Prompt

### Conservative Approach
1. **Default to UNCERTAIN** when evidence is ambiguous
2. **Never label security-critical as LEGACY** without explicit approval
3. **Preserve billing/auth/GDPR** code even if appears unused
4. **Check RLS before any table modification**

### Before Any Cleanup
```markdown
Prechecks:
- [ ] Grep for imports/references
- [ ] Check route reachability
- [ ] Verify no RLS policy dependencies
- [ ] Check migration history
- [ ] Review disputes.md for known issues
```

### Recommended Next Steps
1. **Create `.atlas/annotations.json`** - Manual decisions for uncertain nodes
2. **Resolve disputes** - Work through disputes.md systematically
3. **Verify edge function** - Check Supabase dashboard for cleanup-demo-data
4. **Confirm proxy.ts** - Check deployment config for custom domain routing
5. **Index audit** - Run EXPLAIN on queries before dropping unused indexes

### Domain-Specific Guidance

| Domain | Guidance |
|--------|----------|
| **Billing** | Never modify without Stripe webhook testing |
| **Auth** | Test all role gates before changing RBAC |
| **Play** | Consider real-time state and participant sessions |
| **Gamification** | Verify coin transaction idempotency |
| **Admin** | Note: Currently system_admin only - tenant admin blocked |

---

## 9. Summary Statistics

### By Usage Status (from inventory)
| Status | Count | % |
|--------|-------|---|
| unknown | ~1,100 | 62% |
| used_referenced | ~500 | 28% |
| dormant_flagged | ~80 | 5% |
| Other | ~96 | 5% |

### By Domain Partition
| Domain | Nodes |
|--------|-------|
| shared | 362 |
| admin | 117 |
| sandbox | 78 |
| app | 51 |
| marketing | 18 |
| demo | 3 |

### By DB Partition
| Type | Nodes |
|------|-------|
| policies | 957 |
| tables | 105 |
| triggers | 79 |
| functions | 6 |

---

## 10. Version History

| Version | Date | Changes |
|---------|------|---------|
| v3 | 2026-01-27 | Partitioned storage, +142 nodes, +798 edges |
| v2 | 2026-01-17 | Initial comprehensive inventory |

---

**END OF REPORT**

*This document is READ-ONLY. Do not modify source files based on this analysis without following the prechecks and verification steps outlined above.*
