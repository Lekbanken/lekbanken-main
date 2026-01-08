# LEKBANKEN — GAMIFICATION TRIGGER RAPPORT

**Datum:** 2026-01-08  
**Syfte:** Komplett analys av gamification-systemet med 100 trigger-förslag för DiceCoin/XP rewards  
**Målgrupp:** ChatGPT-planering, produktteam, utvecklare

---

## EXECUTIVE SUMMARY

Lekbanken har ett etablerat gamification-ramverk med:
- **DiceCoin** — Virtuell valuta (per tenant, ledger-baserad)
- **XP & Nivåer** — Progressionssystem (1000 XP per nivå)
- **Achievements** — Olåsbara milstolpar med badges
- **Streaks** — Daglig engagemangsräknare
- **Shop** — Kosmetika och power-ups (planerad)
- **Leaderboards** — Rankning per tenant/global

### Befintliga implementerade triggers
```
play:session_completed    → +2 DiceCoin
play:run_completed        → +1 DiceCoin  
planner:plan_created      → +5 DiceCoin
planner:plan_published    → +10 DiceCoin
```

---

## DEL 1: SYSTEMÖVERSIKT

### 1.1 Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        EVENT SOURCES                            │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────┤
│ Planner  │  Play    │  Admin   │  Content │  Social  │ System  │
│ Domain   │  Domain  │  Domain  │  Domain  │  Domain  │ Domain  │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬────┘
     │          │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT INGESTION LAYER                        │
│  POST /api/gamification/events (idempotent, service-role only)  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Event Contract v1:                                       │   │
│  │ - event_type: string                                     │   │
│  │ - actor_user_id: uuid                                    │   │
│  │ - tenant_id: uuid | null                                 │   │
│  │ - source: 'planner'|'play'|'admin'|'system'              │   │
│  │ - idempotency_key: string                                │   │
│  │ - metadata: jsonb                                        │   │
│  │ - created_at: timestamptz                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER EVALUATION ENGINE                    │
│  (Deterministic, Idempotent, Server-side)                       │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ XP Rules      │  │ DiceCoin      │  │ Achievement   │       │
│  │ Evaluator     │  │ Minter        │  │ Unlocker      │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
│          │                  │                  │                │
└──────────┼──────────────────┼──────────────────┼────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │user_progress│  │user_coins   │  │user_achievements        │ │
│  │(XP, levels) │  │coin_trans.  │  │achievements             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │user_streaks │  │shop_items   │  │gamification_events      │ │
│  │             │  │purchases    │  │(append-only log)        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Datamodell (Core Tables)

| Tabell | Syfte | Key Fields |
|--------|-------|------------|
| `user_coins` | Saldo per tenant | balance, total_earned, total_spent |
| `coin_transactions` | Ledger (append-only) | type (earn/spend), amount, description |
| `user_progress` | Nivå & XP | level, current_xp, next_level_xp |
| `user_streaks` | Streak-tracking | current_streak_days, best_streak_days |
| `achievements` | Achievement-definitioner | condition_type, condition_value, rewards |
| `user_achievements` | Olåsta achievements | unlocked_at, tenant_id |
| `gamification_events` | Event-log | event_type, actor_user_id, metadata |
| `gamification_automation_rules` | Tenant-regler | event_type, reward_amount, is_active |

### 1.3 XP Mekanik

```
XP_PER_LEVEL = 1000
POINTS_TO_XP = 0.1  (10 poäng = 1 XP)

Level 1: 0 XP
Level 2: 1000 XP
Level 3: 2000 XP
...
Level N: (N-1) * 1000 XP
```

### 1.4 Befintliga Nivåer

| Level | Namn | XP krävs | Belöning |
|-------|------|----------|----------|
| 1 | Nybörjare | 0 | — |
| 2 | Lärling | 100 | 10 DiceCoin |
| 3 | Utforskare | 300 | 25 DiceCoin |
| 4 | Äventyrare | 600 | 50 DiceCoin |
| 5 | Mästare | 1000 | 100 DiceCoin |
| 6 | Legend | 2000 | Badge: Legend |

