# Postfix Verification — MFA-005 & BUG-020

> Created: 2026-03-19  
> Author: Claude (verification agent)  
> Purpose: Final closure proof for GPT review feedback round

---

## MFA-005 — Cross-Tenant MFA Trusted-Device Bypass

### Final Verdict: ✅ CLOSED

### Vectors closed

| # | Vector | File | Fix |
|---|--------|------|-----|
| 1 | `verifyTrustedDevice()` missing `tenant_id` filter | `lib/services/mfa/mfaDevices.server.ts` | Added `tenantId: string` as required 4th param + `.eq('tenant_id', tenantId)` |
| 2 | `devices/verify` route accepted `body.tenant_id` (client-spoofable) | `app/api/accounts/auth/mfa/devices/verify/route.ts` | Removed `body.tenant_id` — uses ONLY `readTenantIdFromCookies()` (HMAC-signed, httpOnly) |
| 3 | Middleware `checkTrustedDevice()` had no tenant filter | `lib/auth/mfa-aal.ts` | Added `tenantId` param + `.eq('tenant_id', tenantId)` to internal query |
| 4 | Middleware caller didn't pass tenant context | `proxy.ts` | Reads signed `lb_tenant` cookie via `readTenantIdFromCookies()` before MFA check |

### Canonical tenant source

**Server-controlled only.** All MFA trusted-device verification paths now resolve tenant from:

- **API route** (`devices/verify`): `readTenantIdFromCookies(cookieStore)` — HMAC-signed `lb_tenant` cookie, httpOnly, sameSite lax. Cannot be forged or overridden by client.
- **Middleware** (`proxy.ts`): `readTenantIdFromCookies(request.cookies)` — same signed cookie.

No client-provided `body.tenant_id` is accepted anywhere.

### Fail-safe behavior

If `lb_tenant` cookie is not set (e.g. first login before tenant selection), the trust check is **skipped** — user falls through to normal MFA verification. This is the conservative fail-safe: MFA is required, not bypassed.

### Commits

- `0a82610` — Initial fix: tenant_id param added to service + route
- `cbd4012` — Hardening: removed body override, scoped middleware path

---

## BUG-020 — Seat Assignment Race Condition (TOCTOU)

### Final Verdict: ✅ CLOSED

### Fix summary

Replaced count→check→insert pattern with atomic PL/pgSQL RPC `assign_seat_if_available()`:
- `FOR UPDATE` lock on subscription row prevents concurrent reads
- Conditional INSERT with subquery count
- Named PostgreSQL exceptions for clear error mapping

### Parallel seat-write paths

**Grep confirmed: no other seat-write paths exist.**

| Pattern searched | Matches in app code |
|-----------------|-------------------|
| `tenant_seat_assignments` INSERT | 0 (only in RPC migration) |
| `tenant_seat_assignments` UPDATE | 0 outside admin/management routes |
| Direct `.insert()` on seat table | 0 |

The only active seat-write path is through `assign_seat_if_available` RPC, called from `app/api/billing/tenants/[tenantId]/seats/route.ts`.

### RPC details

- Migration: `supabase/migrations/20260319012804_assign_seat_if_available.sql`  
- Security: `SECURITY DEFINER` (runs with elevated privileges)
- Isolation: `FOR UPDATE` row lock on subscription
- Exceptions: `subscription_not_found`, `subscription_tenant_mismatch`, `subscription_canceled`, `no_seats_available`

### Commit

- `0a82610` — Atomic RPC + route integration

---

## Decision Status

| Decision | Status |
|----------|--------|
| DD-MFA-1 | ✅ RESOLVED — Tenant-scoped trust, server-canonical cookie only |
| DD-RACE-1 | ✅ RESOLVED — Atomic RPC with row-level locking |
| DD-LEGACY-1 | ⏳ Next — BUG-022 legacy billing resolution |
