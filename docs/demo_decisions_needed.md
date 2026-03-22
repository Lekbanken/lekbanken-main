# Lekbanken Demo-läge - Kritiska Beslut

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-13
- Last updated: 2026-03-21
- Last validated: -

> Historical snapshot of the demo domain decision log prepared before implementation began.

**Datum:** 2026-01-13
**Status:** AWAITING DECISIONS
**Beslutfattare:** Product Owner / CTO / Stakeholders

---

## 📋 Instruktioner

Detta dokument innehåller **7 kritiska beslut** som måste fattas innan demo-implementation kan börja. För varje beslut:

1. Läs igenom alternativen
2. Överväg pros/cons
3. Välj ett alternativ (markera med ✅)
4. Lägg till eventuella kommentarer
5. Signera beslutet

**När alla beslut är fattade:** Committa detta dokument och notifiera tech lead.

---

## 🎯 Beslut 1: Demo MVP Definition

### Fråga
**Vilken typ av demo-upplevelse ska vi bygga?**

### Alternativ

#### A) 🌍 Self-Service Public Demo
Vem som helst kan klicka "Try Demo" och omedelbart utforska Lekbanken utan registrering.

**Pros:**
- ✅ Maximal reach - låg friction för prospekt
- ✅ Viral potential - lätt att dela
- ✅ Minskad last på sales team
- ✅ Kan mäta conversion funnel från cold traffic

**Cons:**
- ⚠️ Kräver robust security (RLS, rate limiting)
- ⚠️ Risk för abuse/spam
- ⚠️ Support questions från okvalificerade leads
- ⚠️ Svårare att tracka lead quality

**Use case:** "ProveSource börjar använda Lekbanken för sina team workshops"

---

#### B) 🤝 Sales-Assisted Demo
Demo-access ges via sales team som skapar demo-konton och skickar inloggning till prospekt.

**Pros:**
- ✅ Kvalificerade leads only
- ✅ Personlig onboarding
- ✅ Bättre lead tracking
- ✅ Enklare security (no public endpoint)

**Cons:**
- ⚠️ Hög friction - prospekt måste boka möte
- ⚠️ Belastar sales team
- ⚠️ Långsammare conversion cycle
- ⚠️ Minskar viral spread

**Use case:** "Enterprise-kund kontaktar sales, får demo under guided session"

---

#### C) 🔀 Hybrid Model
Public demo med begränsade features + full demo via sales för qualifierade leads.

**Pros:**
- ✅ Best of both worlds
- ✅ Funnel: cold → warm → hot leads
- ✅ Flexibilitet för olika buyer journeys

**Cons:**
- ⚠️ Mer komplexitet att bygga och underhålla
- ⚠️ Risk för förvirring ("varför ser jag inte X?")
- ⚠️ Kräver tydlig messaging

**Use case:** "Anyone kan prova basic features, enterprise prospects får full demo från sales"

---

### 📊 Rekommendation
**→ Alternativ A: Self-Service Public Demo**

**Motivering:**
- Lekbanken är B2B SaaS med low-touch sales motion
- Demo är konkurrensfördel (många konkurrenter kräver demo-bokning)
- Med rätt security (RLS + rate limiting) är risken hanterbar
- Möjliggör snabbare iteration och A/B testing

**Implementation approach:**
- Phase 1: Public demo med curated content (15-20 activities)
- Phase 2: Premium features locked med "Upgrade to unlock"
- Future: Sales-assisted demo för enterprise tier (custom branding, etc.)

---

### ✅ BESLUT

**Valt alternativ:** [ ] A  [ ] B  [ ] C

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## 🗄️ Beslut 2: Data Isolation Model

### Fråga
**Hur ska vi isolera demo-data från production och mellan demo-sessioner?**

### Alternativ

#### A) 🏢 Shared Demo Tenant + Session-Scoped Data
En gemensam demo-tenant där varje demo-session har sin egen "workspace" som isoleras via session_id.

