# User Profile System - Nulägesanalys & Gap Analysis

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-16
- Last updated: 2026-03-21
- Last validated: -

> Draft current-state analysis of the user profile system and its enterprise implementation gaps.

**Datum:** 2026-01-15  
**Version:** 1.0  
**Syfte:** Komplett analys av befintlig profil-funktionalitet för enterprise-grade implementation

---

## 📊 Executive Summary

Lekbanken har en **partiellt implementerad** User Profile-lösning med grundläggande funktionalitet på plats men betydande luckor i enterprise-kraven. Särskilt GDPR user-rights (data export/radering), notifikationsinställningar, och connected accounts saknas helt i frontend.

**Nuvarande täckning:** ~45% av önskad enterprise-funktionalitet  
**Kritiska luckor:** GDPR frontend, Password change UI, Email change med verifikation, Data export, Account deletion

---

## 🗂️ A) Current State Overview

### Befintliga Profile Pages/Routes

| Route | Fil | Status | Beskrivning |
|-------|-----|--------|-------------|
| `/app/profile` | `app/app/profile/page.tsx` | ✅ Exists | Huvudprofil med allt i en sida |
| `/app/profile/edit` | `app/app/profile/edit/page.tsx` | ✅ Exists | Redigera namn/avatar (duplicerad) |
| `/app/profile/security` | `app/app/profile/security/page.tsx` | ✅ Exists | MFA-inställningar |
| `/app/profile/achievements` | `app/app/profile/achievements/page.tsx` | ✅ Exists | Visa prestationer |
| `/app/profile/coins` | `app/app/profile/coins/page.tsx` | ✅ Exists | Mynthistorik |
| `/app/profile/friends` | `app/app/profile/friends/page.tsx` | ✅ Exists | Vänner (om implementerat) |
| `/app/preferences` | `app/app/preferences/page.tsx` | ✅ Exists | Separata preferenser |
| `/app/profile/account` | - | ❌ Missing | Kontohantering |
| `/app/profile/privacy` | - | ❌ Missing | Privacy & GDPR |
| `/app/profile/notifications` | - | ❌ Missing | Notifikationsinställningar |
| `/app/profile/organizations` | - | ❌ Missing | Organisationsöversikt |
| `/app/profile/integrations` | - | ❌ Missing | Connected accounts, API keys |
| `/app/profile/activity` | - | ❌ Missing | Aktivitetslogg |

### Profile Feature Components

| Komponent | Plats | Status |
|-----------|-------|--------|
| `ProfilePage.tsx` | `features/profile/ProfilePage.tsx` | ✅ All-in-one page (551 lines) |
| `ProfileHeader.tsx` | `features/profile/components/` | ✅ Exists |
| `SettingsItem.tsx` | `features/profile/components/` | ✅ Exists |
| `SettingsList.tsx` | `features/profile/components/` | ✅ Exists |
| `LogoutButton.tsx` | `features/profile/components/` | ✅ Exists |
| `LanguageSelector.tsx` | `features/profile/components/` | ✅ Exists |
| `ProfileAchievementsShowcase.tsx` | `features/profile/components/` | ✅ Exists |
| `AchievementHistory.tsx` | `features/profile/components/` | ✅ Exists |
| `SecuritySettingsClient.tsx` | `app/app/profile/security/` | ✅ MFA hantering |
| `MFAEnrollmentModal.tsx` | `app/app/profile/security/` | ✅ MFA enrollering |

### Profile API Endpoints

| Endpoint | Metod | Status | Funktion |
|----------|-------|--------|----------|
| `/api/accounts/profile` | GET/PATCH | ✅ | Hämta/uppdatera profil |
| `/api/accounts/sessions` | GET | ✅ | Lista aktiva sessioner |
| `/api/accounts/sessions/revoke` | POST | ✅ | Avsluta session |
| `/api/accounts/devices` | GET | ✅ | Lista enheter |
| `/api/accounts/devices/remove` | POST | ✅ | Ta bort enhet |
| `/api/accounts/auth/mfa/status` | GET | ✅ | MFA-status |
| `/api/accounts/auth/mfa/enroll` | POST | ✅ | Starta MFA-registrering |
| `/api/accounts/auth/mfa/verify` | POST | ✅ | Verifiera MFA-kod |
| `/api/accounts/auth/mfa/disable` | POST | ✅ | Inaktivera MFA |
| `/api/accounts/auth/mfa/recovery-codes` | POST | ✅ | Generera recovery-koder |
| `/api/accounts/auth/mfa/devices` | GET | ✅ | Trusted devices |
| `/api/accounts/whoami` | GET | ✅ | Nuvarande användare |
| `/api/profile/avatar` | - | ❌ Missing | Separat avatar upload |
| `/api/profile/password` | - | ❌ Missing | Lösenordsbyte |
| `/api/profile/email` | - | ❌ Missing | E-postbyte med verifikation |
| `/api/profile/data-export` | - | ❌ Missing | GDPR data export |
| `/api/profile/delete-account` | - | ❌ Missing | Konto-radering |