---

## DEL 2: TRIGGER-TAXONOMI

### Trigger-struktur

```typescript
interface GamificationTrigger {
  id: string;                    // Unikt ID
  event_type: string;            // Event-namn (snake_case)
  source: TriggerSource;         // Källa
  scope: TriggerScope;           // Vem kan utlösa
  rewards: {
    xp?: number;                 // XP-belöning
    dicecoin?: number;           // DiceCoin-belöning
    multiplier?: number;         // Bonus-multiplikator
  };
  conditions?: TriggerCondition; // Villkor för aktivering
  cooldown?: string;             // "daily" | "weekly" | "once" | null
  tier?: number;                 // Tier för progressiva achievements
}

type TriggerSource = 
  | 'planner'    // Planering & publicering
  | 'play'       // Spelande & sessioner
  | 'content'    // Innehållsskapande
  | 'social'     // Social interaktion
  | 'learning'   // Utbildning & kurser
  | 'admin'      // Administrativa handlingar
  | 'system'     // Systemhändelser
  | 'engagement' // Dagligt engagemang

type TriggerScope = 
  | 'member'         // Alla medlemmar (lekledare)
  | 'tenant'         // Tenant-specifika
  | 'admin_tenant'   // Admin för tenant
  | 'system_admin'   // Systemadmin
```

---

## DEL 3: 50 MEMBER TRIGGERS (Lekledare)

Dessa triggers gäller för alla medlemmar/lekledare i systemet.

### 3.1 PLAY DOMAIN (Spelande) — 15 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 1 | `play:session_started` | Starta en spelsession | 10 | 1 | — |
| 2 | `play:session_completed` | Avsluta en spelsession | 25 | 2 | — |
| 3 | `play:run_completed` | En deltagares run avslutas | 15 | 1 | — |
| 4 | `play:perfect_session` | Session utan problem/buggar | 50 | 5 | daily |
| 5 | `play:large_group_hosted` | Hostat 20+ deltagare i en session | 100 | 10 | weekly |
| 6 | `play:first_session` | Första sessionen någonsin | 500 | 50 | once |
| 7 | `play:milestone_10_sessions` | 10 sessioner totalt | 200 | 25 | once |
| 8 | `play:milestone_50_sessions` | 50 sessioner totalt | 500 | 75 | once |
| 9 | `play:milestone_100_sessions` | 100 sessioner totalt | 1000 | 150 | once |
| 10 | `play:full_completion` | Alla deltagare klarade alla steg | 75 | 8 | — |
| 11 | `play:quick_session` | Session under 15 min med ≥5 deltagare | 30 | 3 | daily |
| 12 | `play:extended_session` | Session över 2 timmar | 50 | 5 | daily |
| 13 | `play:high_engagement` | >80% deltagarengagemang | 40 | 4 | — |
| 14 | `play:repeat_favorite` | Kör samma plan 5+ gånger | 25 | 3 | weekly |
| 15 | `play:variety_host` | Kört 5 olika planer på en vecka | 100 | 15 | weekly |

### 3.2 PLANNER DOMAIN (Planering) — 12 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 16 | `planner:plan_created` | Skapa en ny plan | 20 | 5 | — |
| 17 | `planner:plan_published` | Publicera en plan | 50 | 10 | — |
| 18 | `planner:plan_updated` | Uppdatera en publicerad plan | 10 | 2 | daily |
| 19 | `planner:block_added` | Lägga till ett block i plan | 5 | 1 | — |
| 20 | `planner:first_plan` | Skapa första planen | 200 | 25 | once |
| 21 | `planner:milestone_5_plans` | 5 publicerade planer | 300 | 40 | once |
| 22 | `planner:milestone_25_plans` | 25 publicerade planer | 750 | 100 | once |
| 23 | `planner:complex_plan` | Plan med 10+ blocks | 75 | 10 | — |
| 24 | `planner:multimedia_plan` | Plan med video, ljud och bild | 50 | 8 | — |
| 25 | `planner:template_used` | Använt en mall för plan | 15 | 2 | — |
| 26 | `planner:plan_copied` | Kopierat en plan | 10 | 2 | — |
| 27 | `planner:plan_shared` | Delat plan med annan lekledare | 30 | 5 | — |

