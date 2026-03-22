# Database Architecture & Migration Safety Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed database audit from the launch-readiness cycle. Use `launch-readiness/launch-control.md` for current program state and pair this file with `../implementation/database-architecture-remediation-plan.md` and `database-rebuild-feasibility.md` for the full decision record.

> **Status:** ✅ GENOMFÖRD — Audit klar, Alternativ B (Canonical Baseline) valt och verifierat  
> **Datum:** 2026-03-13  
> **Utlösare:** Sandbox-provisionering avslöjade 10 fresh-install-fel i migrationskedjan  
> **Scope:** Schema-arkitektur (domän för domän) + migrationskedjans hälsa  
> **Uppföljning:** Canonical Baseline genomförd — se `../implementation/database-architecture-remediation-plan.md`

---

## Sammanfattning

Lekbankens databas har **307 migrationer** som bygger upp **~200+ tabeller**, **~150+ funktioner**, **~994 RLS-policyer** och **~5–10 vyer**.

Sandwich-buildet mot en tom sandbox avslöjade **10 problem** som krävde fixes för att migrationskedjan skulle gå igenom. Dessa föll i 5 kategorier:

| Feltyp | Antal | Allvarlighet |
|--------|-------|-------------|
| Funktion refererad före definition | 1 | HÖG |
| Table/view naming-drift | 3 | HÖG |
| CASCADE saknas vid DROP | 2 | MEDEL |
| Objekt refererat men aldrig skapat | 2 | KRITISK |
| Duplicerade fix-migreringar som krockar | 2 | MEDEL |

**Huvudslutsats:** Schemaarkitekturen i sig är **rimlig och funktionsduglig**. Problemet ligger i migrationskedjan, inte i datamodellen. En canonical baseline-konsolidering (Alternativ B) rekommenderas.

---

## Del 1: Schema-arkitekturbedömning (domän för domän)

### Bedömningsskala
- ✅ **Sund** — Välstrukturerad, konsekvent, framtidssäker
- 🟡 **Acceptabel** — Fungerar men har kända brister
- 🔴 **Problematisk** — Strukturella problem som bör åtgärdas

---

### 1.1 Tenant & Core Infrastructure (24 migreringar → ~15 tabeller)

**Betyg: 🟡 Acceptabel**

**Styrkor:**
- Ren M:M-modell mellan users och tenants via `user_tenant_memberships`
- Väldefinierade RLS-hjälpfunktioner: `is_system_admin()`, `get_user_tenant_ids()`, `has_tenant_role()`, `is_tenant_member()`
- Funktionerna är alla SECURITY DEFINER med SET search_path

**Brister:**
- **Membership table/view-förvirring:** `user_tenant_memberships` är den fysiska tabellen, men `tenant_memberships` finns som en bakåtkompatibilitetsvy med INSERT/UPDATE-rules. Kod kan inte enkelt avgöra om den arbetar mot vy eller tabell.
- **Inkonsekvent tenant-referens:** Games och Plans använder `owner_tenant_id`, alla andra ~9 tabeller använder `tenant_id`. Skapar kognitiv friktion.
- **Roll-fragmentering:** `users.role` (text), `users.global_role` (enum), `user_tenant_memberships.role` (enum) — oklart vilken som är auktoritativ.
- **Duplicerade attribut:** Språk (tenants.main_language, users.language, user_profiles.locale), tema (tenants.default_theme, users.preferred_theme), avatar (users.avatar_url, user_profiles.avatar_url).

---

### 1.2 Auth & Security Hardening (65+ migreringar)

**Betyg: ✅ Sund (efter omfattande härdning)**

**Styrkor:**
- Systematisk SECURITY DEFINER + search_path-härdning genomförd i 10+ migreringar
- auth.uid()-initplan-optimering tillämpad i 5 batch-migreringar
- Duplicerade policyer konsoliderade i 5+ migreringar
- RLS-rekursion i users-tabellen löst i 4 iterationer

**Brister:**
- **Härdningsvolym:** 65+ migreringar bara för säkerhet/RLS tyder på att grunddesignen inte hade security-by-default. Resultatet är bra, men vägen dit är lång.
- **~5% av SECURITY DEFINER-funktioner:** Möjligen kvarvarande utan SET search_path (verifiering behövs).

---

### 1.3 Game Builder & Gameplay (35+ migreringar → ~25 tabeller)

