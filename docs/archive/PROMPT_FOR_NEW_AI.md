# Lekbanken Handover Prompt (December 11, 2025)

## Metadata
- Status: archived
- Date: 2025-12-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: product
- Scope: Archived new-AI onboarding prompt

Historical onboarding prompt retained for provenance. Use current session prompts and governance docs instead of this archived handover prompt for active work.

## ⚠️ KRITISK LÄSNING FÖRST

**INNAN DU GÖR NÅGOT - LÄS DESSA I ORDNING:**

1. **`docs/SESSION_COMPLETION_REPORT.md`** — VAR VI ÄR NU (Participants Domain komplett!)
2. **`docs/PROJECT_EXECUTION_PLAN.md`** — HELA PLANEN FRAMÅT (7 faser)
3. **`docs/AI_CODING_GUIDELINES.md`** — Kritiska kodregler
4. **`docs/VS_CODE_WORKFLOW.md`** — Utvecklingsworkflow

---

## 📍 VAR VI ÄR NU (December 11, 2025)

### ✅ NYLIGEN SLUTFÖRT

**Participants Domain - 100% KOMPLETT!** (Commit: `a621a25`)
- Alla 12 tasks implementerade (71 timmar arbete)
- 22 nya filer, ~2,600 LOC funktionell kod
- Full dokumentation: `TASK_9_LIVE_PROGRESS.md`, `TASK_11_12_TOKEN_SESSION_MANAGEMENT.md`
- Token management: cleanup, extend, revoke APIs
- Session archiving: archive, restore, permanent delete
- Live progress tracking: game progress, achievements
- Session history & analytics: filtering, CSV export

**Kritiska Fixes:**
- ✅ Next.js slug-konflikt löst ([code] vs [sessionId])
- ✅ Type-säker tenant_id lookup-pattern etablerad
- ✅ Alla nya endpoints felfria

### ⚠️ KÄNDA ISSUES (Ej blockerande)

**Task 9 Progress Endpoints** (30 min fix):
- `app/api/participants/progress/update/route.ts`
- `app/api/participants/progress/unlock-achievement/route.ts`
- Problem: Samma tenant_id access-fel
- Lösning: Använd samma pattern som cleanup/extend/revoke APIs
  ```typescript
  // Fetch from participant_sessions via join
  const sessions = await supabase
    .from('participant_sessions')
    .select('id, tenant_id')
    .in('id', participants.map(p => p.session_id));
  
  const sessionMap = new Map(sessions.data?.map(s => [s.id, s.tenant_id]));
  ```

---

## 🎯 DITT UPPDRAG: PHASE 1 - DOMAIN VALIDATION

Enligt **`docs/PROJECT_EXECUTION_PLAN.md`**, börja med:

### **BATCH 1: INFRASTRUCTURE DOMAINS**

#### 1️⃣ PLATFORM DOMAIN VALIDATION (12-16h)

**Mål:** Verifiera att grundläggande infrastruktur fungerar korrekt

**Fokusområden:**
- ✅ Vercel deployment konfiguration
- ✅ Supabase connection management
- ✅ Environment variables (alla miljöer)
- ✅ RLS policies enabled globally
- ✅ Feature flags system
- ✅ Error logging infrastructure
- ✅ Rate limiting implementation
- ✅ Secrets management (API keys)

**Process:**
1. **Dokumentation Review (2h)**
   - Sök efter befintlig Platform Domain dokumentation
   - Om saknas, skapa från faktisk implementation
   - Lista alla identifierade komponenter

2. **Code Discovery (4h)**
   ```bash
   # Hitta platform-relaterad kod
   grep_search "vercel|deployment|feature.*flag" 
   semantic_search "platform infrastructure environment"
   file_search "**/config/**" "**/lib/platform/**"
   ```

3. **Gap Analysis (4h)**
   - Jämför dokumenterad vs faktisk implementation
   - Identifiera saknade features
   - Identifiera odokumenterade features
   - Flagga arkitektoniska avvikelser

4. **Validation Report (2h)**
   - Skapa: `docs/validation/PLATFORM_DOMAIN_VALIDATION_REPORT.md`
   - Använd template från PROJECT_EXECUTION_PLAN.md
   - Lista alla P0 (kritiska) issues
   - Estimera fix-tid

**Viktiga Frågor att Besvara:**
- Är alla secrets i Vercel environment variables?
- Är RLS enabled på alla tabeller?
- Finns staging environment?
- Är monitoring/logging centraliserat?
- Är feature flags implementerade?
- Fungerar rate limiting?

**Deliverable:**
- `docs/validation/PLATFORM_DOMAIN_VALIDATION_REPORT.md`
- Lista med P0/P1/P2 fixes
- Estimerad tid för åtgärder