### 3.3 CONTENT DOMAIN (Innehåll) — 8 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 28 | `content:game_created` | Skapa ett nytt spel | 40 | 8 | — |
| 29 | `content:game_published` | Publicera ett spel | 100 | 15 | — |
| 30 | `content:asset_uploaded` | Ladda upp media-asset | 5 | 1 | — |
| 31 | `content:first_game` | Skapa första spelet | 250 | 30 | once |
| 32 | `content:game_used_by_others` | Ditt spel används av annan | 50 | 10 | — |
| 33 | `content:artifact_created` | Skapa ett nytt artifact | 15 | 3 | — |
| 34 | `content:riddle_created` | Skapa ett gåtblock | 20 | 4 | — |
| 35 | `content:keypad_created` | Skapa ett kodlås | 20 | 4 | — |

### 3.4 ENGAGEMENT DOMAIN (Dagligt) — 8 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 36 | `engagement:daily_login` | Logga in dagligen | 10 | 1 | daily |
| 37 | `engagement:streak_3_days` | 3 dagars streak | 30 | 5 | once/streak |
| 38 | `engagement:streak_7_days` | 7 dagars streak | 75 | 15 | once/streak |
| 39 | `engagement:streak_30_days` | 30 dagars streak | 300 | 50 | once/streak |
| 40 | `engagement:streak_100_days` | 100 dagars streak | 1000 | 200 | once/streak |
| 41 | `engagement:weekly_active` | Aktiv alla 5 vardagar | 50 | 10 | weekly |
| 42 | `engagement:profile_completed` | Fyllt i hela profilen | 100 | 20 | once |
| 43 | `engagement:notification_enabled` | Aktiverat notiser | 25 | 5 | once |

### 3.5 SOCIAL DOMAIN — 4 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 44 | `social:invite_sent` | Bjudit in en kollega | 25 | 5 | — |
| 45 | `social:invite_accepted` | Din inbjudan accepterades | 100 | 20 | — |
| 46 | `social:feedback_given` | Gett feedback på plan/spel | 15 | 3 | daily |
| 47 | `social:collaboration_started` | Startat samarbete på plan | 50 | 10 | — |

### 3.6 LEARNING DOMAIN — 3 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Cooldown |
|---|------------|-------------|----|---------:|----------|
| 48 | `learning:course_completed` | Slutfört en utbildning | 200 | 30 | — |
| 49 | `learning:quiz_passed` | Klarat ett quiz | 50 | 10 | — |
| 50 | `learning:tutorial_completed` | Slutfört tutorial | 100 | 15 | once |

---

## DEL 4: 25 TENANT-SPECIFIKA TRIGGERS

Dessa triggers kan aktiveras/konfigureras per tenant av tenant-admin.

