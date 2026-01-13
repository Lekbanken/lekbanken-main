# MFA Security Documentation för Lekbanken

**Datum:** 2026-01-13  
**Version:** 1.0  
**Status:** Enterprise Security Review

---

## 🛡️ Executive Summary

Detta dokument beskriver säkerhetsmodellen för Lekbankens MFA-implementation. Det täcker threat model, mitigation strategies, compliance och security checklist.

---

## 🔐 Threat Model

### Attackytor

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ATTACK SURFACE MAP                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Network   │    │ Application │    │       Database          │ │
│  │   Layer     │    │   Layer     │    │       Layer             │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────────────────┤ │
│  │ • MITM      │    │ • Brute     │    │ • SQL Injection         │ │
│  │ • Replay    │    │   Force     │    │ • Recovery Code Theft   │ │
│  │ • Session   │    │ • Phishing  │    │ • RLS Bypass            │ │
│  │   Hijack    │    │ • CSRF      │    │ • Audit Log Tampering   │ │
│  │             │    │ • XSS       │    │                         │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │   Device    │    │   Social    │    │       Insider           │ │
│  │   Layer     │    │ Engineering │    │       Threat            │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────────────────┤ │
│  │ • Malware   │    │ • Phishing  │    │ • Admin Abuse           │ │
│  │ • Keylogger │    │ • Vishing   │    │ • Support Fraud         │ │
│  │ • Device    │    │ • Pretexting│    │ • Privileged Access     │ │
│  │   Theft     │    │             │    │                         │ │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Detaljerade Hot

| Threat ID | Namn | Beskrivning | Allvarlighet | Sannolikhet |
|-----------|------|-------------|--------------|-------------|
| T-001 | TOTP Brute Force | Attacker gissar 6-siffriga koder | Hög | Medium |
| T-002 | Recovery Code Theft | Stulna recovery codes används | Kritisk | Låg |
| T-003 | Session Hijacking | Kapning av autentiserad session | Kritisk | Medium |
| T-004 | MFA Bypass | Undvika MFA-kontroll i auth flow | Kritisk | Låg |
| T-005 | Phishing | Användare luras lämna ut kod | Hög | Hög |
| T-006 | Replay Attack | Återanvändning av fångad kod | Medium | Låg |
| T-007 | Trusted Device Theft | Stulen enhet med trust token | Hög | Medium |
| T-008 | Admin Account Takeover | Komprometterat admin-konto | Kritisk | Låg |
| T-009 | TOTP Secret Exposure | TOTP-hemlighet läcker | Kritisk | Mycket Låg |
| T-010 | Timing Attack | Timing-baserad information leak | Låg | Mycket Låg |
| T-011 | Recovery Code Reuse | Samma kod används flera gånger | Medium | Låg |
| T-012 | Social Engineering | Lura support att reset MFA | Hög | Medium |

---

## 🔒 Mitigation Strategies

### T-001: TOTP Brute Force

**Risk:** 10^6 möjliga koder = ~16 minuter vid 1000 försök/sek

**Mitigations:**
1. **Rate Limiting:** 5 försök per 5 minuter per användare
2. **Lockout:** 15 minuters lockout efter 5 misslyckade försök
3. **Alert:** Email-notifikation vid 3+ misslyckade försök
4. **Audit:** Alla försök loggas med IP och user agent

```typescript
// lib/auth/mfa-rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';

export const mfaVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5m'),
  analytics: true,
  prefix: 'mfa:verify',
});

// In API route
const { success, remaining, reset } = await mfaVerifyLimiter.limit(userId);
if (!success) {
  return { error: 'Too many attempts', retry_after: reset };
}
```

### T-002: Recovery Code Theft

**Risk:** Om recovery codes komprometteras kan angripare logga in

**Mitigations:**
1. **Hashing:** Koder hashas med bcrypt (cost 12)
2. **Single-use:** Varje kod kan bara användas en gång
3. **Alert:** Email skickas vid recovery code-användning
4. **Regeneration:** Tvinga ny generation vid lågt antal
5. **Audit:** Detaljerad loggning av all recovery-användning

```typescript
// Bcrypt hashing - 12 rounds = ~200ms per hash
const hashedCode = await bcrypt.hash(code, 12);

// Single-use implementation
const updatedCodes = [...hashedCodes];
updatedCodes[usedIndex] = ''; // Mark as used
```