---

## 🗄️ B) Database Schema Documentation

### Befintliga Tabeller

#### `users` (Huvudtabell)
```sql
-- Befintliga kolumner (från migrations)
id UUID PRIMARY KEY
email TEXT
full_name TEXT
role TEXT
language language_code_enum (NO, SE, EN)
avatar_url TEXT
preferred_theme TEXT ('light', 'dark', 'system')
show_theme_toggle_in_header BOOLEAN
global_role global_role_enum ('system_admin', 'private_user', 'demo_private_user', 'member')
email_verified BOOLEAN
mfa_enforced BOOLEAN
created_at, updated_at TIMESTAMPTZ
```

#### `user_profiles` (Extended profile data)
```sql
-- Från 20251209120000_accounts_domain.sql
user_id UUID PRIMARY KEY (FK users)
display_name TEXT
phone TEXT
job_title TEXT
organisation TEXT
timezone TEXT
locale TEXT
avatar_url TEXT
metadata JSONB
created_at, updated_at TIMESTAMPTZ
```

#### `user_preferences` (Personalization)
```sql
-- Från 20251129000013_personalization_domain.sql
id UUID PRIMARY KEY
tenant_id UUID (FK tenants) -- Kopplat till tenant!
user_id UUID (FK users)
language VARCHAR(10)
theme VARCHAR(20) ('light', 'dark', 'auto')
notifications_enabled BOOLEAN
email_frequency VARCHAR(20) ('daily', 'weekly', 'monthly', 'never')
preferred_game_categories TEXT[]
difficulty_preference VARCHAR(20)
content_maturity_level VARCHAR(20) ('kids', 'teen', 'mature')
profile_visibility VARCHAR(20) ('public', 'friends_only', 'private')
show_stats_publicly BOOLEAN
allow_friend_requests BOOLEAN
allow_messages BOOLEAN
enable_recommendations BOOLEAN
recommendation_frequency VARCHAR(20)
```

#### `user_devices` (Device tracking)
```sql
id UUID PRIMARY KEY
user_id UUID (FK users)
device_fingerprint TEXT
user_agent TEXT
device_type TEXT
ip_last INET
first_seen_at, last_seen_at TIMESTAMPTZ
risk_score NUMERIC
metadata JSONB
```

#### `user_sessions` (Session management)
```sql
id UUID PRIMARY KEY
user_id UUID (FK users)
supabase_session_id TEXT
device_id UUID (FK user_devices)
ip INET
user_agent TEXT
last_login_at, last_seen_at TIMESTAMPTZ
revoked_at TIMESTAMPTZ
risk_flags JSONB
```

#### `user_mfa` (MFA enrollment)
```sql
user_id UUID PRIMARY KEY (FK users)
enforced_reason TEXT
enrolled_at TIMESTAMPTZ
last_verified_at TIMESTAMPTZ
recovery_codes_hashed TEXT[]
methods JSONB
```

#### `user_audit_logs` (Audit trail)
```sql
id UUID PRIMARY KEY
user_id UUID (FK users)
actor_user_id UUID (FK users)
event_type TEXT
payload JSONB
created_at TIMESTAMPTZ
```

### GDPR-specifika Tabeller (finns i DB men ingen frontend)