**Betyg: ✅ Sund**

**Styrkor:**
- Klar domänmodell: game_steps, game_materials, game_phases, game_roles, game_board_config
- Tydlig separation: konfiguration (game_artifacts) vs runtime-state (session_artifact_state)
- V2 state-modell (artifacts, triggers) med ren separation
- Atomic RPCs för kritiska operationer (upsert, puzzle, keypad)

**Brister:**
- **Artifacts V1 → V2 drift:** session_artifact_state gick från VIEW till TABLE, med 3 migreringar som hanterar övergången. Fungerar men skapar förvirring.
- **Atomic upsert:** 6 fix-migreringar tyder på att initial design var för komplex.
- **touch_updated_at() vs trigger_set_updated_at() vs set_updated_at():** Tre varianter av samma funktion skapar förvirring (set_updated_at existerar inte ens).

---

### 1.4 Planner (12 migreringar → ~10 tabeller)

**Betyg: ✅ Sund**

**Styrkor:**
- Ren versionsmodell: plans → plan_versions → plan_version_blocks
- Run-modell: runs → run_sessions → session_commands
- RLS verifierad på alla 10 tabeller

**Brister:**
- **plan_schedules** refereras i 2 RLS-migreringar men skapas aldrig som tabell. Död kod.
- `owner_tenant_id` istället för `tenant_id` (inkonsekvent med resten).

---

### 1.5 Play & Participants (20 migreringar → ~10 tabeller)

**Betyg: ✅ Sund**

**Styrkor:**
- Tydlig domän: participant_sessions, participants, session_events
- Lobby-modell med status-enum (draft, lobby, active, ended)
- Chat-system med host-replies

**Brister:**
- Historiska migreringar (20241210, 20241211) som nu är no-ops men fortfarande körs.

---

### 1.6 Gamification & Campaigns (65+ migreringar → ~25–30 tabeller)

**Betyg: 🟡 Acceptabel**

**Styrkor:**
- Coins, streaks, levels, achievements — komplett gamification-stack
- Idempotent coin-transaktioner med race-condition-skydd
- Campaign-templates med tenant-scope

**Brister:**
- **Tabellvildväxt:** 25–30 tabeller är mycket för en enskild domän. Inkluderar: user_coins, coin_transactions, user_streaks, user_progress, user_powerup_inventory, user_powerup_effects, gamification_campaigns, gamification_campaign_templates, gamification_admin_awards, gamification_admin_award_recipients, gamification_automation_rules, gamification_daily_summaries, gamification_level_definitions, gamification_cooldowns, gamification_softcap_config, gamification_daily_earnings, gamification_burn_sinks, gamification_burn_log, m.fl.
- **Analytics-iteration:** admin_gamification_analytics har 5 versioner (v1–v5), vilket tyder på schema-instabilitet.
- **Överlapp med Journey:** achievement- och cosmetics-tabeller refereras från både gamification och journey-domän.

---

### 1.7 Cosmetics & Shop (30+ migreringar → ~15 tabeller)

**Betyg: 🟡 Acceptabel**

**Styrkor:**
- MVP-shop med categories, bundles, products
- Stripe-synk med audit-log
- Min-level gating och loadout-system

**Brister:**
- **Iterativ design:** Flera migreringar lägger till fält som borde funnits från start (category_slug, visibility, product_key NOT NULL).
- **Seed-data i migreringar:** `seed_categories_and_backfill` blandar schema-ändringar med data.

---

### 1.8 Billing & Stripe (35+ migreringar → ~15 tabeller)

**Betyg: 🟡 Acceptabel**

**Styrkor:**
- Licensing med entitlements och seat assignments
- Dunning, gift subscriptions, enterprise quotes, usage-based billing
- Purchase intents med idempotency

**Brister:**
- **Feature-bredd vs användning:** Dunning, enterprise quotes, usage-based billing — avancerade features som kanske aldrig används i en MVP.
- **Potentiell överdimensionering** för nuvarande behov.

---

### 1.9 Notifications (20 migreringar → ~5 tabeller)

**Betyg: ✅ Sund (efter konsolidering)**

**Styrkor:**
- Consolidated notification system efter initial iteration
- Deliveries-tabell med worker RPC
- Broadcast-modell med tenant-scope

---

### 1.10 Legal & Compliance (20 migreringar → ~5 tabeller)