### T-003: Session Hijacking

**Risk:** Stulen session cookie ger full access

**Mitigations:**
1. **Device Binding:** Session binds till device fingerprint
2. **IP Monitoring:** Alert vid IP-byte
3. **AAL Check:** Kräv AAL2 för sensitiva operationer
4. **Short Sessions:** Session timeout 24h, MFA 8h
5. **Secure Cookies:** HttpOnly, Secure, SameSite=Lax

### T-004: MFA Bypass

**Risk:** Utvecklingsfel som tillåter åtkomst utan MFA

**Mitigations:**
1. **Centraliserad Check:** En enda punkt för MFA-verifiering
2. **Proxy Enforcement:** Kontroll i proxy.ts för alla /app routes
3. **AAL Validation:** Supabase AAL-nivå kontrolleras
4. **Defense in Depth:** Flera lager av kontroll
5. **Code Review:** Säkerhetsreview av auth-kod

```typescript
// proxy.ts - Centraliserad MFA check
const { currentLevel } = await getAuthenticatorAssuranceLevel(supabase);
const mfaRequired = await checkMFARequirement(user.id, tenantId, userRole);

if (mfaRequired.required && currentLevel === 'aal1') {
  // Check trusted device
  const isTrusted = await checkTrustedDevice(request, user.id);
  if (!isTrusted) {
    return redirect('/auth/mfa-challenge');
  }
}
```

### T-005: Phishing

**Risk:** Användare anger TOTP-kod på falsk sajt

**Mitigations:**
1. **User Education:** Tydlig information om att aldrig dela kod
2. **Domain Indication:** Visa tydligt vilken domän som är aktiv
3. **Short Window:** TOTP-koder giltiga endast 30 sekunder
4. **Future: WebAuthn:** Origen-bundna credentials (planerat)

### T-006: Replay Attack

**Risk:** Fångad TOTP-kod återanvänds

**Mitigations:**
1. **TOTP Window:** 30 sekunders giltighetstid (standard)
2. **Challenge-based:** Supabase använder challenge/verify pattern
3. **Timestamp Validation:** Server validerar tidsstämpel

### T-007: Trusted Device Theft

**Risk:** Stulen fysisk enhet ger automatisk inloggning

**Mitigations:**
1. **Dual Verification:** Kräv fingerprint + token
2. **Token Expiry:** 30 dagars maximal giltighetstid
3. **Device Management:** Användare kan se och revokera enheter
4. **IP Monitoring:** Alert vid användning från ny IP
5. **Revocation:** Instant revokering möjlig

```typescript
// Trusted device verification kräver båda
const isTrusted = 
  await verifyTrustToken(token) && 
  await matchDeviceFingerprint(fingerprint);
```

### T-008: Admin Account Takeover

**Risk:** Komprometterat admin-konto ger bred access

**Mitigations:**
1. **Mandatory MFA:** Alla admins måste ha MFA
2. **No Exceptions:** Ingen grace period för admins
3. **Elevated Verification:** Re-autentisering för känsliga ops
4. **Audit Trail:** Detaljerad loggning av admin-actions
5. **Multi-admin Approval:** MFA-reset kräver bekräftelse

### T-009: TOTP Secret Exposure

**Risk:** TOTP-hemlighet läcker och kan användas för att generera koder

**Mitigations:**
1. **Server-side Only:** Secret genereras och lagras i Supabase
2. **One-time Display:** Visas endast vid enrollment
3. **No Client Storage:** Aldrig lagrad i frontend
4. **Audit Enrollment:** Loggning av alla enrollment-försök

### T-010: Timing Attack

**Risk:** Tidsskillnader avslöjar information

**Mitigations:**
1. **Constant-time Compare:** bcrypt.compare är timing-safe
2. **Fixed Responses:** Samma svarstid oavsett resultat
3. **Generic Errors:** Inga specifika felmeddelanden

### T-011: Recovery Code Reuse

**Risk:** Samma kod används flera gånger om inte markerad som använd

**Mitigations:**
1. **Atomic Update:** Koden tas bort atomärt vid användning
2. **Database Constraint:** Index säkerställer unikhet
3. **Verification:** Dubbelkontroll i applikationslager