#### `user_consents` (GDPR Art. 6, 7, 9)
```sql
-- Från 20260114200000_gdpr_compliance_tables.sql
id UUID PRIMARY KEY
user_id UUID, tenant_id UUID
consent_type TEXT ('essential', 'functional', 'analytics', 'marketing', 'special_category', 'parental')
purpose TEXT, granted BOOLEAN, policy_version TEXT
granted_at, withdrawn_at, expires_at TIMESTAMPTZ
ip_address INET, user_agent TEXT
parental_consent BOOLEAN, parent_user_id UUID, verified_at
```

#### `data_access_log` (GDPR Art. 30)
```sql
accessor_user_id, subject_user_id UUID
data_category TEXT, fields_accessed TEXT[], operation TEXT
legal_basis TEXT, purpose TEXT
```

#### `gdpr_requests` (Art. 12, 15-21)
```sql
user_id UUID, tenant_id UUID
request_type TEXT ('access', 'rectification', 'erasure', 'restriction', 'portability', 'objection')
status TEXT ('pending', 'in_progress', 'completed', 'rejected', 'cancelled')
request_details, response_details JSONB
handled_by UUID, response_deadline TIMESTAMPTZ
```

#### `data_retention_policies`
```sql
tenant_id UUID, data_category TEXT, table_name TEXT
retention_period INTERVAL, rationale TEXT
action_on_expiry TEXT ('delete', 'anonymize', 'archive')
```

### Saknade Tabeller för Enterprise

| Tabell | Status | Behov |
|--------|--------|-------|
| `notification_settings` | ❌ | Per-kategori notifikationsinställningar |
| `connected_accounts` | ❌ | OAuth providers (Google, Microsoft, GitHub) |
| `api_keys` | ❌ | User API keys för integrations |
| `webhooks` | ❌ | User webhooks |
| `login_history` | ❌ | Explicit login history (not just sessions) |
| `profile_change_log` | ❌ | Explicit profile change audit trail |
| `user_achievements` | ✅ Exists | Achievements kopplade till användare |

### RLS Policies (Befintliga)

| Tabell | Policy | Typ |
|--------|--------|-----|
| `user_profiles` | `user_profiles_owner` | ALL för ägare + system_admin |
| `user_devices` | `user_devices_owner` | ALL för ägare + system_admin |
| `user_sessions` | `user_sessions_owner` | ALL för ägare + system_admin |
| `user_mfa` | `user_mfa_owner` | ALL för ägare + system_admin |
| `user_audit_logs` | `user_audit_logs_owner` | SELECT för ägare + actor + system_admin |
| `user_preferences` | `user_preferences_select/update` | SELECT/UPDATE för ägare |
| `user_consents` | RLS enabled | Behöver granskas |
| `gdpr_requests` | RLS enabled | Behöver granskas |

---

## 📋 C) Feature Matrix

### Grundläggande Profil

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Display name | ✅ | | | - | I ProfilePage |
| First/Last name split | | | ✅ | Medium | Endast full_name |
| Email display | ✅ | | | - | Read-only |
| Email change | | | ✅ | High | Ingen UI |
| Phone number | | ✅ | | Medium | Finns i user_profiles, ej i UI |
| Bio/beskrivning | | | ✅ | Low | Saknas helt |
| Social links | | | ✅ | Low | Saknas helt |
| Custom username/slug | | | ✅ | Medium | Saknas |

### Avatar & Media

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Avatar presets | ✅ | | | - | avatarPresets.ts |
| Avatar upload | | | ✅ | High | Endast presets |
| Image cropping | | | ✅ | Medium | Saknas |
| Cover photo | | | ✅ | Low | Saknas |
| Remove avatar | ✅ | | | - | I ProfilePage |

### Säkerhet

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Password change | | | ✅ | **Critical** | Endast via recovery |
| MFA enable/disable | ✅ | | | - | Komplett |
| MFA TOTP setup | ✅ | | | - | QR + secret |
| Recovery codes | ✅ | | | - | Generate + display |
| Active sessions | ✅ | | | - | Lista + revoke |
| Trusted devices | ✅ | | | - | Lista + remove |
| Login history | | | ✅ | High | Saknas UI |
| Security keys (WebAuthn) | | | ✅ | Low | Framtida |
| Logout all devices | | ✅ | | Medium | Manuellt per session |