**Arkitektur:**
```sql
-- En demo tenant
tenant_id: '00000000-0000-0000-0000-000000000001'

-- Data är session-scoped
sessions WHERE created_by IN (SELECT id FROM demo_users)
  AND session_id = current_demo_session

-- RLS policies enforce isolation
CREATE POLICY "demo_session_isolation" ON sessions
  USING (
    created_by = auth.uid()
    OR session_id = get_current_demo_session()
  );
```

**Pros:**
- ✅ Billig - en tenant för alla demo-sessions
- ✅ Enkel cleanup - radera data per session_id
- ✅ Enkel content curation - alla demo users ser samma content pool

**Cons:**
- ⚠️ Kräver noggrann RLS design för att undvika data leak mellan sessions
- ⚠️ Om RLS missar något kan sessions se varandra

**Cost estimate:** ~$5-10/månad för 1000 demo sessions/dag

---

#### B) 🔄 Per-Session Ephemeral Tenant
Varje demo-session får en egen temporary tenant som skapas on-demand och raderas efter 24h.

**Arkitektur:**
```sql
-- Skapa tenant per session
INSERT INTO tenants (id, name, type, demo_flag, ephemeral, expires_at)
VALUES (gen_random_uuid(), 'Demo Session ' || gen_random_uuid(), 'demo', true, true, now() + interval '24 hours');

-- Total isolation - ingen risk för data leak
-- Cleanup raderar hela tenanten
```

**Pros:**
- ✅ Total isolation mellan sessions - zero risk för data leak
- ✅ Enkel mental model - varje session är en egen värld
- ✅ Kan ge varje session "clean slate" tenant settings

**Cons:**
- ⚠️ Dyrare - många tenants att hantera
- ⚠️ Mer komplex cleanup logic
- ⚠️ Potentiellt sämre performance (många tenant lookups)
- ⚠️ Risk för tenant ID exhaustion om inte städat korrekt

**Cost estimate:** ~$20-30/månad för 1000 demo sessions/dag (högre DB load)

---

#### C) 👥 Shared Tenant + User Workspace Isolation
En demo-tenant, men varje demo-user får en "workspace" som isolerar deras data.

**Arkitektur:**
```sql
-- Demo tenant är shared
tenant_id: 'demo-tenant-uuid'

-- Men workspace är per user
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  owner_user_id UUID REFERENCES profiles(id),
  is_demo BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ
);

-- Data är workspace-scoped
sessions WHERE workspace_id = get_current_workspace()
```

**Pros:**
- ✅ Balans mellan security och cost
- ✅ Kan erbjuda "save your demo" feature senare (upgrade workspace to real tenant)
- ✅ Flexibel för multi-user demo sessions

**Cons:**
- ⚠️ Mer komplext schema än alternativ A
- ⚠️ Kräver workspace concept i alla queries

**Cost estimate:** ~$8-15/månad för 1000 demo sessions/dag

---

### 📊 Rekommendation
**→ Alternativ A: Shared Tenant + Session-Scoped Data**

**Motivering:**
- Enklast att implementera och underhålla
- Lowest cost
- Security är hanterbar med korrekt RLS policies + automated testing
- Kan alltid uppgradera till alternativ C senare om behov uppstår

**Risk mitigation:**
- Mandatory RLS test harness i CI
- Automated RLS policy testing innan varje deploy
- Regular security audits

---

### ✅ BESLUT

**Valt alternativ:** [ ] A  [ ] B  [ ] C

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## ✍️ Beslut 3: Write Policy för Demo

### Fråga
**Ska demo-användare kunna skapa/redigera data, eller är demo read-only?**

### Alternativ

#### A) 🔒 Full Read-Only
Demo-användare kan bara browse content, inte skapa något.

**Vad de KAN göra:**
- ✅ Bläddra i aktiviteter
- ✅ Se session templates
- ✅ Läsa dokumentation