### T-012: Social Engineering

**Risk:** Angripare lurar support att återställa MFA

**Mitigations:**
1. **Identity Verification:** Strikta verifieringsprocedurer
2. **Multi-admin Approval:** Känsliga actions kräver godkännande
3. **Audit Trail:** Alla support-actions loggas
4. **User Notification:** Användare notifieras vid MFA-ändringar
5. **Cooldown Period:** Fördröjning efter MFA-reset

---

## 📋 Security Checklist

### Enrollment Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ✅ | TOTP secret genereras server-side | Implementerat (Supabase) |
| ✅ | Secret exponeras endast vid enrollment | Implementerat |
| ✅ | QR-kod genereras server-side | Implementerat (Supabase) |
| ⬜ | Enrollment kräver re-autentisering | Ska implementeras |
| ⬜ | Enrollment loggas i audit | Delvis (ska förbättras) |

### Verification Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ✅ | TOTP valideras via Supabase Auth | Implementerat |
| ⬜ | Rate limiting (5/5min) | Ska implementeras |
| ⬜ | Lockout efter misslyckade försök | Ska implementeras |
| ⬜ | Alla försök loggas | Ska implementeras |
| ✅ | Challenge/verify pattern | Implementerat (Supabase) |

### Recovery Code Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ⬜ | Koder hashas med bcrypt | Ska implementeras (nu SHA-256) |
| ⬜ | Koder är single-use | Ska implementeras |
| ⬜ | Alert vid användning | Ska implementeras |
| ⬜ | Force regeneration vid lågt antal | Ska implementeras |
| ⬜ | Regeneration loggas | Delvis |

### Session Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ⬜ | AAL-nivå kontrolleras i proxy | Ska implementeras |
| ⬜ | MFA-status verifieras vid login | Ska implementeras |
| ⬜ | Device fingerprinting | Ska implementeras |
| ✅ | Secure session cookies | Implementerat (Supabase) |
| ⬜ | Session-device binding | Ska implementeras |

### Admin Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ⬜ | Admins måste ha MFA | Ska implementeras |
| ⬜ | Admin MFA-reset kräver approval | Ska implementeras |
| ⬜ | Admin actions loggas detaljerat | Delvis |
| ⬜ | Tenant policy changes loggas | Ska implementeras |

### Trusted Device Security

| Check | Beskrivning | Status |
|-------|-------------|--------|
| ⬜ | Token hashas (SHA-256) | Ska implementeras |
| ⬜ | 30-dagars expiry | Ska implementeras |
| ⬜ | Device management UI | Ska implementeras |
| ⬜ | Revocation möjlig | Ska implementeras |
| ⬜ | New device alerts | Ska implementeras |

---

## 📊 OWASP MFA Compliance

### Authentication Verification Requirements (ASVS 2.0)

| Requirement | Beskrivning | Status | Notes |
|-------------|-------------|--------|-------|
| 2.1.1 | Password length 12+ chars | ✅ | Supabase standard |
| 2.2.1 | Anti-automation | ⬜ | Ska implementeras |
| 2.2.2 | Weak password block | ✅ | Supabase |
| 2.4.1 | Resistant to brute force | ⬜ | Rate limiting ska implementeras |
| 2.5.1 | Time-based OTP | ✅ | TOTP implementerat |
| 2.5.2 | OTP is generated securely | ✅ | Supabase |
| 2.5.3 | OTP is transmitted securely | ✅ | HTTPS |
| 2.6.1 | Lookup secrets hashed | ⬜ | Ska uppgraderas till bcrypt |
| 2.7.1 | OOB verifier has 20 bits | ✅ | 6-digit TOTP |
| 2.8.1 | Single-use tokens | ⬜ | Ska implementeras |
| 2.9.1 | Cryptographic authenticators | ✅ | TOTP |
| 2.10.1 | MFA enrollment requires MFA | ⬜ | Ska implementeras |

### Session Management (ASVS 3.0)

| Requirement | Beskrivning | Status | Notes |
|-------------|-------------|--------|-------|
| 3.1.1 | App never reveals session tokens | ✅ | HttpOnly cookies |
| 3.2.1 | Logout terminates session | ✅ | Supabase |
| 3.3.1 | Session timeout | ✅ | Configurable |
| 3.4.1 | Cookie-based session | ✅ | Supabase SSR |
| 3.7.1 | Re-authentication for sensitive | ⬜ | Ska implementeras |