### Privacy & GDPR

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Profile visibility | | ✅ | | Medium | I user_preferences, ej i profile UI |
| Data export | | | ✅ | **Critical** | DB stöd finns, ingen UI |
| Account deletion | | | ✅ | **Critical** | gdpr_requests finns, ingen UI |
| Consent management | | ✅ | | High | user_consents finns, ingen UI |
| Data access log (view) | | | ✅ | Medium | data_access_log finns, ingen UI |
| Cookie preferences | ✅ | | | - | Via CookieConsentBanner |

### Notifikationer

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Email notifications toggle | | ✅ | | High | I user_preferences |
| Email frequency | | ✅ | | High | I user_preferences |
| Push notifications | | | ✅ | Medium | Ej implementerat |
| Per-category toggles | | | ✅ | High | Saknas helt |
| Digest settings | | | ✅ | Medium | Saknas |
| Do-Not-Disturb | | | ✅ | Low | Saknas |

### Preferenser

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Language selection | ✅ | | | - | NO/SE/EN |
| Theme (light/dark/system) | ✅ | | | - | Komplett |
| Show theme toggle | ✅ | | | - | Komplett |
| Timezone | | ✅ | | Medium | I user_profiles |
| Date/time format | | | ✅ | Low | Saknas |
| Accessibility settings | | | ✅ | Medium | Saknas |
| Compact mode | | | ✅ | Low | Saknas |

### Organisation

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| List my orgs | ✅ | | | - | TenantSwitcher |
| Switch organization | ✅ | | | - | TenantSwitcher |
| View roles/permissions | | ✅ | | Medium | Delvis |
| Leave organization | | | ✅ | Low | Saknas |
| Pending invitations | | | ✅ | Medium | Saknas |

### Integrations

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Connected accounts (OAuth) | | | ✅ | Medium | Saknas helt |
| API keys | | | ✅ | Medium | Admin finns, ej user |
| Webhooks | | | ✅ | Low | Saknas |

### Aktivitet & Gamification

| Feature | Exists | Partially | Missing | Priority | Notes |
|---------|--------|-----------|---------|----------|-------|
| Achievements display | ✅ | | | - | ProfileAchievementsShowcase |
| Achievements history | ✅ | | | - | AchievementHistory |
| Coins balance | ✅ | | | - | Coins page |
| Activity feed | | | ✅ | Low | Saknas |
| Usage statistics | | | ✅ | Low | Saknas |

---

## 🚨 D) Gap Analysis - Prioriterade Luckor

### 🔴 KRITISKA (GDPR & Security)

1. **Password Change UI** - Användare kan inte byta lösenord från profilen
   - Endast via recovery flow (forgot password)
   - Kräver current password verification
   - Bör skicka notifikation vid byte

2. **Email Change med Verifikation** - Ingen möjlighet att ändra e-post
   - Kräver verification email till båda adresser
   - Bör loggas i audit trail

3. **Data Export (GDPR Art. 15, 20)** - KRITISKT för Svenska Kyrkan
   - Database: `gdpr_requests` tabell finns
   - Frontend: SAKNAS helt
   - Backend: Behöver implementation

4. **Account Deletion (GDPR Art. 17)** - KRITISKT för Svenska Kyrkan
   - Database: `gdpr_requests` stödjer 'erasure' typ
   - Frontend: SAKNAS helt
   - Backend: Behöver soft-delete + hard-delete workflow

5. **Consent Management UI** - GDPR Art. 7
   - Database: `user_consents` tabell finns
   - Frontend: SAKNAS (förutom cookie banner)
   - Behöver: Marketing, analytics, special category consents

### 🟡 HÖGA (Enterprise Features)

6. **Notification Settings Page** - Separata notifikationsinställningar
   - Database: Delvis i `user_preferences`
   - Behöver: Per-kategori toggles, digest settings

7. **Login History UI** - Visa historiska inloggningar
   - Database: `user_audit_logs` kan användas
   - Frontend: SAKNAS

8. **Profile Change Audit Log** - Visa ändringshistorik
   - Database: `user_audit_logs` finns
   - Frontend: SAKNAS

9. **Avatar Upload** - Riktig bilduppladdning (inte bara presets)
   - Behöver: Supabase Storage bucket, upload API

### 🟢 MEDIUM (Enhanced UX)

10. **Separated Profile Sections** - Nuvarande ProfilePage är 551 rader
    - Behöver: Sidebar navigation, modulära sektioner