**Vad de INTE kan göra:**
- ❌ Skapa sessions
- ❌ Spara favoriter
- ❌ Delta i workshops
- ❌ Tjäna XP/badges

**Pros:**
- ✅ Enklast att implementera
- ✅ Minsta säkerhetsrisk
- ✅ Ingen cleanup behövs

**Cons:**
- ⚠️ Dålig demo-upplevelse - känns som "katalog" inte product
- ⚠️ Svårt att visa verkligt värde (planering, gamification)
- ⚠️ Låg engagement → låg conversion

**Use case:** "Browsing mode - se vad som finns men inte prova"

---

#### B) ✏️ Isolated Writes + Auto-Reset
Demo-användare kan skapa data inom sin session, men allt raderas efter 24h.

**Vad de KAN göra:**
- ✅ Skapa egna sessions
- ✅ Bjuda in (fake) deltagare
- ✅ Spara favoriter (session-scoped)
- ✅ Tjäna XP/badges (reset vid cleanup)

**Vad de INTE kan göra:**
- ❌ Modifiera demo tenant settings
- ❌ Modifiera global content
- ❌ Skapa public sessions (endast private/demo)
- ❌ Exportera data

**RLS enforcement:**
```sql
-- Kan skapa sessions
CREATE POLICY "demo_can_create_sessions" ON sessions
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND tenant_id = get_demo_tenant_id()
    AND visibility != 'public'
  );

-- Men bara sina egna
CREATE POLICY "demo_can_only_edit_own" ON sessions
  FOR UPDATE
  USING (created_by = auth.uid());
```

**Pros:**
- ✅ Realistisk demo-upplevelse - faktiskt prova product
- ✅ Kan visa alla features (planering, gamification, QR codes)
- ✅ Högre engagement → högre conversion
- ✅ Säkert med korrekt RLS

**Cons:**
- ⚠️ Mer komplext att implementera
- ⚠️ Kräver cleanup job
- ⚠️ Små säkerhetsrisker (spam, abuse)

**Use case:** "Full product trial - prova skapa en workshop"

---

#### C) 🔓 Full Write Access (Not Recommended)
Demo-användare kan skapa och redigera allt (inkl. tenant settings).

**Pros:**
- ✅ Minsta begränsningar

**Cons:**
- ❌ Enorm säkerhetsrisk
- ❌ Kan påverka andra demo-users
- ❌ Kan skada demo tenant
- ❌ Inte rekommenderat för enterprise

**Use case:** Ingen - bad idea

---

### 📊 Rekommendation
**→ Alternativ B: Isolated Writes + Auto-Reset**

**Motivering:**
- Demo måste kännas som verklig product, inte bara katalog
- Session-planner och gamification är core value props
- Med korrekt RLS är security hanterbar
- Auto-cleanup gör att demo alltid är "fresh"

**Implementation:**
- RLS policies enforce session ownership
- Nightly cleanup radera user-created data
- Block writes till: tenants, global content, billing tables

---

### ✅ BESLUT

**Valt alternativ:** [ ] A  [ ] B  [ ] C

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## 🔐 Beslut 4: Authentication Model

### Fråga
**Hur ska demo-användare autentiseras?**

### Alternativ

#### A) 👥 Pre-Created User Pool (Original Plan)
10 pre-skapaade demo-users som roteras mellan sessions.

**Arkitektur:**
```
demo-user-1@demo.lekbanken.internal (password: $DEMO_USER_PASSWORD)
demo-user-2@demo.lekbanken.internal (password: $DEMO_USER_PASSWORD)
...
demo-user-10@demo.lekbanken.internal (password: $DEMO_USER_PASSWORD)

Rotation: Välj minst recently used user vid demo-start
```

**Pros:**
- ✅ Enkel att implementera
- ✅ Förutsägbar user pool size
- ✅ Kan pre-populera med data (XP, badges)