---

## 🔍 Penetration Testing Scope

### In-Scope

1. **MFA Enrollment Flow**
   - QR code generation
   - Secret handling
   - Verification process
   - Recovery code generation

2. **MFA Challenge Flow**
   - Code verification
   - Rate limiting
   - Lockout mechanism
   - Recovery code usage

3. **Trusted Devices**
   - Token generation
   - Verification
   - Revocation
   - Expiry handling

4. **Admin Functions**
   - Policy management
   - User MFA reset
   - Audit log access

5. **Session Management**
   - AAL verification
   - Device binding
   - Session termination

### Out-of-Scope

- Supabase Auth infrastructure
- Network layer security
- Client-side device security
- Physical security

---

## 📈 Security Metrics

### Key Performance Indicators

| Metric | Target | Current |
|--------|--------|---------|
| MFA adoption rate (admins) | 100% | 0%* |
| MFA adoption rate (users) | >50% | ~5%* |
| Average failed attempts before success | <2 | N/A |
| Recovery code usage rate | <1%/month | N/A |
| Trusted device revocation rate | <5%/month | N/A |
| MFA-related support tickets | <10/month | N/A |

*Estimat baserat på nuvarande implementation

### Alerting Thresholds

| Event | Threshold | Action |
|-------|-----------|--------|
| Failed MFA attempts | >5 in 5 min | Email user, lock account 15 min |
| Recovery code used | Any | Email user immediately |
| New device trusted | Any | Email user immediately |
| MFA disabled | Any | Email user immediately |
| Admin MFA reset | Any | Email user + notify other admins |
| Policy change | Any | Notify all tenant admins |

---

## 🛠️ Incident Response

### MFA Compromise Scenarios

#### Scenario 1: Compromised TOTP Secret

**Detection:**
- User reports unauthorized access
- Unusual login patterns
- MFA verification from unknown IP

**Response:**
1. Immediately disable user's MFA
2. Force password reset
3. Revoke all sessions
4. Generate new recovery codes
5. Notify user via backup email
6. Investigate access logs

#### Scenario 2: Mass Recovery Code Leak

**Detection:**
- Multiple recovery code uses
- Unusual login patterns across users

**Response:**
1. Identify affected users
2. Force MFA re-enrollment
3. Invalidate all recovery codes
4. Notify affected users
5. Investigate source of leak
6. Review storage security

#### Scenario 3: Admin Account Takeover

**Detection:**
- Unusual admin activity
- Policy changes without authorization
- Mass MFA resets

**Response:**
1. Immediately suspend admin account
2. Revert recent changes
3. Audit all admin actions
4. Notify other admins
5. Investigate compromise
6. Review admin access controls

---

## 📝 Compliance Mapping

### GDPR

| Article | Requirement | Implementation |
|---------|-------------|----------------|
| 5(1)(f) | Integrity and confidentiality | MFA provides additional security layer |
| 25 | Data protection by design | MFA enforced for sensitive roles |
| 32 | Security of processing | MFA as technical measure |
| 33-34 | Breach notification | Audit logs support incident response |

### SOC 2 (Type II)

| Control | Requirement | Implementation |
|---------|-------------|----------------|
| CC6.1 | Logical access | MFA requirement for access |
| CC6.2 | Prior to registration | MFA enrollment process |
| CC6.3 | Remove access | Device revocation, MFA disable |
| CC6.6 | Output devices | Trusted device management |

### ISO 27001

| Control | Requirement | Implementation |
|---------|-------------|----------------|
| A.9.4.2 | Secure log-on | MFA provides second factor |
| A.9.4.3 | Password management | Combined with strong passwords |
| A.12.4.1 | Event logging | MFA audit log |
| A.18.1.3 | Protection of records | Audit log retention |

---

## 📚 References

1. OWASP Authentication Cheat Sheet
2. NIST SP 800-63B Digital Identity Guidelines
3. Supabase Auth MFA Documentation
4. RFC 6238 - TOTP
5. FIDO Alliance - WebAuthn (future consideration)