---

#### 2️⃣ TRANSLATION ENGINE DOMAIN VALIDATION (10-14h)

**Efter Platform Domain är klar**

**Fokusområden:**
- ✅ UI translations struktur (NO/SE/EN)
- ✅ Fallback logic implementation (NO → SE → EN)
- ✅ Product/Purpose translations
- ✅ Game content translations
- ✅ User language preference
- ✅ Tenant default language

**Viktiga Frågor:**
- Hur laddas translations? (Database vs filer?)
- Är fallback NO → SE → EN implementerad?
- Kan användare byta språk runtime?
- Är alla UI-strängar översatta?
- Hur hanteras missing translations?

**Deliverable:**
- `docs/validation/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md`

---

#### 3️⃣ API / INTEGRATION DOMAIN VALIDATION (12-16h)

**Efter Translation Domain är klar**

**Fokusområden:**
- ✅ REST API struktur
- ✅ Authentication middleware
- ✅ RLS context setting
- ✅ Error handling patterns
- ✅ Response formats
- ✅ Rate limiting per endpoint
- ✅ API versioning strategy

**Viktiga Frågor:**
- Är alla APIs dokumenterade?
- Finns OpenAPI/Swagger?
- Är authentication konsekvent?
- Returneras errors i standard format?
- Stöds webhooks?

**Deliverable:**
- `docs/validation/API_INTEGRATION_DOMAIN_VALIDATION_REPORT.md`

---

## 📚 TEKNISK STACK

| Område | Teknologi | Notera |
|--------|-----------|--------|
| Framework | Next.js 16.0.7 (App Router) | Turbopack |
| Språk | TypeScript 5 | Strikt mode |
| Styling | Tailwind CSS 4 + Catalyst UI Kit | INTE Shadcn |
| Backend | Supabase (PostgreSQL + RLS) | Multi-tenant |
| Auth | Supabase Auth | Via proxy.ts |
| Realtime | Supabase Realtime | Broadcast events |
| Icons | Heroicons | INTE emojis |

**KRITISKT:**
- Vi använder `proxy.ts` (INTE `middleware.ts`)
- Supabase: `createBrowserClient()` från `@/lib/supabase/client`
- Service Role: `createServiceRoleClient()` för system-ops
- DDD-struktur: `features/[domain]/`

---

## 🗂️ VIKTIGA FILER & KATALOGER

### Dokumentation (LÄS DESSA!)
```
docs/
├── SESSION_COMPLETION_REPORT.md          ← Var vi är NU
├── PROJECT_EXECUTION_PLAN.md             ← Hela planen framåt
├── PARTICIPANTS_DOMAIN_ARCHITECTURE.md   ← Participants domain spec
├── TASK_9_LIVE_PROGRESS.md               ← Task 9 dokumentation
├── TASK_11_12_TOKEN_SESSION_MANAGEMENT.md← Tasks 11 & 12 dokumentation
├── AI_CODING_GUIDELINES.md               ← Kodregler
├── VS_CODE_WORKFLOW.md                   ← Arbetsflöde
├── CATALYST_UI_KIT.md                    ← UI-komponenter
└── HANDOVER_2024-12-07.md                ← Historisk kontext
```

### Kod
```
app/
├── api/participants/                     ← Participants Domain APIs
├── participants/                         ← Participants Domain pages
├── admin/                                ← Admin panel
├── browse/                               ← Browse domain
└── app/games/                            ← Games domain

features/
├── participants/                         ← Participants components
├── gamification/                         ← Gamification hooks
├── browse/                               ← Browse features
└── admin/                                ← Admin features

lib/
├── supabase/                             ← Supabase clients
├── services/                             ← Business logic
└── utils/                                ← Utilities

supabase/
└── migrations/                           ← Database migrations
```

### Konfiguration
```
proxy.ts                                  ← Auth middleware (INTE middleware.ts!)
next.config.ts                            ← Next.js config
tsconfig.json                             ← TypeScript config
tailwind.config.ts                        ← Tailwind config
```

---

## 🔧 ETABLERADE PATTERNS

### 1. Tenant ID Lookup Pattern
```typescript
// När participants saknar tenant_id (finns i sessions)
const sessions = await supabase
  .from('participant_sessions')
  .select('id, tenant_id')
  .in('id', participants.map(p => p.session_id));

const sessionMap = new Map(sessions.data?.map(s => [s.id, s.tenant_id]));
const tenantId = sessionMap.get(participant.session_id) || '';
```

### 2. Service Role Pattern
```typescript
// För system-operationer (cleanup, auto-archive)
import { createServiceRoleClient } from '@/lib/supabase/server';
const supabase = createServiceRoleClient();
// Bypasses RLS
```