| # | Event Type | Beskrivning | Default XP | Default DC | Konfigurerbart |
|---|------------|-------------|------------|------------|----------------|
| 51 | `tenant:onboarding_complete` | Slutfört tenant-onboarding | 150 | 25 | amount, active |
| 52 | `tenant:first_session_in_org` | Första sessionen i organisationen | 100 | 20 | amount |
| 53 | `tenant:team_milestone` | Team nått gemensamt mål | 200 | 50 | threshold, amount |
| 54 | `tenant:monthly_top_performer` | Månadens mest aktiva | 500 | 100 | active |
| 55 | `tenant:department_challenge_won` | Vunnit avdelningsutmaning | 300 | 75 | active |
| 56 | `tenant:new_member_mentor` | Mentorerat ny medlem | 150 | 30 | amount |
| 57 | `tenant:quality_content_badge` | Kvalitetsmärkt innehåll | 100 | 25 | criteria |
| 58 | `tenant:compliance_training` | Slutfört obligatorisk utbildning | 75 | 15 | courses |
| 59 | `tenant:innovation_award` | Innovationspris från admin | 250 | 50 | manual |
| 60 | `tenant:event_participation` | Deltagit i tenant-event | 50 | 10 | events |
| 61 | `tenant:feedback_champion` | Gett 10+ feedback under månad | 100 | 20 | threshold |
| 62 | `tenant:resource_contributor` | Bidragit till resursbibliotek | 75 | 15 | types |
| 63 | `tenant:early_adopter` | Tidig användare av ny feature | 100 | 25 | features |
| 64 | `tenant:ambassador` | Utnämnd ambassadör | 300 | 75 | manual |
| 65 | `tenant:cross_team_collab` | Samarbete över avdelningar | 150 | 30 | teams |
| 66 | `tenant:sustainability_goal` | Uppnått hållbarhetsmål | 100 | 20 | goals |
| 67 | `tenant:custom_trigger_1` | Anpassningsbar trigger 1 | — | — | full |
| 68 | `tenant:custom_trigger_2` | Anpassningsbar trigger 2 | — | — | full |
| 69 | `tenant:custom_trigger_3` | Anpassningsbar trigger 3 | — | — | full |
| 70 | `tenant:seasonal_bonus` | Säsongsbaserad bonus | 50 | 10 | dates, amount |
| 71 | `tenant:retention_reward` | Retention-belöning (6+ mån) | 200 | 50 | months |
| 72 | `tenant:anniversary_1yr` | 1 års jubileum | 500 | 100 | — |
| 73 | `tenant:perfect_month` | Aktiv varje dag en hel månad | 400 | 80 | — |
| 74 | `tenant:content_library_grown` | Biblioteket växte med X% | 150 | 30 | threshold |
| 75 | `tenant:engagement_streak_team` | Hela teamet har streak | 300 | 75 | days |

---

## DEL 5: 25 ADMIN/TENANT-ADMIN TRIGGERS

Dessa triggers gäller för administrativa handlingar och admin-specifika belöningar.

### 5.1 TENANT ADMIN TRIGGERS — 15 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Scope |
|---|------------|-------------|----|---------:|-------|
| 76 | `admin:manual_award_given` | Gett manuell belöning | 25 | — | tenant |
| 77 | `admin:campaign_launched` | Startat en kampanj | 100 | 15 | tenant |
| 78 | `admin:campaign_completed` | Slutfört kampanj framgångsrikt | 200 | 30 | tenant |
| 79 | `admin:automation_created` | Skapat automationsregel | 50 | 10 | tenant |
| 80 | `admin:report_generated` | Genererat rapport | 15 | 2 | tenant |
| 81 | `admin:member_onboarded` | Onboardat ny medlem | 30 | 5 | tenant |
| 82 | `admin:content_approved` | Godkänt innehåll | 20 | 3 | tenant |
| 83 | `admin:quality_review` | Utfört kvalitetsgranskning | 40 | 8 | tenant |
| 84 | `admin:bulk_action` | Utfört bulk-operation | 25 | 4 | tenant |
| 85 | `admin:settings_optimized` | Optimerat tenant-inställningar | 75 | 15 | tenant |
| 86 | `admin:integration_setup` | Konfigurerat integration | 100 | 20 | tenant |
| 87 | `admin:user_support` | Hjälpt användare via support | 35 | 7 | tenant |
| 88 | `admin:analytics_insight` | Agerat på analytics-insight | 50 | 10 | tenant |
| 89 | `admin:goal_set` | Satt organisationsmål | 40 | 8 | tenant |
| 90 | `admin:milestone_celebrated` | Firat team-milstolpe | 100 | 25 | tenant |

### 5.2 SYSTEM ADMIN TRIGGERS — 10 triggers