**Betyg: ✅ Sund**

**Styrkor:**
- GDPR-tabeller, cookie consent v2, tenant-anonymization
- Vault-integration för känslig data

---

### 1.11 Övriga domäner

| Domän | Migreringar | Tabeller | Betyg |
|-------|------------|----------|-------|
| Learning | 10 | ~8 | ✅ Sund |
| Media/Spatial | 15 | ~5 | ✅ Sund |
| Support/Moderation | 15 | ~5 | ✅ Sund |
| Social | 5 | ~3 | ✅ Sund |
| Analytics/Ops | 20 | ~10 | ✅ Sund |
| Journey/Factions | 10 | ~5 | ✅ Sund |

---

## Del 2: Migrationskedjans hälsa

### 2.1 Fresh-install-test: 10 problem hittade

Under sandbox-provisionering (307 migreringar mot tom databas) hittades dessa problem:

| # | Migration | Problem | Typ | Fix |
|---|-----------|---------|-----|-----|
| 1 | `20251129000015` | `is_system_admin()` refererad innan definition | Funktionsordning | Bootstrap-kopia av funktionen prepended |
| 2 | `20251208130000` | `DROP FUNCTION ... get_user_tenant_ids()` misslyckas pga beroende policyer | CASCADE saknas | Lade till CASCADE |
| 3 | `20251209100000` | `ALTER TABLE tenant_memberships` — tabellen heter `user_tenant_memberships` | Namngivningsdrift | Villkorlig DO-block |
| 4 | `20251209103000` | RLS-policyer på `tenant_memberships` som inte existerar som tabell | Namngivningsdrift | Dynamisk PL/pgSQL med tabellnamn-resolution |
| 5 | `20260108000001` | `DROP VIEW tenant_memberships` utan CASCADE blockeras av beroende policyer | CASCADE saknas | Lade till CASCADE |
| 6 | `20260114100002` | `INSERT INTO tenant_domains` refererar kolumn `kind` som inte finns | Schema-antagande | `ADD COLUMN IF NOT EXISTS` |
| 7 | `20260125000001` | VIEW `session_artifact_state` blockerar TABLE-skapande | View/table-drift | `DROP VIEW IF EXISTS CASCADE` före CREATE TABLE |
| 8 | `20260125000004` | `set_updated_at()` existerar inte (ska vara `touch_updated_at()`) | Felaktigt funktionsnamn | Rättade funktionsnamn |
| 9 | `20260125154500` | Fix-migration krockar med annan fix (DROP VIEW p tabell) | Duplicerad fix | Villkorlig kontroll om vy |
| 10 | `20260220220000` + `20260305100000` | `plan_schedules` refereras men skapas aldrig | Fantom-objekt | Villkorlig kontroll om tabell |

### 2.2 Statistik

| Mätning | Värde | Bedömning |
|---------|-------|-----------|
| Totala migreringar | 307 | ⚠️ Högt |
| Fix-migreringar | ~70 (29%) | 🔴 Högt — nästan var tredje migration är en fix |
| Säkerhetshärdningsmigreringar | ~65 (21%) | ⚠️ Signal om bristande security-by-default |
| Rollback-filer | 3 | ✅ Existerar |
| Fresh-install-fel | 10 (fixade) | 🔴 Schema-skuld |
| Historiska no-op-migreringar | 2 | 🟡 Minimal påverkan |

### 2.3 Problemkategorier

**A. Funktionsordning (dependency order)**
- `is_system_admin()` definieras i migration ~39 men behövs i migration ~19
- Lösning: Bootstrap-kopia i tidig migration, canonical definition senare
- **Risk:** Hög vid isolerade migration-körningar

**B. Namngivningsdrift (table/view identity)**
- `user_tenant_memberships` (tabell) vs `tenant_memberships` (vy)
- `session_artifact_state` — vy som blev tabell
- Äldre migreringar antar wrong name
- **Risk:** Medel — fungerar nu men fragilt

**C. Fantom-objekt (missing object references)**
- `plan_schedules` — 5 RLS-policyer definierade för en tabell som aldrig skapats
- **Risk:** Kritisk — dold teknisk skuld

**D. Fix-migreringar som krockar**
- 20260125154500 fixar samma problem som redan fixats i 20260125000001
- Leder till cirkulära konflikter vid fresh install
- **Risk:** Medel — kräver villkorlig logik