**Cons:**
- ⚠️ Race conditions - två users kan få samma demo user
- ⚠️ Credential leak risk - lösenord i env vars
- ⚠️ Begränsad concurrency (max 10 samtidiga demo users)
- ⚠️ Kräver atomic leasing med row-level locks

**Risk:** Om 11 personer försöker demo samtidigt får någon error "Demo unavailable"

---

#### B) 🎭 Ephemeral Users (On-Demand Creation)
Skapa temporary user vid varje demo-start, radera efter 24h.

**Arkitektur:**
```typescript
// Vid demo-start
const tempUser = await supabase.auth.admin.createUser({
  email: `demo-${uuid()}@temp.lekbanken.internal`,
  password: randomSecurePassword(),
  email_confirm: true,
  user_metadata: {
    is_ephemeral: true,
    expires_at: Date.now() + 24 * 60 * 60 * 1000
  }
});

// Cleanup job
DELETE FROM auth.users
WHERE email LIKE '%@temp.lekbanken.internal'
  AND created_at < now() - interval '24 hours';
```

**Pros:**
- ✅ Obegränsad concurrency - skalbart till 1000+ samtidiga demos
- ✅ Ingen credential leak - unikt lösenord per session
- ✅ Ingen race condition - varje session får egen user
- ✅ Total isolation mellan sessions

**Cons:**
- ⚠️ Fler auth.users skapas och raderas (men Supabase hanterar detta bra)
- ⚠️ Kan inte pre-populera med gamification data (eller kan via seeding vid creation)

**Cost:** Negligible - Supabase tillåter många auth users

---

#### C) 🔗 Magic Link / OTP
Skicka one-time password till email-less temporary user.

**Arkitektur:**
```typescript
// Skapa user utan email requirement
const { data } = await supabase.auth.signInAnonymously();

// Eller med OTP till temporary email
await supabase.auth.signInWithOtp({
  email: `demo-${sessionId}@demo.lekbanken.internal`,
  options: { shouldCreateUser: true }
});
```

**Pros:**
- ✅ Inget lösenord att hantera
- ✅ Säkrare - no password leaks
- ✅ Supabase native support

**Cons:**
- ⚠️ Anonymous auth kan vara begränsat i features
- ⚠️ OTP till fake email fungerar inte (ingen inbox)

**Note:** Anonymous auth kan vara bra för snabb PoC

---

### 📊 Rekommendation
**→ Alternativ B: Ephemeral Users (On-Demand)**

**Motivering:**
- Skalbart - ingen "pool exhausted" risk
- Säkert - inga shared credentials
- Enklare - ingen complex leasing logic
- Framtidssäkert - kan hantera 10,000 concurrent demos om needed

**Implementation:**
```typescript
// app/auth/demo/route.ts
const tempUserId = await createEphemeralDemoUser();
const session = await signInAsTempUser(tempUserId);
return redirect('/app?demo=true');
```

**Fallback:** Om ephemeral creation fail, ha 3-5 backup pre-created users

---

### ✅ BESLUT

**Valt alternativ:** [ ] A  [ ] B  [ ] C

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## 🎨 Beslut 5: Content Curation Strategy

### Fråga
**Hur ska vi välja och presentera content i demo-läge?**

### Alternativ

#### A) ❌ Boolean Flag: `is_demo_content`
Enkelt boolean på activities table.

**Schema:**
```sql
ALTER TABLE activities ADD COLUMN is_demo_content BOOLEAN DEFAULT false;

-- Mark 15-20 activities
UPDATE activities SET is_demo_content = true WHERE name IN (...);
```

**Pros:**
- ✅ Enklast att implementera
- ✅ Tydlig för developers

**Cons:**
- ⚠️ Inte flexibelt - kan bara ha EN demo content set
- ⚠️ Svårt att A/B testa olika collections
- ⚠️ Kan inte ha different demos för different audiences

**Use case:** MVP - en general demo för alla

---

#### B) 📊 Enum: `demo_visibility`
Enum med graderade visibility levels.