| # | Event Type | Beskrivning | XP | DiceCoin | Scope |
|---|------------|-------------|----|---------:|-------|
| 91 | `system:global_campaign` | Startat global kampanj | 200 | 50 | system |
| 92 | `system:feature_release` | Lanserat ny feature | 500 | 100 | system |
| 93 | `system:template_published` | Publicerat global mall | 150 | 30 | system |
| 94 | `system:platform_maintenance` | Utfört underhåll | 75 | 15 | system |
| 95 | `system:abuse_prevented` | Förhindrat missbruk | 100 | 25 | system |
| 96 | `system:tenant_onboarded` | Onboardat ny tenant | 300 | 75 | system |
| 97 | `system:documentation_updated` | Uppdaterat dokumentation | 50 | 10 | system |
| 98 | `system:security_audit` | Utfört säkerhetsgranskning | 200 | 40 | system |
| 99 | `system:economy_rebalance` | Balanserat ekonomin | 100 | 20 | system |
| 100 | `system:achievement_created` | Skapat nytt achievement | 75 | 15 | system |

---

## DEL 6: TRIGGER-KATEGORIER FÖR CHATGPT-PLANERING

### 6.1 Prioriteringsmatris

```
                    IMPACT
                    High │ Med  │ Low
                ─────────┼──────┼──────
FREQUENCY High  │   A    │  B   │  C
          Med   │   B    │  C   │  D
          Low   │   C    │  D   │  D
```

**Kategori A (Implementera först):**
- `play:session_completed`, `play:first_session`
- `engagement:daily_login`, `engagement:streak_*`
- `planner:plan_published`, `planner:first_plan`

**Kategori B (Fas 2):**
- Milestones (10/50/100 sessions)
- Content triggers
- Social triggers

**Kategori C (Fas 3):**
- Tenant-specifika triggers
- Admin triggers
- Advanced achievements

**Kategori D (Backlog):**
- Custom triggers
- Edge-case triggers

### 6.2 Trigger-flöde för implementering

```
1. EVENT DEFINITION
   └─> Definiera event_type, source, metadata schema

2. EVENT EMISSION
   └─> Integrera i relevant API-endpoint
   └─> Säkerställ idempotency_key

3. REWARD RULE
   └─> Konfigurera XP/DiceCoin i automation_rules
   └─> Testa med dry-run

4. ACHIEVEMENT LINKING (optional)
   └─> Koppla till achievement condition_type
   └─> Konfigurera tiers

5. UI FEEDBACK
   └─> Toast notification vid trigger
   └─> Uppdatera progress-bar
```

---

## DEL 7: ACHIEVEMENT-KOPPLING

### 7.1 Förslag på Achievements baserade på triggers

| Achievement | Trigger-krav | Tiers | Belöning per tier |
|-------------|--------------|-------|-------------------|
| **Första steget** | `play:first_session` | 1 | 50 DC |
| **Vinnare** | `play:milestone_*` | 3 | 25/50/100 DC |
| **Streak Master** | `engagement:streak_*` | 5 | 10/25/50/100/250 DC |
| **Planerare** | `planner:milestone_*` | 3 | 20/50/100 DC |
| **Social Butterfly** | `social:invite_accepted` x5 | 3 | 50/100/200 DC |
| **Innehållsskapare** | `content:game_published` x3 | 3 | 30/75/150 DC |
| **Lärling** | `learning:*` | 2 | 50/100 DC |
| **Daglig Rutin** | `engagement:weekly_active` x4 | 4 | 25/50/100/200 DC |
| **Veteran** | `play:milestone_100_sessions` | 1 | 500 DC + Badge |
| **Mentor** | `tenant:new_member_mentor` x3 | 3 | 50/100/200 DC |

### 7.2 Easter Egg Achievements (Hemliga)

| Achievement | Trigger | Belöning |
|-------------|---------|----------|
| **Nattuggle** | Session startat efter 23:00 | 100 DC |
| **Morgonpigg** | Session startat före 06:00 | 100 DC |
| **Speed Demon** | Session på under 5 min | 75 DC |
| **Maraton** | Session över 4 timmar | 150 DC |
| **Perfektionist** | 10 sessioner med 100% completion | 200 DC |

