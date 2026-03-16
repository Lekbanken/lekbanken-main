# API Route Security Audit

**Generated:** 2026-02-20
**Total routes:** 261

## Summary

| Metric | Count |
|--------|-------|
| Total API routes | 261 |
| Routes with **NO auth check** | 110 |
| Routes with **NO Supabase client** | 42 |
| Routes with rate limiting | 10 |
| Routes accepting IDs from input | 167 |
| Routes using ServiceRole/supabaseAdmin with **NO auth** | 42 |

## Full Audit Table

| # | Path | Client Type | Auth Check | Accepts IDs from input | Rate Limited |
|---|------|------------|------------|-------------------------|-------------|
| 1 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/challenge/route.ts` | RLS | getUser | - | No |
| 2 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/devices/[deviceId]/route.ts` | RLS | getUser | - | No |
| 3 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/devices/route.ts` | RLS | getUser | - | No |
| 4 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/devices/trust/route.ts` | RLS | getUser | - | No |
| 5 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/devices/verify/route.ts` | RLS | getUser | - | No |
| 6 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/disable/route.ts` | RLS | getUser | userId | No |
| 7 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/enroll/route.ts` | RLS | getUser | - | No |
| 8 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/recovery-codes/route.ts` | RLS | getUser | tenant_id, tenantId, user_id | No |
| 9 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/recovery-codes/verify/route.ts` | RLS | getUser | tenant_id, user_id | No |
| 10 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/requirement/route.ts` | RLS | getUser | - | No |
| 11 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/status/route.ts` | RLS | getUser | user_id | No |
| 12 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/auth/mfa/verify/route.ts` | RLS | getUser | userId | No |
| 13 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/devices/remove/route.ts` | RLS | getUser | user_id, userId | No |
| 14 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/devices/route.ts` | RLS | getUser | user_id | No |
| 15 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/profile/route.ts` | RLS | getUser, cookies | user_id, userId | No |
| 16 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/sessions/revoke/route.ts` | RLS+supabaseAdmin | getUser | user_id, userId | No |
| 17 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/sessions/route.ts` | RLS | getUser | user_id | No |
| 18 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/accounts/whoami/route.ts` | RLS | getUser, cookies | tenant_id, tenantId, user_id | No |
| 19 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/analytics/overview/route.ts` | RLS+ServiceRole | getUser, authorization-header | - | No |
| 20 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/analytics/sessions/[sessionId]/route.ts` | RLS+ServiceRole | getUser, authorization-header | - | No |
| 21 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/award-builder/exports/[exportId]/route.ts` | RLS+ServiceRole | getUser, authorization-header | - | No |
| 22 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/award-builder/exports/route.ts` | RLS+ServiceRole | getUser, requireAuth | tenant_id, tenantId, user_id | No |
| 23 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/award-builder/presets/[presetId]/route.ts` | RLS+ServiceRole | getUser, requireAuth | tenant_id, tenantId, user_id | No |
| 24 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/award-builder/presets/route.ts` | RLS | getUser, authorization-header, requireAuth | tenant_id, tenantId, user_id | No |
| 25 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/award-builder/seed-test-badges/route.ts` | ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 26 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/coach-diagrams/[diagramId]/route.ts` | ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 27 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/coach-diagrams/route.ts` | RLS+ServiceRole | getUser, requireAuth | tenant_id, tenantId, user_id | No |
| 28 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/games/bulk/route.ts` | RLS+ServiceRole+supabaseAdmin | getUser | tenant_id, tenantId | No |
| 29 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/games/search/route.ts` | RLS | getUser | tenant_id, tenantId | No |
| 30 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/analytics/rollups/refresh/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId | No |
| 31 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/analytics/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId | No |
| 32 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/automation/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id | No |
| 33 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/awards/requests/[requestId]/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id | No |
| 34 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/awards/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 35 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/campaigns/[campaignId]/analytics/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 36 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/campaigns/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id | No |
| 37 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/campaign-templates/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId | No |
| 38 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/dashboard/route.ts` | RLS | getUser | tenant_id, tenantId | No |
| 39 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/leaderboard/route.ts` | RLS | getUser, authorization-header | tenant_id, tenantId, userId | No |
| 40 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/levels/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id | No |
| 41 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/refund/route.ts` | RLS | getUser, authorization-header | - | No |
| 42 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/rules/route.ts` | RLS | getUser | tenant_id, tenantId | No |
| 43 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/seed-rules/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id, userId | No |
| 44 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/gamification/sinks/route.ts` | RLS | getUser, authorization-header | tenantId | No |
| 45 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/licenses/grant-personal/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id, userId | No |
| 46 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/licenses/route.ts` | NONE | **NONE** | - | No |
| 47 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/marketplace/items/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 48 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/audit/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 49 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/games/[gameId]/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 50 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/games/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 51 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/prices/[priceId]/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 52 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/prices/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 53 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 54 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/status/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 55 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/[productId]/sync-stripe/route.ts` | RLS+ServiceRole | getUser, requireAdmin | tenant_id, tenantId, user_id | No |
| 56 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/bulk/route.ts` | RLS | getUser | - | No |
| 57 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/products/search/route.ts` | RLS | getUser | - | No |
| 58 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/scheduled-jobs/route.ts` | RLS+ServiceRole | **NONE** | - | No |
| 59 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/stripe/bootstrap-products/route.ts` | RLS | getUser | - | No |
| 60 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/stripe/sync-product/route.ts` | RLS | getUser | - | No |
| 61 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/tenant/[tenantId]/mfa/policy/route.ts` | RLS | getUser | - | No |
| 62 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/tenant/[tenantId]/mfa/stats/route.ts` | RLS | getUser | - | No |
| 63 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` | RLS | getUser | - | No |
| 64 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/tenant/[tenantId]/mfa/users/route.ts` | RLS | getUser | - | No |
| 65 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/cards/[cardId]/route.ts` | RLS | getUser | - | No |
| 66 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/cards/route.ts` | RLS | getUser | - | No |
| 67 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/import/route.ts` | RLS | getUser | - | No |
| 68 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/route.ts` | RLS | getUser | - | No |
| 69 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/collections/route.ts` | ServiceRole | requireAuth, requireTenantRole | tenant_id, tenantId, user_id | No |
| 70 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/admin/toolbelt/conversation-cards/import/route.ts` | ServiceRole | authorization-header, requireAuth, requireTenantRole | tenant_id | No |
| 71 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/atlas/annotations/route.ts` | NONE | **NONE** | - | No |
| 72 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/atlas/inventory/route.ts` | NONE | **NONE** | - | No |
| 73 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/analytics/route.ts` | supabaseAdmin | **NONE** | - | No |
| 74 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/create-subscription/route.ts` | RLS | getUser | tenant_id, tenantId, user_id | No |
| 75 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/dunning/[id]/actions/route.ts` | RLS | getUser | tenant_id, tenantId, user_id | No |
| 76 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/dunning/[id]/cancel/route.ts` | RLS | getUser | tenant_id, tenantId, user_id | No |
| 77 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/dunning/[id]/retry/route.ts` | RLS | getUser | tenant_id, tenantId, user_id | No |
| 78 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/dunning/route.ts` | supabaseAdmin | **NONE** | - | No |
| 79 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/invoices/my/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 80 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/portal/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 81 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/products/route.ts` | RLS | **NONE** | - | No |
| 82 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/promo-codes/route.ts` | RLS | getUser | - | No |
| 83 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/quotes/[id]/route.ts` | RLS | getUser | - | No |
| 84 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/quotes/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, userId | No |
| 85 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/subscription/my/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 86 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/subscription/update/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 87 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/[paymentId]/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 88 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 89 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/invoices/[invoiceId]/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 90 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/invoices/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 91 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/invoices/stripe/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 92 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/seats/[seatId]/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 93 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/seats/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 94 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/stripe-customer/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 95 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/tenants/[tenantId]/subscription/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId, user_id | No |
| 96 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/usage/aggregate/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId | No |
| 97 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/usage/meters/route.ts` | supabaseAdmin | **NONE** | - | No |
| 98 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/usage/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 99 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/billing/webhooks/stripe/route.ts` | supabaseAdmin | webhook-signature | tenant_id, tenantId, user_id | No |
| 100 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/browse/filters/route.ts` | RLS | getUser | tenant_id, tenantId, userId | No |
| 101 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/checkout/cart/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 102 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/checkout/intents/[intentId]/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 103 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/checkout/start/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 104 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/coach-diagrams/[diagramId]/svg/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 105 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/consent/log/route.ts` | ServiceRole | **NONE** | user_id, userId | No |
| 106 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/cosmetics/loadout/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 107 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/demo/convert/route.ts` | RLS | cookies | - | No |
| 108 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/demo/status/route.ts` | RLS | getUser | tenantId | No |
| 109 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/demo/track/route.ts` | RLS | cookies | - | No |
| 110 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/enterprise/quote/route.ts` | supabaseAdmin | **NONE** | - | No |
| 111 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/game-reactions/batch/route.ts` | RLS | **NONE** | - | No |
| 112 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/artifacts/route.ts` | RLS | **NONE** | - | No |
| 113 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/publish/route.ts` | RLS | **NONE** | - | No |
| 114 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/related/route.ts` | RLS | **NONE** | - | No |
| 115 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/roles/route.ts` | RLS | **NONE** | - | No |
| 116 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/route.ts` | RLS | **NONE** | - | No |
| 117 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/snapshots/route.ts` | RLS | **NONE** | - | No |
| 118 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/[gameId]/triggers/route.ts` | RLS | **NONE** | - | No |
| 119 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/builder/[id]/route.ts` | RLS | **NONE** | - | No |
| 120 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/builder/route.ts` | ServiceRole | requireAuth | tenant_id, tenantId | No |
| 121 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/csv-export/route.ts` | RLS+ServiceRole | getUser, authorization-header | tenant_id, tenantId | No |
| 122 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/csv-import/route.ts` | RLS+ServiceRole | getUser, authorization-header | tenant_id, tenantId | No |
| 123 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/featured/route.ts` | RLS | getUser | tenant_id, tenantId | No |
| 124 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/route.ts` | RLS | getUser | tenant_id | No |
| 125 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/games/search/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 126 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/achievement/[id]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 127 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/achievements/check/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 128 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/achievements/unlock/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 129 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/burn/route.ts` | NONE | **NONE** | tenantId, userId | No |
| 130 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/coins/transaction/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 131 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/events/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id | rateLimit |
| 132 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/faction/route.ts` | RLS | getUser | user_id | No |
| 133 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/leaderboard/preferences/route.ts` | NONE | **NONE** | tenantId | No |
| 134 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/leaderboard/route.ts` | NONE | **NONE** | tenantId | No |
| 135 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/pins/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 136 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 137 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/showcase/route.ts` | RLS | getUser | user_id | No |
| 138 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gamification/sinks/route.ts` | NONE | **NONE** | tenantId | No |
| 139 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gdpr/delete/route.ts` | RLS | getUser | - | No |
| 140 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gdpr/export/route.ts` | RLS | getUser | - | No |
| 141 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/geocode/route.ts` | NONE | **NONE** | - | No |
| 142 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gift/purchase/route.ts` | supabaseAdmin | **NONE** | user_id | No |
| 143 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/gift/redeem/route.ts` | supabaseAdmin | **NONE** | tenant_id, tenantId, user_id | No |
| 144 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/health/route.ts` | createClient | **NONE** | - | No |
| 145 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/journey/feed/route.ts` | RLS | getUser | user_id, userId | No |
| 146 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/journey/snapshot/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 147 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/learning/courses/[courseId]/submit/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 148 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/[mediaId]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 149 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/fallback/route.ts` | RLS | **NONE** | - | No |
| 150 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/route.ts` | RLS | getUser | tenant_id, tenantId, userId | No |
| 151 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/templates/[templateId]/route.ts` | RLS | getUser | tenant_id, tenantId, userId | No |
| 152 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/templates/route.ts` | RLS | getUser | userId | No |
| 153 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/upload/confirm/route.ts` | RLS | getUser | - | No |
| 154 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/media/upload/route.ts` | RLS | getUser | tenantId, userId | No |
| 155 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/[participantId]/actions/route.ts` | RLS | getUser | tenantId, userId | No |
| 156 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/[participantId]/role/route.ts` | RLS | getUser | tenantId, userId | No |
| 157 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/[participantId]/route.ts` | RLS | getUser | tenantId, userId | No |
| 158 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/progress/unlock-achievement/route.ts` | ServiceRole | **NONE** | tenant_id | No |
| 159 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/progress/update/route.ts` | ServiceRole | **NONE** | tenant_id | No |
| 160 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 161 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/analytics/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 162 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/archive/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 163 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/control/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 164 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/export/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 165 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/restore/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 166 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/[sessionId]/route.ts` | RLS | cookies | tenant_id, tenantId | No |
| 167 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/create/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 168 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/history/route.ts` | RLS | getUser | user_id | No |
| 169 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/join/route.ts` | ServiceRole | getSession | - | rateLimit |
| 170 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/sessions/rejoin/route.ts` | ServiceRole | **NONE** | user_id | No |
| 171 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/tokens/cleanup/route.ts` | ServiceRole | **NONE** | tenant_id | No |
| 172 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/tokens/extend/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId | No |
| 173 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/participants/tokens/revoke/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 174 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/blocks/[blockId]/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 175 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/blocks/reorder/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 176 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/blocks/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 177 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/copy/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 178 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/notes/private/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 179 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/notes/tenant/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 180 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/play/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 181 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/progress/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 182 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/publish/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 183 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 184 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/status/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 185 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/versions/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 186 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/[planId]/visibility/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId, user_id | No |
| 187 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/bulk/route.ts` | RLS | getUser | tenant_id, user_id, userId | No |
| 188 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 189 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/schedules/[scheduleId]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 190 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/schedules/route.ts` | RLS | getUser | - | No |
| 191 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/plans/search/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 192 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/[planId]/start/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 193 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/board/[code]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | No |
| 194 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/heartbeat/route.ts` | ServiceRole | x-participant-token | - | rateLimit |
| 195 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/join/route.ts` | NONE | **NONE** | - | No |
| 196 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/me/role/reveal/route.ts` | ServiceRole | x-participant-token | - | No |
| 197 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/me/role/route.ts` | ServiceRole | x-participant-token | - | No |
| 198 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/me/route.ts` | ServiceRole | x-participant-token | - | No |
| 199 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/rejoin/route.ts` | NONE | **NONE** | - | No |
| 200 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/runs/[runId]/progress/route.ts` | NONE | **NONE** | - | No |
| 201 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/runs/[runId]/route.ts` | NONE | **NONE** | - | No |
| 202 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/session/[code]/route.ts` | NONE | **NONE** | - | No |
| 203 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts` | NONE | **NONE** | - | No |
| 204 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts` | NONE | **NONE** | - | No |
| 205 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/artifacts/route.ts` | NONE | **NONE** | - | No |
| 206 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/artifacts/snapshot/route.ts` | NONE | **NONE** | - | No |
| 207 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/artifacts/state/route.ts` | NONE | **NONE** | - | No |
| 208 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/assignments/route.ts` | NONE | **NONE** | - | No |
| 209 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/chat/route.ts` | NONE | **NONE** | - | No |
| 210 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/conversation-cards/collections/[collectionId]/route.ts` | NONE | **NONE** | - | No |
| 211 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/decisions/[decisionId]/results/route.ts` | NONE | **NONE** | - | No |
| 212 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/decisions/[decisionId]/route.ts` | NONE | **NONE** | - | No |
| 213 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/decisions/[decisionId]/vote/route.ts` | NONE | **NONE** | - | No |
| 214 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/decisions/route.ts` | NONE | **NONE** | - | No |
| 215 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/game/route.ts` | NONE | **NONE** | - | No |
| 216 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/outcome/route.ts` | NONE | **NONE** | - | No |
| 217 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/overrides/route.ts` | NONE | **NONE** | - | No |
| 218 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/participants/[participantId]/route.ts` | NONE | **NONE** | - | No |
| 219 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/participants/route.ts` | NONE | **NONE** | - | No |
| 220 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/puzzles/progress/route.ts` | NONE | **NONE** | - | No |
| 221 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/puzzles/props/route.ts` | NONE | **NONE** | - | No |
| 222 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/roles/route.ts` | NONE | **NONE** | - | No |
| 223 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/route.ts` | NONE | **NONE** | - | No |
| 224 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/secrets/route.ts` | NONE | **NONE** | - | No |
| 225 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/signals/route.ts` | NONE | **NONE** | - | No |
| 226 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/state/route.ts` | NONE | **NONE** | - | No |
| 227 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/time-bank/route.ts` | NONE | **NONE** | - | No |
| 228 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/[id]/triggers/route.ts` | NONE | **NONE** | - | No |
| 229 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/play/sessions/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 230 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/products/[productId]/purposes/[purposeId]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 231 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/products/[productId]/purposes/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 232 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/products/[productId]/route.ts` | RLS | getUser | tenant_id, tenantId, user_id, userId | rateLimit |
| 233 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/products/route.ts` | RLS | getUser | - | No |
| 234 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/public/pricing/route.ts` | RLS | **NONE** | - | No |
| 235 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/public/v1/games/[id]/route.ts` | RLS | **NONE** | - | No |
| 236 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/public/v1/games/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId | No |
| 237 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/public/v1/sessions/[id]/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId | No |
| 238 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/public/v1/sessions/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId | No |
| 239 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/purposes/[purposeId]/route.ts` | ServiceRole | **NONE** | tenant_id, tenantId | No |
| 240 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/purposes/route.ts` | RLS+supabaseAdmin | getUser | tenant_id, tenantId | No |
| 241 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/sandbox/inventory/route.ts` | NONE | **NONE** | - | No |
| 242 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/sessions/[sessionId]/actions/route.ts` | NONE | **NONE** | - | No |
| 243 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/sessions/[sessionId]/route.ts` | NONE | **NONE** | - | No |
| 244 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/sessions/route.ts` | RLS+supabaseAdmin | cookies | tenant_id, tenantId, user_id | No |
| 245 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/shop/powerups/consume/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 246 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/shop/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 247 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/spatial-artifacts/[artifactId]/svg/route.ts` | RLS+ServiceRole | getUser | tenant_id, tenantId, user_id, userId | No |
| 248 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/system/metrics/route.ts` | createClient | **NONE** | user_id | No |
| 249 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/audit-logs/route.ts` | createClient | **NONE** | user_id | No |
| 250 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/branding/route.ts` | createClient | **NONE** | user_id | No |
| 251 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/invitations/route.ts` | createClient | **NONE** | user_id | No |
| 252 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/members/[userId]/route.ts` | createClient | **NONE** | user_id | No |
| 253 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/members/route.ts` | createClient | **NONE** | user_id | No |
| 254 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/route.ts` | createClient | **NONE** | user_id | No |
| 255 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/settings/route.ts` | createClient | **NONE** | user_id | No |
| 256 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/[tenantId]/status/route.ts` | createClient | **NONE** | user_id | No |
| 257 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/invitations/[token]/accept/route.ts` | createClient | **NONE** | user_id | No |
| 258 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/invitations/[token]/route.ts` | createClient | **NONE** | user_id | No |
| 259 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/tenants/route.ts` | RLS | getUser, cookies | tenantId, userId | No |
| 260 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/toolbelt/conversation-cards/collections/[collectionId]/route.ts` | RLS | getUser, cookies | tenantId, userId | No |
| 261 | `D:/Dokument/GitHub/Lekbanken/lekbanken-main/app/api/toolbelt/conversation-cards/collections/route.ts` | RLS | **NONE** | tenant_id | No |