**Schema:**
```sql
ALTER TABLE activities
ADD COLUMN demo_visibility TEXT
CHECK (demo_visibility IN ('hidden', 'preview', 'full'))
DEFAULT 'hidden';

-- hidden: Inte synlig alls i demo
-- preview: Syns i list men låst vid click
-- full: Fullt tillgänglig i demo
```

**Pros:**
- ✅ Mer flexibilitet - kan visa "teasers"
- ✅ Kan implementera freemium model
- ✅ Enkel att förstå

**Cons:**
- ⚠️ Fortfarande bara EN demo config
- ⚠️ Svårt att ha per-audience curation

**Use case:** Demo med "Upgrade to unlock" för premium activities

---

#### C) 📚 Demo Collections (Most Flexible)
Separate table för curated collections.

**Schema:**
```sql
CREATE TABLE demo_collections (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT, -- 'general', 'enterprise', 'education', 'nonprofit'
  slug TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE demo_collection_items (
  collection_id UUID REFERENCES demo_collections(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  visibility TEXT CHECK (visibility IN ('preview', 'full')) DEFAULT 'full',
  PRIMARY KEY (collection_id, activity_id)
);

-- Example collections:
-- 'general-demo' → 15 best general activities
-- 'enterprise-demo' → 20 activities för enterprise use cases
-- 'education-demo' → 18 activities för schools
```

**Pros:**
- ✅ Maximal flexibilitet - olika demos för olika audiences
- ✅ Kan A/B testa collections
- ✅ Kan versioner (Q1 demo, Q2 demo, etc.)
- ✅ Marketing kan ändra utan code deploy
- ✅ Kan tracka vilken collection som converterar bäst

**Cons:**
- ⚠️ Mer komplext att implementera
- ⚠️ Behöver admin UI för att hantera collections

**Use case:** Enterprise SaaS med olika buyer personas

---

### 📊 Rekommendation
**→ Phased Approach:**

**Phase 1 (MVP):** Alternativ A - Boolean flag
- Snabbast att shippa
- En "general demo" collection
- 15-20 bästa activities flaggade

**Phase 2 (3 månader):** Migrera till Alternativ C - Collections
- När vi har data på vilka activities som funkar
- När vi vill A/B testa
- När vi har flera buyer personas

**Migration path:**
```sql
-- Phase 1
ALTER TABLE activities ADD COLUMN is_demo_content BOOLEAN DEFAULT false;

-- Phase 2 (later)
INSERT INTO demo_collections (slug, name) VALUES ('general-demo', 'General Demo');
INSERT INTO demo_collection_items (collection_id, activity_id)
SELECT 'general-demo-uuid', id FROM activities WHERE is_demo_content = true;
```

---

### ✅ BESLUT

**Valt alternativ:** [ ] A (MVP only)  [ ] B  [ ] C  [ ] Phased (A → C)

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## ⚖️ Beslut 6: Legal & Compliance

### Fråga
**Hur hanterar vi GDPR, cookies och consent för demo-användare?**

### Alternativ

#### A) 🍪 Standard Cookie Consent
Demo följer samma consent flow som vanliga användare.

**Arkitektur:**
```tsx
// Samma cookie banner som main site
<CookieConsent>
  This site uses cookies for authentication and analytics.
  <AcceptButton />
</CookieConsent>
```

**Pros:**
- ✅ Enklast - ingen special handling
- ✅ Konsistent UX med main site

**Cons:**
- ⚠️ Kan skrämma bort demo-users (för många popups)
- ⚠️ Demo-data är tekniskt PII (email, IP, fingerprint)

**Data lagrad:**
- Email: `demo-abc123@temp.lekbanken.internal`
- IP address (för rate limiting)
- Session metadata (features used)

---

#### B) 🎯 Simplified Demo Consent
Minimal consent specifik för demo.