**E. Inkonsistenta funktionsnamn**
- `touch_updated_at()`, `trigger_set_updated_at()`, `set_updated_at()` (existerar ej)
- Domain-specifika varianter: `achievements_set_updated_at()`, `badge_presets_set_updated_at()`, `game_reactions_set_updated_at()`
- **Risk:** Låg men skapar förvirring

### 2.4 Baseline-täckning

Den initiala migrationen (`20251129000000_initial_schema.sql`) skapar:
- 9 enum-typer
- 15 kärntabeller (tenants, users, memberships, products, games, plans, billing)
- 3 RLS-hjälpfunktioner
- ~15 RLS-policyer

**150+ tabeller** skapas i efterföljande migreringar. Baseline täcker alltså bara ~13% av slutresultatet.

---

## Del 3: Korsdomänanalys

### 3.1 Namnkonventioner

| Konvention | Status | Detaljer |
|------------|--------|---------|
| snake_case tabellnamn | ✅ Konsekvent | Alla tabeller följer konventionen |
| UUID primärnycklar | ✅ Konsekvent | gen_random_uuid() överallt |
| created_at/updated_at | ✅ Konsekvent | Alla tabeller har timestamps |
| tenant_id FK-namn | 🔴 Inkonsekvent | `tenant_id` (standard) vs `owner_tenant_id` (games, plans) |
| Enum-namngivning | ✅ Konsekvent | `*_enum` suffix |
| Index-namngivning | 🟡 Varierande | Blandar `idx_*` och `tabellnamn_kolumn_idx` |

### 3.2 RLS-mönster

| Mönster | Användning | Status |
|---------|-----------|--------|
| Via hjälpfunktioner | ~80% | ✅ Konsekvent |
| Kaskaderande via FK | ~10% | ✅ Medvetet |
| Direkt auth.uid() | ~5% | 🟡 Äldre kod |
| auth.role() | ~5% | ✅ Specifikt/avsiktligt |

**Övergripande RLS-konsekvens: 7.5/10** — Bra efter härdning, men äldre kod har variation.

### 3.3 Domänöverlapp

```
Gamification ←→ Journey (achievements, cosmetics)
Shop ←→ Billing (products, purchases)
Play ←→ Game Builder (artifacts, triggers, sessions)
Learning ←→ Gamification (XP, rewards)
Notifications ← Alla domäner (broadcast)
```

Överlappen är **funktionell, inte strukturell** — tabellerna refererar varandra via FK, de delar inte tabeller. Detta är acceptabelt.

---

## Del 4: Slutbedömning

### 4.1 Schema-hälsa vs migrationskedjan

| Dimension | Betyg | Kommentar |
|-----------|-------|-----------|
| **Schema-design** | 7/10 | Rimlig arkitektur, kända brister (naming, roll-fragmentering, gamification-sprawl) |
| **Migrationskedjans hälsa** | 4/10 | 10 fresh-install-fel, 29% fix-migreringar, fantom-objekt, ordningsberoenden |
| **RLS & säkerhet** | 8/10 | Grundligt härdad efter initial brist, 95% av SECURITY DEFINER korrekt |
| **Tenant isolation** | 8/10 | Välfungerande multi-tenant-modell med konsekventa hjälpfunktioner |
| **Framtidssäkerhet** | 6/10 | Gamification-sprawl och billing-överdimensionering utgör risk |

### 4.2 Huvudsakligt problem

> **Problemet är INTE att datamodellen är hopplös. Problemet är att 307 migreringar som vuxit fram över tid inte längre är en tillförlitlig källa för nya environments.**

307 migreringar varav 29% är fixes skapar en kedja där:
- Ordningen har dolda beroenden
- Fixar krockar med andra fixar
- Objekt refereras utan att existera
- Tabellnamn har glidit

Produktions-databasen fungerar (den fick migreringarna inkrementellt). Men en fresh install kräver 10 manuella fixar — och det kan bli fler.

### 4.3 Kärnfråga

> **Ska Lekbanken fortsätta lappa 307 migreringar, eller skapa en ny canonical baseline som representerar dagens faktiska schema?**

Svaret på denna fråga avgör remedierings-strategin. Se `../implementation/database-architecture-remediation-plan.md` och `database-rebuild-feasibility.md` för detaljerad analys av alternativen.