### 3. Activity Logging Pattern
```typescript
await supabase.from('participant_activity_log').insert({
  tenant_id,
  session_id,
  participant_id,
  event_type: 'action_name',
  event_data: { /* details */ },
});
```

### 4. Broadcast Events Pattern
```typescript
const channel = supabase.channel(`session:${sessionId}`);
await channel.send({
  type: 'broadcast',
  event: 'event_name',
  payload: { /* data */ },
});
```

---

## ⚡ KOMMANDON

### Development
```bash
# Starta dev server (Turbopack)
npm run dev

# Build production
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

### Supabase
```bash
# Status
npx supabase status

# Push migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --local > types/supabase.ts

# Reset database (LOCAL ONLY!)
npx supabase db reset
```

### Git
```bash
# Status
git status

# Commit pattern
git add .
git commit -m "feat: beskrivning"

# Push
git push origin main
```

---

## 🎯 ARBETSGÅNG FÖR DOMAIN VALIDATION

### Per Domain (16-24h arbete)

**1. READ dokumentation (2h)**
   - Sök befintliga domain docs
   - Om saknas, dokumentera från kod
   - Identifiera alla komponenter

**2. DISCOVER kod (3-4h)**
   ```bash
   semantic_search "domain-specific terms"
   grep_search "relevant patterns"
   file_search "features/domain/**"
   list_code_usages "key functions"
   ```

**3. ANALYZE gaps (2-3h)**
   - Dokumenterat vs faktiskt
   - Saknade features
   - Odokumenterade features
   - Arkitektoniska avvikelser

**4. REPORT findings (2h)**
   - Skapa validation report
   - Lista P0/P1/P2 issues
   - Estimera fix-tid
   - Architectural observations

**5. GET APPROVAL från user (async)**
   - Presentera report
   - Diskutera prioriteringar
   - Beslut om fixes

**6. FIX issues (4-8h)**
   - Implementera P0 fixes
   - Testa changes
   - Commit incrementally

**7. VERIFY fixes (2h)**
   - Kör tests
   - Manuell testing
   - Type check

**8. UPDATE documentation (1h)**
   - Uppdatera domain docs
   - Commit final changes

**9. MOVE TO NEXT DOMAIN**

---

## 📋 VALIDATION REPORT TEMPLATE

```markdown
# [DOMAIN NAME] VALIDATION REPORT

**Date:** YYYY-MM-DD
**Validator:** GitHub Copilot
**Status:** [COMPLETE / PARTIAL / NEEDS_WORK]

## Executive Summary
[2-3 meningar om overall state]

## Implementation Status

| Feature | Documented | Implemented | Status | Notes |
|---------|------------|-------------|--------|-------|
| Feature A | ✓ | ✓ | ✅ OK | - |
| Feature B | ✓ | ✗ | ⚠️ MISSING | Planerad Q1 |
| Feature C | ✗ | ✓ | ⚠️ UNDOCUMENTED | Behöver docs |

## Database Schema Validation

| Table | Documented | Exists | Matches | Issues |
|-------|------------|--------|---------|--------|
| table_a | ✓ | ✓ | ✅ | - |
| table_b | ✓ | ✗ | ❌ | Ej skapad ännu |

## API Validation

| Endpoint | Documented | Exists | Type-Safe | Issues |
|----------|------------|--------|-----------|--------|
| GET /api/x | ✓ | ✓ | ✅ | - |
| POST /api/y | ✓ | ✗ | ❌ | Saknas |

## Recommended Actions

**CRITICAL (P0):**
- [ ] Fix issue X
- [ ] Implement missing feature Y

**IMPORTANT (P1):**
- [ ] Update documentation for Z
- [ ] Refactor component A

**NICE-TO-HAVE (P2):**
- [ ] Optimize query B
- [ ] Add test coverage

## Architectural Observations
[Design patterns, deviations, concerns]