**Arkitektur:**
```tsx
<DemoConsent>
  <h3>Quick Demo Preview</h3>
  <p>
    This demo uses a session cookie only.
    No personal data is collected.
    All demo data is deleted after 24 hours.
  </p>
  <Button>Start Demo</Button>
  <a href="/privacy">Privacy Policy</a>
</DemoConsent>
```

**Legal text i Privacy Policy:**
```markdown
## Demo Sessions

When you use our demo feature:
- We create a temporary anonymous session
- We store your session ID in a cookie (expires after 2 hours)
- We track which features you use (for product improvement)
- We store your IP address (for abuse prevention)
- All data is automatically deleted after 24 hours
- No marketing emails are sent
```

**Pros:**
- ✅ Tydligare för users vad de samtycker till
- ✅ Lägre friction än full consent flow
- ✅ GDPR-compliant (legitimate interest för demo)

**Cons:**
- ⚠️ Behöver legal review
- ⚠️ Separat consent logic att underhålla

---

#### C) 🚫 No Tracking / No Consent
Minimal tracking, inget consent needed.

**Arkitektur:**
- Endast session cookie (strictly necessary)
- Ingen analytics
- Ingen IP logging
- Ingen fingerprinting

**Pros:**
- ✅ Minsta legal risk
- ✅ Ingen consent popup alls
- ✅ Privacy-first approach

**Cons:**
- ⚠️ Kan inte mäta conversion funnel
- ⚠️ Kan inte optimera demo experience
- ⚠️ Svårt att förhindra abuse utan IP tracking

---

### 📊 Rekommendation
**→ Alternativ B: Simplified Demo Consent**

**Motivering:**
- Balans mellan användarupplevelse och compliance
- Vi behöver minimal tracking för product improvement
- Tydlig kommunikation bygger trust

**Required legal work:**
- [ ] Update Privacy Policy med "Demo Sessions" section
- [ ] Legal review av consent text
- [ ] Ensure GDPR Art. 6(1)(f) legitimate interest applies
- [ ] Document data retention policy (24h deletion)

**Data minimization:**
```
Strictly necessary:
✅ Session cookie
✅ Demo session metadata (for expiry)

Optional (with consent):
✅ Feature usage tracking (anonymized)
✅ IP address (rate limiting only, hashed)

Not collected:
❌ Real email
❌ Name
❌ Phone
❌ Payment info
```

---

### ✅ BESLUT

**Valt alternativ:** [ ] A  [ ] B  [ ] C

**Legal review needed:** [ ] Yes  [ ] No

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## 📊 Beslut 7: Success Metrics & Analytics

### Fråga
**Vilka metrics är kritiska för att mäta demo success?**

### Alternativ

#### A) 📈 Basic Metrics
Minimal tracking för att förstå demo usage.

**Events:**
```typescript
analytics.track('demo_started');
analytics.track('demo_completed'); // User reached end of onboarding
analytics.track('demo_converted'); // User clicked "Create Account"
```

**Dashboard:**
- Demo starts per day
- Conversion rate (%)
- Average session duration

**Pros:**
- ✅ Enkel att implementera
- ✅ Privacy-friendly
- ✅ Ger basic insights

**Cons:**
- ⚠️ Kan inte optimera specific funnel steps
- ⚠️ Vet inte VILKA features som driver conversion

---

#### B) 📊 Detailed Funnel Analytics
Tracking av varje steg i demo-journey.

**Events:**
```typescript
// Entry
analytics.track('demo_started', { referrer, utm_source });

// Engagement
analytics.track('demo_feature_viewed', { feature: 'browse_activities' });
analytics.track('demo_feature_used', { feature: 'create_session' });
analytics.track('demo_activity_clicked', { activity_id, activity_name });

// Friction points
analytics.track('demo_feature_locked_viewed', { feature: 'export' });
analytics.track('demo_upgrade_cta_clicked', { cta_location });

// Exit
analytics.track('demo_abandoned', { time_spent, last_feature });
analytics.track('demo_converted', { trigger: 'banner_cta' | 'feature_gate' | 'timeout' });
```