11. **Connected Accounts** - OAuth provider connections
    - Visa vilka providers som är kopplade
    - Disconnect möjlighet

12. **Accessibility Settings**
    - High contrast, reduce motion, text size

13. **First/Last Name Split** - Istället för bara full_name

### ⚪ LÅGA (Nice-to-have)

14. **Bio/Description** field
15. **Social links** (LinkedIn, Twitter, etc.)
16. **Custom username/slug**
17. **Cover photo**
18. **Webhooks** för användare
19. **Activity feed**

---

## 🏗️ E) Arkitekturproblem

### Nuvarande Problem

1. **All-in-One ProfilePage** (551 lines)
   - Svårt att underhålla
   - Dålig separation of concerns
   - Ingen modulär struktur

2. **Duplicerad kod**
   - `ProfilePage.tsx` och `edit/page.tsx` har överlappande funktionalitet
   - Preferences page separat från profil

3. **Inkonsekvent datamodell**
   - `users.avatar_url` + `user_profiles.avatar_url` (dubblering)
   - Preferences i flera tabeller (`users`, `user_preferences`)

4. **Saknar Service Layer**
   - Ingen `ProfileService` klass
   - API-anrop direkt i komponenter

5. **Tenant-koppling i user_preferences**
   - `user_preferences` är per-tenant, inte per-user
   - Kan skapa problem vid org-byte

---

## 🎯 F) Rekommendationer för Implementation

### Sprint 1: Foundation (1 vecka)
- [ ] Skapa `lib/profile/profile-service.ts`
- [ ] Skapa `lib/profile/types.ts` med alla TypeScript types
- [ ] Migrera till ny route-struktur under `/app/profile/`
- [ ] Skapa sidebar navigation

### Sprint 2: Security (3-4 dagar)
- [ ] Password change UI + API
- [ ] Email change UI + API med verifikation
- [ ] Login history UI

### Sprint 3: GDPR (3-4 dagar)
- [ ] Data export UI + backend
- [ ] Account deletion request UI + workflow
- [ ] Consent management UI

### Sprint 4: Notifications & Preferences (3 dagar)
- [ ] Notification settings page
- [ ] Enhanced preferences (accessibility, formats)

### Sprint 5: Polish (2-3 dagar)
- [ ] Avatar upload
- [ ] Activity log UI
- [ ] Mobile responsiveness audit

---

## 📁 Filstruktur för ny implementation

```
app/profile/
├── layout.tsx                 # Sidebar navigation layout
├── page.tsx                   # Profile overview/dashboard
├── general/
│   └── page.tsx              # Basic info, avatar
├── account/
│   └── page.tsx              # Email, password
├── security/
│   └── page.tsx              # MFA, sessions (flytta befintlig)
├── privacy/
│   └── page.tsx              # GDPR, consents, data export
├── notifications/
│   └── page.tsx              # Notification preferences
├── preferences/
│   └── page.tsx              # Language, theme, accessibility
├── organizations/
│   └── page.tsx              # Orgs, roles
└── activity/
    └── page.tsx              # Audit log, history

lib/profile/
├── profile-service.ts        # ProfileService class
├── notification-service.ts   # NotificationService
├── gdpr-service.ts           # GDPRService (export, delete)
└── types.ts                  # All profile types

components/profile/
├── ProfileNavigation.tsx     # Sidebar nav
├── ProfileHeader.tsx         # Re-use existing
├── AvatarUpload.tsx          # New
├── PasswordChangeForm.tsx    # New
├── EmailChangeForm.tsx       # New
├── DataExportRequest.tsx     # New
├── AccountDeletion.tsx       # New
├── ConsentManager.tsx        # New
└── NotificationSettings.tsx  # New
```

---

## ✅ Sammanfattning

**Styrkor:**
- Robust MFA-implementation
- Bra session management
- GDPR database schema finns
- PreferencesContext för theme/language

**Svagheter:**
- Ingen modulär profil-struktur
- GDPR frontend saknas helt
- Password/email change saknas
- All-in-one page approach

**Nästa steg:**
1. Godkänn denna analys
2. Prioritera GDPR-kritiska features
3. Påbörja Sprint 1: Foundation

---

*Dokumentet genererat 2026-01-15 av Claude Code*