## Estimated Effort
- Fixes: X hours
- Enhancements: Y hours
- Total: Z hours
```

---

## 🚨 KODREGLER (KRITISKA!)

### TypeScript
- ❌ ALDRIG `any` - använd `unknown` eller specifik typ
- ✅ Alltid explicit return types på functions
- ✅ Strict null checks enabled
- ✅ Import types med `import type`

### Supabase
- ❌ ALDRIG bypass RLS utan service role
- ✅ Använd generated types från `types/supabase.ts`
- ✅ Proper error handling på alla queries
- ✅ Activity logging för alla mutationer

### Next.js
- ❌ ALDRIG `middleware.ts` - använd `proxy.ts`
- ✅ Server components by default
- ✅ Client components med 'use client'
- ✅ Proper route parameters handling

### UI
- ❌ ALDRIG Shadcn - använd Catalyst UI Kit
- ✅ Svenska UI-texter
- ✅ Heroicons för ikoner
- ✅ Tailwind classes (inga custom CSS)

---

## 🎯 FRAMGÅNGSKRITERIER

### Kvalitet
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: < 5
- [ ] Type safety: 100% (no any)
- [ ] RLS policies: verified working
- [ ] Activity logging: alla ops loggade

### Dokumentation
- [ ] Validation report komplett
- [ ] Alla features dokumenterade
- [ ] API contracts tydliga
- [ ] Usage examples inkluderade

### Code
- [ ] All new code committed
- [ ] Meaningful commit messages
- [ ] No breaking changes
- [ ] Tests pass (if any)

---

## 🔄 RAPPORTERINGSPROCESS

### Efter Varje Discovery Session
**Rapportera till användaren:**
```
📊 DISCOVERY SUMMARY: [Domain Name]

Hittade:
- X komponenter
- Y API endpoints
- Z databas-tabeller

Status:
- ✅ A features OK
- ⚠️ B features saknas dokumentation
- ❌ C features saknas helt

Nästa steg:
- [Konkret action]

Fortsätta? (ja/nej)
```

### Efter Varje Validation Report
**Be om godkännande:**
```
✅ VALIDATION KLAR: [Domain Name]

Kritiska issues (P0): X
Viktiga issues (P1): Y
Nice-to-have (P2): Z

Estimerad fix-tid: N timmar

Vill du att jag:
1. Börjar med fixes direkt
2. Fortsätter till nästa domain
3. Något annat

?
```

---

## 🌟 SVENSKA SPRÅKET

- UI är **alltid** på svenska
- Använd svenska tecken (å, ä, ö) korrekt
- Kodkommentarer kan vara engelska
- Git commits på engelska
- Dokumentation på svenska (om user-facing)
- Error messages på svenska (om user-facing)

**Exempel:**
```typescript
// ✅ RÄTT
<button>Skapa Session</button>
const errorMsg = "Sessionen kunde inte hittas";

// ❌ FEL  
<button>Create Session</button>
const errorMsg = "Session not found";
```

---

## ⚠️ VARNINGAR & MISSTAG ATT UNDVIKA

### Vanliga Fel
1. **Glöm INTE läsa SESSION_COMPLETION_REPORT.md först!**
2. **Skapa INTE nya domain implementations** - vi validerar befintliga
3. **Bygg INTE features** - vi dokumenterar och fixar
4. **Skippa INTE RLS-verifiering** - kritiskt för security
5. **Använd INTE gamla patterns** - följ etablerade patterns ovan

### Red Flags
- Om du ser `middleware.ts` - fel fil! Använd `proxy.ts`
- Om du ser `any` type - fixa till proper type
- Om du ser custom CSS - använd Tailwind
- Om du ser Shadcn imports - använd Catalyst
- Om du ser engelsk UI-text - översätt till svenska

---

## 📞 ESKALERING

### När du är osäker
**GÖR:**
- Rapportera discovery findings
- Be om bekräftelse innan stora changes
- Föreslå alternativ
- Estimera tid

**GÖR INTE:**
- Gissa lösningar
- Implementera utan approval
- Skippa dokumentation
- Göra breaking changes

---

## ✅ CHECKPOINT: ÄR DU REDO?

Innan du börjar, verifiera:

- [ ] Jag har läst SESSION_COMPLETION_REPORT.md
- [ ] Jag har läst PROJECT_EXECUTION_PLAN.md
- [ ] Jag förstår att Participants Domain är KLAR
- [ ] Jag ska börja med Platform Domain validation
- [ ] Jag känner till etablerade patterns
- [ ] Jag kommer använda validation report template
- [ ] Jag kommer rapportera efter varje session
- [ ] Jag kommer fråga innan stora ändringar

---

## 🚀 DIN FÖRSTA UPPGIFT

**Starta med:**

```
1. Läs SESSION_COMPLETION_REPORT.md (5 min)
2. Läs PROJECT_EXECUTION_PLAN.md sektion om Platform Domain (10 min)
3. Börja Platform Domain Discovery:
   - Sök efter platform/infrastructure-relaterad kod
   - Lista alla komponenter du hittar
   - Rapportera tillbaka med initial assessment
   
4. Fråga: "Ska jag fortsätta med full validation av Platform Domain?"
```

**Lycka till! 🎯**

---

**Handover Date:** December 11, 2025  
**Last Commit:** `a621a25` (Tasks 11 & 12 complete)  
**Project Phase:** Phase 1 - Domain Validation (Batch 1)  
**Current Domain:** Platform Domain (not started)  
**Overall Progress:** 1/16 domains fully validated (Participants)