**Dashboard:**
```
Funnel:
Landing → Demo Start (80%)
Demo Start → First Activity View (65%)
First Activity View → Session Creation (40%)
Session Creation → Conversion CTA Click (25%)
CTA Click → Signup Complete (70%)

Overall: Landing → Signup = 9.1%
```

**Features by conversion:**
```
Users who used "Session Planner": 15% conversion
Users who viewed gamification: 12% conversion
Users who only browsed: 5% conversion
```

**Pros:**
- ✅ Kan identifiera drop-off points
- ✅ Kan A/B testa changes
- ✅ Vet vilka features driver värde
- ✅ Kan optimize för conversion

**Cons:**
- ⚠️ Mer komplext att implementera
- ⚠️ Mer data att processa
- ⚠️ Kräver analytics tool (Mixpanel, Amplitude, etc.)

---

#### C) 🔬 Full Product Analytics + Session Replay
Detailed analytics + session recordings.

**Includes:**
- All events from Alternativ B
- Session replay (Hotjar, FullStory)
- Heatmaps
- User journey recordings

**Pros:**
- ✅ Maximal insight i user behavior
- ✅ Kan se exact where users struggle
- ✅ Qualitative + quantitative data

**Cons:**
- ⚠️ Privacy concerns - recording users
- ⚠️ Höga kostnader för session replay tools
- ⚠️ Kan bli "analysis paralysis"

---

### 📊 Rekommendation
**→ Phased Approach:**

**Phase 1 (Launch):** Alternativ A - Basic Metrics
- Get baseline data
- Prove demo is driving conversions
- Keep it simple

**Phase 2 (1-2 months):** Alternativ B - Detailed Funnel
- När vi har 100+ demo sessions/vecka
- När vi vill börja optimera
- Implementera with lightweight tool (PostHog, Plausible)

**Phase 3 (Later):** Alternativ C only om conversion rate är < 5%
- Last resort om vi inte förstår why demo fails
- Expensive och privacy-invasive - use sparingly

---

### ✅ BESLUT

**Valt alternativ:** [ ] A (Basic)  [ ] B (Detailed)  [ ] C (Full)  [ ] Phased

**Vilken analytics tool?**
[ ] PostHog (open source)
[ ] Mixpanel
[ ] Amplitude
[ ] Google Analytics 4
[ ] Plausible (privacy-first)
[ ] Other: ___________

**Kommentarer:**
```
[Dina kommentarer här]
```

**Beslutat av:** ________________
**Datum:** ________________

---

## 📋 Besluts-Sammanfattning

När alla beslut är fattade, fyll i denna sammanfattning:

| Beslut | Valt Alternativ | Impact på Implementation |
|--------|----------------|--------------------------|
| 1. Demo MVP | [ A / B / C ] | [ High / Medium / Low ] |
| 2. Data Isolation | [ A / B / C ] | [ High / Medium / Low ] |
| 3. Write Policy | [ A / B / C ] | [ High / Medium / Low ] |
| 4. Auth Model | [ A / B / C ] | [ High / Medium / Low ] |
| 5. Content Curation | [ A / B / C ] | [ Medium / Low ] |
| 6. Legal/Compliance | [ A / B / C ] | [ Medium / Low ] |
| 7. Analytics | [ A / B / C ] | [ Low ] |

### Next Steps

- [ ] Legal review (if needed for Beslut 6)
- [ ] Confirm analytics tool (Beslut 7)
- [ ] Review revised implementation plan
- [ ] Assign tech lead
- [ ] Set target launch date

---

**Dokument status:** [ ] Draft  [ ] Under Review  [ ] Approved

**Godkänt av:**
- Product Owner: ________________ Datum: ________
- CTO/Tech Lead: ________________ Datum: ________
- Legal (if required): ________________ Datum: ________

**När godkänt:** Committa detta dokument och notifiera tech team att börja implementation.

---

**Questions?** Contact [tech lead email] or [product owner email]