---

## DEL 8: MULTIPLIER & BONUS-SYSTEM

### 8.1 Förslag på Multiplikatorer

| Multiplikator | Villkor | Bonus |
|---------------|---------|-------|
| **Streak Bonus** | 7+ dagars streak | 1.5x |
| **Weekend Warrior** | Session på lördag/söndag | 2x |
| **Prime Time** | Session 08-17 på vardag | 1.25x |
| **Kampanj-aktiv** | Under aktiv kampanj | 2-3x |
| **Nivåbonus** | Level 5+ | 1.1x per nivå |
| **Första gången** | Första trigger av typen | 3x |

### 8.2 Kampanjförslag

| Kampanj | Triggers | Bonus | Duration |
|---------|----------|-------|----------|
| **Onboarding Boost** | Alla `*:first_*` | 3x | 7 dagar |
| **Planerveckan** | `planner:*` | 2x | 7 dagar |
| **Sommarspel** | `play:*` | 1.5x | 30 dagar |
| **Streakutmaning** | `engagement:streak_*` | 2x | 14 dagar |
| **Innehållsfest** | `content:*` | 2x | 7 dagar |

---

## DEL 9: TEKNISK IMPLEMENTATION

### 9.1 Event-struktur (TypeScript)

```typescript
interface GamificationEvent {
  id: string;
  event_type: string;
  actor_user_id: string;
  tenant_id: string | null;
  source: 'planner' | 'play' | 'admin' | 'content' | 'social' | 'learning' | 'system' | 'engagement';
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RewardRule {
  id: string;
  tenant_id: string | null; // null = global
  event_type: string;
  xp_amount: number;
  dicecoin_amount: number;
  multiplier: number;
  conditions: RewardCondition[];
  is_active: boolean;
  cooldown: 'none' | 'daily' | 'weekly' | 'once';
}

interface RewardCondition {
  type: 'count' | 'threshold' | 'time' | 'metadata';
  field?: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';
  value: unknown;
}
```

### 9.2 API Endpoints

```
POST /api/gamification/events
  - Logga event (service role only)
  - Triggar reward evaluation
  - Returnerar utdelade rewards

GET /api/gamification
  - Snapshot: achievements, coins, streak, progress

GET /api/gamification/rules
  - Lista aktiva reward-regler (admin only)

POST /api/gamification/rules
  - Skapa/uppdatera regel (admin only)

POST /api/admin/gamification/awards
  - Manuell award (admin only)
```

### 9.3 Database Triggers (PostgreSQL)

