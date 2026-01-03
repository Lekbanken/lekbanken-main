# Custom Domains - Manual Test Plan

**Phase:** A (Manual Provisioning)  
**Date:** 2026-01-03  
**Status:** Ready for testing

## Prerequisites

1. Database migration applied (`tenant_domains` table exists)
2. RPC function `get_tenant_id_by_hostname` exists and is tested
3. At least one tenant with a custom domain configured in `tenant_domains` table
4. Access to modify local hosts file for testing custom domains locally

## Test Setup

### Local Testing with Custom Domains

Add to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows):

```
127.0.0.1 demo.lekbanken.no
127.0.0.1 app.lekbanken.no
127.0.0.1 testcustom.example.com
```

### Database Setup

```sql
-- Create a test custom domain entry
INSERT INTO tenant_domains (tenant_id, hostname, status, is_primary)
SELECT id, 'testcustom.example.com', 'active', false
FROM tenants WHERE slug = 'demo';

-- Create a platform subdomain entry (if using tenant_domains for these)
INSERT INTO tenant_domains (tenant_id, hostname, status, is_primary)
SELECT id, 'demo.lekbanken.no', 'active', true
FROM tenants WHERE slug = 'demo';
```

---

## Test Cases

### T1: Platform Primary Domain (app.lekbanken.no)

**Scenario:** Access the main platform domain

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://localhost:3000/app` (simulating app.lekbanken.no) | Should reach login or app |
| 2 | Login with valid credentials | Should redirect to `/app` |
| 3 | Verify no tenant auto-resolved from hostname | Tenant resolved from cookie/membership |

**Status:** [ ] Pass / [ ] Fail

---

### T2: Platform Subdomain (tenant.lekbanken.no)

**Scenario:** Access via tenant subdomain

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://demo.lekbanken.no:3000/app` | Should reach login page |
| 2 | Login with user that has membership in "demo" tenant | Should auto-resolve tenant from hostname |
| 3 | Check `x-tenant-id` response header | Should contain demo tenant's UUID |
| 4 | Check `lb_tenant` cookie | Should be set with `domain=.lekbanken.no` |
| 5 | Navigate to `http://other.lekbanken.no:3000/app` (same session) | Cookie should still work (cross-subdomain) |

**Status:** [ ] Pass / [ ] Fail

---

### T3: Custom Domain Resolution

**Scenario:** Access via verified custom domain

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `http://testcustom.example.com:3000/app` | Should reach login page |
| 2 | Login | Should auto-resolve tenant from hostname |
| 3 | Check `x-tenant-id` response header | Should contain correct tenant UUID |
| 4 | Check `lb_tenant` cookie domain | Should be host-only (no domain attr) |

**Status:** [ ] Pass / [ ] Fail

---

### T4: Untrusted Host Rejection

**Scenario:** Access protected paths from unknown domain

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add `127.0.0.1 evil.attacker.com` to hosts file | - |
| 2 | Navigate to `http://evil.attacker.com:3000/app` | Should receive HTTP 404 |
| 3 | Navigate to `http://evil.attacker.com:3000/admin` | Should receive HTTP 404 |
| 4 | Navigate to `http://evil.attacker.com:3000/auth/login` | Should work (public path) |

**Status:** [ ] Pass / [ ] Fail

---

### T5: Malformed Host Header Handling

**Scenario:** Security test for header injection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send request with `Host: evil.com, app.lekbanken.no` | Should reject (comma in host) |
| 2 | Send request with `Host: evil.com app.lekbanken.no` | Should reject (space in host) |
| 3 | Send request with `x-forwarded-host` but no `x-forwarded-proto` | Should ignore x-forwarded-host |

Use curl:
```bash
curl -H "Host: evil.com, app.lekbanken.no" http://localhost:3000/app
curl -H "x-forwarded-host: evil.com" http://localhost:3000/app
```

**Status:** [ ] Pass / [ ] Fail

---

### T6: Path Override Still Works

**Scenario:** Explicit tenant selection via URL should override hostname

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login on `demo.lekbanken.no:3000` | Auto-resolved to demo tenant |
| 2 | Navigate to `/app/t/[other-tenant-id]/dashboard` | Should switch to other tenant (if user has membership) |
| 3 | Verify tenant context switched | UI shows other tenant |

**Status:** [ ] Pass / [ ] Fail

---

### T7: Cookie Behavior Difference

**Scenario:** Verify cookie domain differs between platform and custom domain

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login on `demo.lekbanken.no:3000` | Cookie set with `domain=.lekbanken.no` |
| 2 | Clear cookies, login on `testcustom.example.com:3000` | Cookie set host-only (no domain attr) |
| 3 | Login on `localhost:3000` | Cookie non-secure, host-only |

Verify in browser DevTools > Application > Cookies.

**Status:** [ ] Pass / [ ] Fail

---

### T8: Unauthenticated Tenant Context

**Scenario:** Hostname sets tenant context even before login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `demo.lekbanken.no:3000/app` (not logged in) | Redirects to login |
| 2 | After login, verify tenant auto-selected | Should be demo tenant |
| 3 | Check that hostname-resolved tenant takes priority | Over cookie from previous session |

**Status:** [ ] Pass / [ ] Fail

---

### T9: Inactive Custom Domain Rejected

**Scenario:** Suspended or pending domains should not resolve

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set domain status to 'suspended' in DB | `UPDATE tenant_domains SET status = 'suspended' WHERE hostname = 'testcustom.example.com'` |
| 2 | Navigate to `testcustom.example.com:3000/app` | Should receive HTTP 404 |
| 3 | Set status back to 'active' | Should work again |

**Status:** [ ] Pass / [ ] Fail

---

### T10: Localhost Development Works

**Scenario:** Development environment unaffected

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `localhost:3000/app` | Should work normally |
| 2 | Login and use app | All existing functionality works |
| 3 | Tenant resolution via cookie/membership | Works as before |

**Status:** [ ] Pass / [ ] Fail

---

## Acceptance Criteria

All of the following must pass:

- [ ] **T1-T3**: Basic hostname resolution works for platform and custom domains
- [ ] **T4-T5**: Security: untrusted hosts rejected, header injection blocked
- [ ] **T6**: Path override maintains backward compatibility
- [ ] **T7**: Cookie domain behavior correct per domain type
- [ ] **T8**: Hostname resolution works before authentication
- [ ] **T9**: Inactive domains are not resolved
- [ ] **T10**: Development workflow unaffected

---

## Rollback Plan

If issues are discovered in production:

1. **Immediate:** Set `DISABLE_HOSTNAME_RESOLUTION=true` env var (requires code addition)
2. **Quick fix:** Revert `proxy.ts` to previous version
3. **Data cleanup:** No data migrations to roll back (read-only feature)

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |
