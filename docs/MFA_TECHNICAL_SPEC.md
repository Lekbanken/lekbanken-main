# MFA Teknisk Specifikation för Lekbanken

**Datum:** 2026-01-13  
**Version:** 1.0  
**Status:** Enterprise-grade design

---

## 📋 Innehåll

1. [Arkitekturöversikt](#arkitekturoversikt)
2. [Database Schema](#database-schema)
3. [RLS Policies](#rls-policies)
4. [API Endpoints](#api-endpoints)
5. [Supabase Auth Integration](#supabase-auth-integration)
6. [Security Model](#security-model)
7. [TypeScript Types](#typescript-types)

---

## 🏗️ Arkitekturöversikt

### Säkerhetsnivåer

| Nivå | Namn | Beskrivning |
|------|------|-------------|
| 1 | Optional | MFA är valfritt för alla användare |
| 2 | Admins Only | Obligatorisk MFA för admins och coaches |
| 3 | All Users | Obligatorisk MFA för hela organisationen |

### Auth Flow med MFA

```
┌──────────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────┐  │
│  │  User   │───▶│ Email/Pass   │───▶│ Supabase    │───▶│ Session  │  │
│  │         │    │ Form         │    │ Auth        │    │ Created  │  │
│  └─────────┘    └──────────────┘    └─────────────┘    └────┬─────┘  │
│                                                              │        │
│                                     ┌────────────────────────▼──────┐ │
│                                     │      CHECK MFA REQUIRED       │ │
│                                     │                               │ │
│                                     │  1. Check tenant policy       │ │
│                                     │  2. Check user role           │ │
│                                     │  3. Check if MFA enrolled     │ │
│                                     │  4. Check AAL level           │ │
│                                     │  5. Check trusted device      │ │
│                                     └────────────┬──────────────────┘ │
│                                                  │                    │
│            ┌─────────────────┬───────────────────┼───────────────┐   │
│            ▼                 ▼                   ▼               ▼   │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌──────────┐ │
│     │ No MFA     │   │ MFA not    │   │ MFA        │   │ Trusted  │ │
│     │ required   │   │ enrolled   │   │ Challenge  │   │ Device   │ │
│     └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └────┬─────┘ │
│           │                │                │                │       │
│           │                ▼                ▼                │       │
│           │     ┌──────────────┐   ┌──────────────┐         │       │
│           │     │ Force        │   │ Enter TOTP   │         │       │
│           │     │ Enrollment   │   │ or Recovery  │         │       │
│           │     │ (grace?)     │   │ Code         │         │       │
│           │     └──────┬───────┘   └──────┬───────┘         │       │
│           │            │                  │                  │       │
│           │            ▼                  ▼                  │       │
│           │     ┌──────────────┐   ┌──────────────┐         │       │
│           │     │ Enrollment   │   │ Verify       │         │       │
│           │     │ Flow         │   │ Code         │         │       │
│           │     └──────┬───────┘   └──────┬───────┘         │       │
│           │            │                  │                  │       │
│           ▼            ▼                  ▼                  ▼       │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │                    ACCESS GRANTED (AAL2)                     │ │
│     │                                                              │ │
│     │   Optional: "Trust this device for 30 days?"                │ │
│     └─────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 💾 Database Schema

### Nya Tabeller

#### 1. `tenant_mfa_policies` - Tenant-wide MFA-inställningar

```sql
-- Tenant-wide MFA Policy
CREATE TABLE IF NOT EXISTS public.tenant_mfa_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Policy Settings
  is_enforced BOOLEAN NOT NULL DEFAULT false,
  enforcement_level TEXT NOT NULL DEFAULT 'optional' 
    CHECK (enforcement_level IN ('optional', 'admins_only', 'all_users')),
  grace_period_days INTEGER NOT NULL DEFAULT 7
    CHECK (grace_period_days >= 0 AND grace_period_days <= 90),
  
  -- Allowed Methods
  allow_totp BOOLEAN NOT NULL DEFAULT true,
  allow_sms BOOLEAN NOT NULL DEFAULT false,
  allow_webauthn BOOLEAN NOT NULL DEFAULT false,
  
  -- Recovery Options
  require_backup_email BOOLEAN NOT NULL DEFAULT false,
  recovery_codes_required BOOLEAN NOT NULL DEFAULT true,
  
  -- Trusted Devices
  allow_trusted_devices BOOLEAN NOT NULL DEFAULT true,
  trusted_device_duration_days INTEGER NOT NULL DEFAULT 30
    CHECK (trusted_device_duration_days >= 1 AND trusted_device_duration_days <= 365),
  
  -- Enforcement Metadata
  enforced_at TIMESTAMPTZ,
  enforced_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_tenant_mfa_policies_tenant 
  ON public.tenant_mfa_policies(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER tenant_mfa_policies_updated_at
  BEFORE UPDATE ON public.tenant_mfa_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

#### 2. `mfa_trusted_devices` - Betrodda enheter

```sql
-- Trusted Devices for MFA bypass
CREATE TABLE IF NOT EXISTS public.mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Device Identification
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  
  -- Device Metadata
  user_agent TEXT,
  ip_address INET,
  browser TEXT,
  os TEXT,
  
  -- Token for verification
  trust_token_hash TEXT NOT NULL,
  
  -- Validity
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One fingerprint per user per tenant
  UNIQUE(user_id, tenant_id, device_fingerprint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_user 
  ON public.mfa_trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_tenant 
  ON public.mfa_trusted_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_expires 
  ON public.mfa_trusted_devices(expires_at) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_mfa_trusted_devices_token 
  ON public.mfa_trusted_devices(trust_token_hash) WHERE NOT is_revoked;
```

#### 3. `mfa_audit_log` - MFA-specifik audit log

```sql
-- MFA Audit Log
CREATE TABLE IF NOT EXISTS public.mfa_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'enrollment_started',
    'enrollment_completed',
    'enrollment_cancelled',
    'verification_success',
    'verification_failed',
    'disabled_by_user',
    'disabled_by_admin',
    'recovery_code_generated',
    'recovery_code_used',
    'device_trusted',
    'device_revoked',
    'enforcement_triggered',
    'grace_period_warning'
  )),
  
  -- Method used
  method TEXT CHECK (method IN ('totp', 'recovery_code', 'sms', 'webauthn', NULL)),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  failure_count INTEGER,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_user 
  ON public.mfa_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_tenant 
  ON public.mfa_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_event 
  ON public.mfa_audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_audit_log_failures 
  ON public.mfa_audit_log(user_id, created_at DESC) 
  WHERE success = false;

-- Partition hint for future scaling (comment for reference)
-- Consider partitioning by created_at if table grows large
```

### Modifieringar av Befintliga Tabeller

#### Uppdatera `user_mfa`

```sql
-- Add missing columns to user_mfa
ALTER TABLE public.user_mfa
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS backup_email TEXT,
  ADD COLUMN IF NOT EXISTS recovery_codes_count INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS recovery_codes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_codes_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- Add index for tenant lookup
CREATE INDEX IF NOT EXISTS idx_user_mfa_tenant 
  ON public.user_mfa(tenant_id);

-- Comment on columns
COMMENT ON COLUMN public.user_mfa.tenant_id IS 'Primary tenant context for MFA settings';
COMMENT ON COLUMN public.user_mfa.backup_email IS 'Alternative email for recovery notifications';
COMMENT ON COLUMN public.user_mfa.recovery_codes_count IS 'Total recovery codes generated';
COMMENT ON COLUMN public.user_mfa.recovery_codes_used IS 'Number of recovery codes already used';
COMMENT ON COLUMN public.user_mfa.grace_period_end IS 'Deadline for MFA enrollment if enforced';
```

---

## 🔐 RLS Policies

### tenant_mfa_policies

```sql
-- Enable RLS
ALTER TABLE public.tenant_mfa_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS tenant_mfa_policies_select ON public.tenant_mfa_policies;
DROP POLICY IF EXISTS tenant_mfa_policies_insert ON public.tenant_mfa_policies;
DROP POLICY IF EXISTS tenant_mfa_policies_update ON public.tenant_mfa_policies;
DROP POLICY IF EXISTS tenant_mfa_policies_delete ON public.tenant_mfa_policies;

-- SELECT: All authenticated users in tenant can read policy
CREATE POLICY tenant_mfa_policies_select ON public.tenant_mfa_policies
  FOR SELECT
  TO authenticated
  USING (
    public.is_system_admin()
    OR tenant_id IN (SELECT public.get_user_tenant_ids())
  );

-- INSERT: Only system admin or tenant owner/admin
CREATE POLICY tenant_mfa_policies_insert ON public.tenant_mfa_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- UPDATE: Only system admin or tenant owner/admin
CREATE POLICY tenant_mfa_policies_update ON public.tenant_mfa_policies
  FOR UPDATE
  TO authenticated
  USING (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- DELETE: Only system admin
CREATE POLICY tenant_mfa_policies_delete ON public.tenant_mfa_policies
  FOR DELETE
  TO authenticated
  USING (public.is_system_admin());
```

### mfa_trusted_devices

```sql
-- Enable RLS
ALTER TABLE public.mfa_trusted_devices ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see own devices, admins see tenant devices
CREATE POLICY mfa_trusted_devices_select ON public.mfa_trusted_devices
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_system_admin()
    OR (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
    )
  );

-- INSERT: Users can only add own devices
CREATE POLICY mfa_trusted_devices_insert ON public.mfa_trusted_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update own, admins can update tenant
CREATE POLICY mfa_trusted_devices_update ON public.mfa_trusted_devices
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- DELETE: Users can delete own, admins can delete tenant
CREATE POLICY mfa_trusted_devices_delete ON public.mfa_trusted_devices
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );
```

### mfa_audit_log

```sql
-- Enable RLS
ALTER TABLE public.mfa_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: Users see own logs, admins see tenant logs
CREATE POLICY mfa_audit_log_select ON public.mfa_audit_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_system_admin()
    OR (
      tenant_id IS NOT NULL
      AND public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
    )
  );

-- INSERT: Service role only (via API)
-- Note: No insert policy for authenticated - use service role client
CREATE POLICY mfa_audit_log_insert ON public.mfa_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- No UPDATE or DELETE - audit logs are immutable
```

---

## 🔌 API Endpoints

### Befintliga (behåll men modifiera)

| Endpoint | Metod | Beskrivning | Ändringar |
|----------|-------|-------------|-----------|
| `/api/accounts/auth/mfa/status` | GET | Hämta MFA-status | Lägg till tenant policy |
| `/api/accounts/auth/mfa/enroll` | POST | Starta TOTP enrollment | Behåll |
| `/api/accounts/auth/mfa/verify` | POST | Verifiera TOTP och aktivera | Förbättra logging |
| `/api/accounts/auth/mfa/disable` | POST | Stäng av MFA | Kräv verifiering |
| `/api/accounts/auth/mfa/recovery-codes` | POST | Generera recovery codes | Bcrypt hashing |

### Nya Endpoints

#### User MFA Endpoints

```typescript
// GET /api/accounts/auth/mfa/policy
// Hämta aktiv MFA-policy för användarens tenant
interface MFAPolicyResponse {
  policy: TenantMFAPolicy | null;
  user_status: {
    is_enrolled: boolean;
    is_required: boolean;
    grace_period_end: string | null;
    days_remaining: number | null;
  };
}

// POST /api/accounts/auth/mfa/challenge
// Skapa MFA challenge för verifiering
interface MFAChallengeRequest {
  factor_id: string;
}
interface MFAChallengeResponse {
  challenge_id: string;
  expires_at: string;
}

// POST /api/accounts/auth/mfa/verify-challenge
// Verifiera MFA challenge (vid login)
interface MFAVerifyChallengeRequest {
  challenge_id: string;
  code: string;
  trust_device?: boolean;
  device_name?: string;
}
interface MFAVerifyChallengeResponse {
  success: boolean;
  trust_token?: string; // Only if trust_device=true
}

// POST /api/accounts/auth/mfa/verify-recovery
// Verifiera recovery code
interface MFAVerifyRecoveryRequest {
  code: string;
}
interface MFAVerifyRecoveryResponse {
  success: boolean;
  codes_remaining: number;
}
```

#### Trusted Devices Endpoints

```typescript
// GET /api/accounts/auth/mfa/devices
// Lista betrodda enheter
interface TrustedDevicesResponse {
  devices: TrustedDevice[];
}

// POST /api/accounts/auth/mfa/devices/trust
// Lägg till betrodd enhet
interface TrustDeviceRequest {
  device_fingerprint: string;
  device_name?: string;
}
interface TrustDeviceResponse {
  device_id: string;
  trust_token: string;
  expires_at: string;
}

// POST /api/accounts/auth/mfa/devices/verify
// Verifiera om enhet är betrodd
interface VerifyTrustedDeviceRequest {
  trust_token: string;
  device_fingerprint: string;
}
interface VerifyTrustedDeviceResponse {
  is_trusted: boolean;
  expires_at?: string;
}

// DELETE /api/accounts/auth/mfa/devices/[deviceId]
// Ta bort betrodd enhet
```

#### Admin Endpoints

```typescript
// GET /api/admin/tenant/[tenantId]/mfa/policy
// Hämta tenant MFA policy
interface AdminMFAPolicyResponse {
  policy: TenantMFAPolicy;
  stats: {
    total_users: number;
    mfa_enabled: number;
    mfa_pending: number;
  };
}

// PUT /api/admin/tenant/[tenantId]/mfa/policy
// Uppdatera tenant MFA policy
interface UpdateMFAPolicyRequest {
  enforcement_level?: 'optional' | 'admins_only' | 'all_users';
  grace_period_days?: number;
  allow_totp?: boolean;
  allow_sms?: boolean;
  allow_webauthn?: boolean;
  allow_trusted_devices?: boolean;
  trusted_device_duration_days?: number;
  require_backup_email?: boolean;
}

// GET /api/admin/tenant/[tenantId]/mfa/users
// Lista användare med MFA-status
interface MFAUserListResponse {
  users: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    mfa_enabled: boolean;
    enrolled_at: string | null;
    last_verified_at: string | null;
    trusted_devices_count: number;
  }[];
}

// POST /api/admin/tenant/[tenantId]/mfa/users/[userId]/reset
// Återställ MFA för användare (admin)
interface AdminResetMFARequest {
  reason: string;
}
interface AdminResetMFAResponse {
  success: boolean;
  notification_sent: boolean;
}

// GET /api/admin/tenant/[tenantId]/mfa/audit
// Hämta MFA audit log för tenant
interface MFAAuditLogResponse {
  events: MFAAuditEvent[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}
```

---

## 🔗 Supabase Auth Integration

### AAL (Authenticator Assurance Level)

```typescript
// lib/auth/mfa.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type AALLevel = 'aal1' | 'aal2';

/**
 * Get current Authenticator Assurance Level
 * 
 * AAL1 = Password only
 * AAL2 = Password + MFA verified
 */
export async function getAuthenticatorAssuranceLevel(
  supabase: SupabaseClient<Database>
): Promise<{
  currentLevel: AALLevel;
  nextLevel: AALLevel | null;
  currentAuthenticationMethods: Array<{ method: string; timestamp: number }>;
}> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  
  if (error) {
    console.error('[MFA] Error getting AAL:', error);
    return {
      currentLevel: 'aal1',
      nextLevel: null,
      currentAuthenticationMethods: [],
    };
  }
  
  return {
    currentLevel: data.currentLevel as AALLevel,
    nextLevel: data.nextLevel as AALLevel | null,
    currentAuthenticationMethods: data.currentAuthenticationMethods,
  };
}

/**
 * Check if user has MFA enrolled
 */
export async function hasMFAEnrolled(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  
  if (error) {
    console.error('[MFA] Error listing factors:', error);
    return false;
  }
  
  return (data.totp?.length ?? 0) > 0;
}

/**
 * Check if MFA verification is needed
 */
export async function needsMFAVerification(
  supabase: SupabaseClient<Database>
): Promise<boolean> {
  const { currentLevel, nextLevel } = await getAuthenticatorAssuranceLevel(supabase);
  
  // If AAL2 is available but we're at AAL1, MFA is needed
  return currentLevel === 'aal1' && nextLevel === 'aal2';
}
```

### MFA Challenge Flow

```typescript
// lib/auth/mfa-challenge.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Create MFA challenge and verify code
 * Used during login flow when MFA is required
 */
export async function createAndVerifyMFAChallenge(
  supabase: SupabaseClient<Database>,
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Create challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  
  if (challengeError) {
    return { success: false, error: challengeError.message };
  }
  
  // Verify challenge
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  
  if (verifyError) {
    return { success: false, error: verifyError.message };
  }
  
  return { success: true };
}

/**
 * Get primary TOTP factor
 */
export async function getPrimaryTOTPFactor(
  supabase: SupabaseClient<Database>
): Promise<{ id: string; friendlyName: string } | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  
  if (error || !data.totp?.length) {
    return null;
  }
  
  const verifiedFactor = data.totp.find(f => f.status === 'verified');
  if (!verifiedFactor) {
    return null;
  }
  
  return {
    id: verifiedFactor.id,
    friendlyName: verifiedFactor.friendly_name ?? 'Authenticator App',
  };
}
```

---

## 🛡️ Security Model

### Threat Model

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **TOTP Brute Force** | Attacker guesses 6-digit codes | Rate limit: 5 attempts/5min, lockout 15min |
| **Recovery Code Theft** | Stolen recovery codes used | Hash with bcrypt, single-use, alert on use |
| **Session Hijacking** | Attacker steals session cookie | Bind session to device fingerprint |
| **MFA Bypass** | Attacker finds flow without MFA | Enforce in proxy.ts, check AAL |
| **Phishing** | User enters code on fake site | Educate, origin binding |
| **Replay Attack** | Captured code reused | TOTP window is 30s, Supabase handles |
| **Trusted Device Theft** | Stolen device auto-logs in | Require device fingerprint + token |
| **Admin Account Takeover** | Admin accounts are high-value | Force MFA for all admins |

### Rate Limiting

```typescript
// lib/auth/mfa-rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Rate limiters
export const mfaVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5m'), // 5 attempts per 5 minutes
  analytics: true,
  prefix: 'mfa:verify',
});

export const mfaEnrollLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1h'), // 3 enrollments per hour
  analytics: true,
  prefix: 'mfa:enroll',
});

export const recoveryCodeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1h'), // 3 recovery attempts per hour
  analytics: true,
  prefix: 'mfa:recovery',
});

/**
 * Check rate limit for MFA verification
 */
export async function checkMFAVerifyLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> {
  const result = await mfaVerifyLimiter.limit(userId);
  return {
    allowed: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

### Recovery Code Security

```typescript
// lib/auth/recovery-codes.ts

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const RECOVERY_CODE_LENGTH = 10;
const RECOVERY_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 12;

/**
 * Generate recovery codes
 * Format: XXXX-XXXX-XXXX (alphanumeric, uppercase)
 */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(6);
    const code = bytes.toString('hex').toUpperCase().slice(0, 12);
    return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
  });
}

/**
 * Hash recovery codes with bcrypt
 */
export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  const normalizedCodes = codes.map(c => c.replace(/-/g, '').toUpperCase());
  return Promise.all(
    normalizedCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
  );
}

/**
 * Verify a recovery code against hashed codes
 * Returns index of matched code or -1 if no match
 */
export async function verifyRecoveryCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  const normalizedCode = code.replace(/-/g, '').toUpperCase();
  
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcrypt.compare(normalizedCode, hashedCodes[i]);
    if (isMatch) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Remove used code from array (mark as used)
 */
export function markCodeAsUsed(
  hashedCodes: string[],
  usedIndex: number
): string[] {
  // Replace used code with empty string to preserve indexes
  // This allows tracking which codes were used
  const updated = [...hashedCodes];
  updated[usedIndex] = '';
  return updated;
}
```

---

## 📝 TypeScript Types

```typescript
// types/mfa.ts

/**
 * MFA User Settings (stored in user_mfa table)
 */
export interface MFAUserSettings {
  user_id: string;
  tenant_id: string | null;
  enforced_reason: string | null;
  enrolled_at: string | null;
  last_verified_at: string | null;
  recovery_codes_hashed: string[] | null;
  recovery_codes_count: number;
  recovery_codes_used: number;
  recovery_codes_generated_at: string | null;
  methods: MFAMethods;
  backup_email: string | null;
  notification_preferences: MFANotificationPreferences;
  grace_period_end: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * MFA Methods enabled for user
 */
export interface MFAMethods {
  totp?: {
    factor_id: string;
    enrolled_at: string;
  };
  sms?: {
    phone_number: string;
    enrolled_at: string;
  };
  webauthn?: {
    credentials: string[];
    enrolled_at: string;
  };
}

/**
 * MFA Notification Preferences
 */
export interface MFANotificationPreferences {
  email_on_new_device?: boolean;
  email_on_recovery_use?: boolean;
  email_on_mfa_disabled?: boolean;
}

/**
 * Tenant MFA Policy
 */
export interface TenantMFAPolicy {
  id: string;
  tenant_id: string;
  is_enforced: boolean;
  enforcement_level: 'optional' | 'admins_only' | 'all_users';
  grace_period_days: number;
  allow_totp: boolean;
  allow_sms: boolean;
  allow_webauthn: boolean;
  require_backup_email: boolean;
  recovery_codes_required: boolean;
  allow_trusted_devices: boolean;
  trusted_device_duration_days: number;
  enforced_at: string | null;
  enforced_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Trusted Device
 */
export interface MFATrustedDevice {
  id: string;
  user_id: string;
  tenant_id: string;
  device_fingerprint: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  browser: string | null;
  os: string | null;
  trust_token_hash: string;
  trusted_at: string;
  expires_at: string;
  last_used_at: string | null;
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

/**
 * MFA Audit Event
 */
export interface MFAAuditEvent {
  id: string;
  user_id: string;
  tenant_id: string | null;
  event_type: MFAAuditEventType;
  method: 'totp' | 'recovery_code' | 'sms' | 'webauthn' | null;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  success: boolean;
  failure_reason: string | null;
  failure_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * MFA Audit Event Types
 */
export type MFAAuditEventType =
  | 'enrollment_started'
  | 'enrollment_completed'
  | 'enrollment_cancelled'
  | 'verification_success'
  | 'verification_failed'
  | 'disabled_by_user'
  | 'disabled_by_admin'
  | 'recovery_code_generated'
  | 'recovery_code_used'
  | 'device_trusted'
  | 'device_revoked'
  | 'enforcement_triggered'
  | 'grace_period_warning';

/**
 * MFA Status for frontend
 */
export interface MFAStatus {
  is_enabled: boolean;
  is_required: boolean;
  enrolled_at: string | null;
  last_verified_at: string | null;
  recovery_codes_remaining: number;
  trusted_devices_count: number;
  grace_period_end: string | null;
  days_until_required: number | null;
  factors: {
    totp: boolean;
    sms: boolean;
    webauthn: boolean;
  };
}

/**
 * MFA Requirement Check Result
 */
export interface MFARequirementCheck {
  required: boolean;
  reason: 'tenant_policy' | 'role_based' | 'user_setting' | null;
  enforcement_level: 'optional' | 'admins_only' | 'all_users' | null;
  grace_period_active: boolean;
  days_remaining: number | null;
}
```

---

## 📁 Filstruktur

```
app/
├── api/
│   └── accounts/
│       └── auth/
│           └── mfa/
│               ├── challenge/
│               │   └── route.ts          # POST - Create challenge
│               ├── devices/
│               │   ├── route.ts          # GET - List devices
│               │   ├── trust/
│               │   │   └── route.ts      # POST - Trust device
│               │   ├── verify/
│               │   │   └── route.ts      # POST - Verify trusted
│               │   └── [deviceId]/
│               │       └── route.ts      # DELETE - Revoke device
│               ├── disable/
│               │   └── route.ts          # POST - Disable MFA (modify)
│               ├── enroll/
│               │   └── route.ts          # POST - Start enrollment
│               ├── policy/
│               │   └── route.ts          # GET - Get user's policy
│               ├── recovery-codes/
│               │   ├── route.ts          # POST - Generate codes (modify)
│               │   └── verify/
│               │       └── route.ts      # POST - Verify recovery code
│               ├── status/
│               │   └── route.ts          # GET - Get MFA status
│               └── verify/
│                   └── route.ts          # POST - Verify TOTP
├── auth/
│   └── mfa-challenge/
│       └── page.tsx                      # MFA challenge page
└── admin/
    └── tenant/
        └── [tenantId]/
            └── security/
                └── mfa/
                    ├── page.tsx          # MFA policy admin
                    └── users/
                        └── page.tsx      # MFA user management

lib/
├── auth/
│   ├── mfa.ts                            # Core MFA utilities
│   ├── mfa-challenge.ts                  # Challenge/verify logic
│   ├── mfa-rate-limit.ts                 # Rate limiting
│   ├── mfa-requirement.ts                # Policy enforcement
│   └── recovery-codes.ts                 # Recovery code handling
└── services/
    └── mfa/
        ├── mfaService.server.ts          # Server-side MFA service
        ├── mfaAudit.server.ts            # Audit logging
        └── mfaDevices.server.ts          # Trusted devices

components/
├── auth/
│   ├── MFAChallenge.tsx                  # Challenge input component
│   ├── MFARecoveryInput.tsx              # Recovery code input
│   └── TrustDeviceCheckbox.tsx           # Trust device option
└── profile/
    ├── MFAEnrollmentDialog.tsx           # Enrollment wizard
    ├── MFARecoveryCodesDialog.tsx        # View/download codes
    ├── MFATrustedDevices.tsx             # Device management
    └── MFASettingsCard.tsx               # Profile MFA section

hooks/
├── useMFA.ts                             # MFA state hook
├── useMFAChallenge.ts                    # Challenge flow hook
└── useTenantMFAPolicy.ts                 # Policy hook

types/
└── mfa.ts                                # All MFA types

supabase/
└── migrations/
    ├── YYYYMMDD_mfa_tenant_policies.sql  # Tenant policies table
    ├── YYYYMMDD_mfa_trusted_devices.sql  # Trusted devices table
    ├── YYYYMMDD_mfa_audit_log.sql        # Audit log table
    └── YYYYMMDD_mfa_user_updates.sql     # user_mfa modifications
```

---

## 🔄 Migration Order

1. `YYYYMMDD_001_mfa_types.sql` - Skapa enums om nödvändigt
2. `YYYYMMDD_002_mfa_tenant_policies.sql` - Tenant policies tabell
3. `YYYYMMDD_003_mfa_trusted_devices.sql` - Trusted devices tabell
4. `YYYYMMDD_004_mfa_audit_log.sql` - Audit log tabell
5. `YYYYMMDD_005_mfa_user_updates.sql` - Uppdatera user_mfa tabell
6. `YYYYMMDD_006_mfa_rls_policies.sql` - Alla RLS policies
7. `YYYYMMDD_007_mfa_functions.sql` - Helper functions (om behövs)