```sql
-- Automatisk streak-uppdatering vid session
CREATE OR REPLACE FUNCTION update_streak_on_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Uppdatera streak när session skapas
  INSERT INTO user_streaks (user_id, tenant_id, current_streak_days, last_active_date)
  VALUES (NEW.host_user_id, NEW.tenant_id, 1, CURRENT_DATE)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    current_streak_days = CASE 
      WHEN user_streaks.last_active_date = CURRENT_DATE - 1 
        THEN user_streaks.current_streak_days + 1
      WHEN user_streaks.last_active_date = CURRENT_DATE 
        THEN user_streaks.current_streak_days
      ELSE 1
    END,
    best_streak_days = GREATEST(
      user_streaks.best_streak_days, 
      user_streaks.current_streak_days + 1
    ),
    last_active_date = CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## DEL 10: REKOMMENDATIONER FÖR CHATGPT-PLANERING

### 10.1 MVP Scope (Fas 1)

**Implementera dessa 15 triggers först:**
1. `play:session_completed` ✅ (finns)
2. `play:run_completed` ✅ (finns)
3. `play:first_session`
4. `planner:plan_created` ✅ (finns)
5. `planner:plan_published` ✅ (finns)
6. `planner:first_plan`
7. `engagement:daily_login`
8. `engagement:streak_3_days`
9. `engagement:streak_7_days`
10. `content:game_created`
11. `content:game_published`
12. `play:milestone_10_sessions`
13. `engagement:profile_completed`
14. `learning:tutorial_completed`
15. `social:invite_accepted`

### 10.2 Arkitekturförslag

1. **Centraliserad Event Bus**
   - Alla domäner emittar till samma endpoint
   - Garanterad ordering och idempotens

2. **Rule Engine**
   - Deklarativa regler i databasen
   - Tenant-override för globala regler
   - Versionerade regeländringar

3. **Real-time Feedback**
   - WebSocket/SSE för reward-notiser
   - Toast + progress-bar update
   - Sound effects för achievements

4. **Admin Dashboard**
   - Ekonomi-översikt (mint rate, burn rate)
   - Trigger-statistik
   - Fraud detection

### 10.3 Frågor att besvara

1. **Ekonomi-balans**: Hur många DiceCoin ska finnas i systemet totalt?
2. **Inflation-kontroll**: Hur förhindrar vi inflation av valutan?
3. **Burn mechanisms**: Vad kan man spendera DiceCoin på?
4. **Cross-tenant**: Ska achievements vara globala eller per tenant?
5. **Leaderboard scope**: Global vs tenant vs team?

---

## APPENDIX A: KOMPLETT TRIGGER-LISTA

### Alla 100 triggers sorterade per källa

<details>
<summary>PLAY (15)</summary>

1. play:session_started
2. play:session_completed
3. play:run_completed
4. play:perfect_session
5. play:large_group_hosted
6. play:first_session
7. play:milestone_10_sessions
8. play:milestone_50_sessions
9. play:milestone_100_sessions
10. play:full_completion
11. play:quick_session
12. play:extended_session
13. play:high_engagement
14. play:repeat_favorite
15. play:variety_host

</details>

<details>
<summary>PLANNER (12)</summary>

16. planner:plan_created
17. planner:plan_published
18. planner:plan_updated
19. planner:block_added
20. planner:first_plan
21. planner:milestone_5_plans
22. planner:milestone_25_plans
23. planner:complex_plan
24. planner:multimedia_plan
25. planner:template_used
26. planner:plan_copied
27. planner:plan_shared

</details>

<details>
<summary>CONTENT (8)</summary>

28. content:game_created
29. content:game_published
30. content:asset_uploaded
31. content:first_game
32. content:game_used_by_others
33. content:artifact_created
34. content:riddle_created
35. content:keypad_created

</details>

<details>
<summary>ENGAGEMENT (8)</summary>

36. engagement:daily_login
37. engagement:streak_3_days
38. engagement:streak_7_days
39. engagement:streak_30_days
40. engagement:streak_100_days
41. engagement:weekly_active
42. engagement:profile_completed
43. engagement:notification_enabled

</details>

<details>
<summary>SOCIAL (4)</summary>

44. social:invite_sent
45. social:invite_accepted
46. social:feedback_given
47. social:collaboration_started

</details>

<details>
<summary>LEARNING (3)</summary>

48. learning:course_completed
49. learning:quiz_passed
50. learning:tutorial_completed

</details>

<details>
<summary>TENANT (25)</summary>

51-75: Se DEL 4

</details>

<details>
<summary>ADMIN (25)</summary>

76-100: Se DEL 5

</details>

---

## APPENDIX B: BEFINTLIG KOD-REFERENS

### Relevanta filer i repot

| Fil | Syfte |
|-----|-------|
| `app/api/gamification/route.ts` | GET snapshot |
| `app/api/gamification/events/route.ts` | POST event ingestion |
| `app/api/gamification/coins/route.ts` | Coin operations |
| `lib/services/achievementService.ts` | Achievement logic |
| `lib/services/progressionService.ts` | XP/Level logic |
| `supabase/migrations/20251209133000_gamification_core.sql` | Core tables |
| `supabase/migrations/20251231273000_gamification_automation_rules_v1.sql` | Automation |
| `features/gamification/*` | UI components |
| `app/admin/gamification/*` | Admin pages |

---

*Dokumentet är förberett för export till ChatGPT för vidare planering av gamification-systemet.*
