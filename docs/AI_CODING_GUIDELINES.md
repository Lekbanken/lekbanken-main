# AI CODING GUIDELINES – LEKBANKEN

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-10
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active AI-agent coding guardrail reference. Read together with `.github/copilot-instructions.md`, `REPO_GOVERNANCE.md`, and domain-specific canonical docs.

**⚠️ OBLIGATORISKT FÖR ALLA AI-AGENTER**  
Detta dokument **MÅSTE** läsas innan kod skrivs eller ändras i Lekbanken-projektet.

---

## 🎯 Syfte

Detta dokument innehåller **kritiska tekniska beslut och mönster** som AI-agenter ofta gör fel på. Läs detta **innan** du skriver kod för att undvika:
- Type mismatches
- Deprecated patterns
- Breaking changes
- Duplicerade lösningar

---

## 🚨 KRITISKA REGLER

### 1. Next.js Middleware

**✅ RÄTT:**
```typescript
// proxy.ts (INTE middleware.ts!)
export default async function proxy(request: NextRequest) {
  // Auth + request tracking logic
}
```

**❌ FEL:**
```typescript
// middleware.ts - DEPRECATED, ska inte användas!
export function middleware(request: NextRequest) {
  // ...
}
```

**Regel:** Next.js 15+ använder `proxy.ts` istället för `middleware.ts`. Skapa ALDRIG en `middleware.ts`-fil.

**Varför:** Next.js har migrerat från `middleware.ts` till `proxy.ts`. Om båda finns får du runtime-fel.

---

### 2. Supabase Client Creation

**✅ RÄTT (Browser/Client Components):**
```typescript
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();
```

**✅ RÄTT (Server Components):**
```typescript
import { createServerClient } from '@/lib/supabase/server';

const supabase = await createServerClient();
```

**❌ FEL:**
```typescript
import { createClient } from '@supabase/supabase-js';
// Denna export finns inte i våra helpers!
```

**Regel:** Använd **alltid** våra wrapper-funktioner från `@/lib/supabase/client` eller `@/lib/supabase/server`.

**Varför:** Våra wrappers hanterar cookies, auth, och TypeScript types korrekt.

---

### 3. Database Schema & Types

**✅ RÄTT:**
```typescript
// Kontrollera faktiska kolumnnamn i databasen FÖRST
const { data } = await supabase
  .from('error_tracking')
  .select('resolved')  // boolean, inte resolved_at
  .eq('resolved', false);
```

**❌ FEL:**
```typescript
// Anta INTE kolumnnamn!
const { data } = await supabase
  .from('error_tracking')
  .select('resolved_at')  // Finns inte!
  .eq('resolved', true);
```

**Regel:** 
1. **Sök** efter befintlig användning av tabellen i koden
2. **Läs** faktiskt schema i `supabase/migrations/` eller kör `npx supabase db pull`
3. **Använd** `Database` types från `@/types/supabase`

**Verkliga tabeller:**
- ✅ `tenant_audit_logs` (inte `audit_logs`)
- ✅ `user_profiles` har `user_id` som primary key (inte `id`)
- ✅ `error_tracking` har `resolved: boolean` (inte `resolved_at`)

---

### 4. Komponentbibliotek: Standard UI Components

**✅ RÄTT:**
```typescript
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
```

**❌ FEL:**
```typescript
import { Button } from '@/catalyst-ui-kit/typescript/button';  // Catalyst är borttaget
```

**Regel:** Vi använder våra egna UI-komponenter i `@/components/ui/`.

**Varför:** Vi har migrerat bort från Catalyst UI Kit för att undvika externa beroenden och säkerhetsproblem.

---

### 5. Admin Components

**✅ RÄTT:**
```typescript
import { AdminStatCard } from '@/components/admin/AdminStatCard';

<AdminStatCard 
  title="Active Users" 
  value={1234}
  iconColor="blue"  // Endast: blue, green, red, yellow, purple, gray, amber
/>
```

**❌ FEL:**
```typescript
<AdminStatCard 
  iconColor="emerald"  // Finns inte!
/>
```

**Regel:** Använd endast godkända `iconColor` värden. Se komponentens TypeScript definition.

---

### 6. Domändriven Design (DDD)

**✅ RÄTT (Följ befintlig struktur):**
```
features/
├── games/           ← Game Domain
├── planner/         ← Planner Domain
├── browse/          ← Browse Domain
├── profile/         ← Profile Domain
└── participants/    ← Participants Domain (ny, se PARTICIPANTS_DOMAIN_ARCHITECTURE.md)
```

**❌ FEL:**
```
features/
└── shared/          ← Undvik "shared" dumping ground
    ├── utils/
    ├── components/
    └── services/    ← Spretar domängränser
```

**Regel:** 
- Håll dig **inom domängränser**
- Läs `docs/PARTICIPANTS_DOMAIN_ARCHITECTURE.md` innan du bygger participants-funktionalitet
- Shared kod går i `lib/` eller `components/layout/`, inte i `features/shared/`

---

### 7. TypeScript: any vs unknown

**✅ RÄTT:**
```typescript
// När any är oundvikligt (t.ex. Supabase dynamic queries)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dynamicQuery(table: any) {
  return supabase.from(table);
}
```

**❌ FEL:**
```typescript
function dynamicQuery(table: any) {  // Ingen comment, ingen eslint-disable
  return supabase.from(table);
}
```

**Regel:** 
- Undvik `any` om möjligt
- Om `any` är nödvändig: Lägg till `eslint-disable-next-line` + kommentar med motivering

---

### 8. Participant Sessions (Nytt system!)

**✅ RÄTT (När du bygger participants-funktionalitet):**
```typescript
// Följ PARTICIPANTS_DOMAIN_ARCHITECTURE.md exakt!

// Host skapar session
const { data: session } = await supabase
  .from('participant_sessions')
  .insert({
    session_code: generateSessionCode(),  // 6-char code
    host_user_id: user.id,
    game_id: gameId,
    persistence_mode: 'ephemeral',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });

// Participant joins
const { data: participant } = await supabase
  .from('participants')
  .insert({
    session_id: sessionId,
    display_name: 'Anna',
    participant_token: nanoid(32)  // Secret token
  });
```

**❌ FEL:**
```typescript
// Använd INTE gamla multiplayer_sessions!
const { data } = await supabase
  .from('multiplayer_sessions')
  .insert({ /* ... */ });  // Gammalt system, kräver accounts
```

**Regel:** 
- `multiplayer_sessions` är **deprecated** för nya funktioner
- Använd `participant_sessions` + `participants` för anonyma join-flows
- **LÄS** `docs/PARTICIPANTS_DOMAIN_ARCHITECTURE.md` innan du börjar

---

## 📋 Checklista innan kod-commit

Innan du skriver kod, kontrollera:

- [ ] Har jag läst relevant domän-dokumentation? (`PARTICIPANTS_DOMAIN_ARCHITECTURE.md`, etc.)
- [ ] Har jag sökt efter befintlig användning av komponenten/tabellen?
- [ ] Använder jag rätt Supabase client (`createBrowserClient` vs `createServerClient`)?
- [ ] Följer jag Catalyst UI Kit conventions?
- [ ] Har jag verifierat faktiska kolumnnamn i databasen?
- [ ] Ligger min kod i rätt domän-folder?
- [ ] Undviker jag `any` utan motivering?

---

## 🔍 Hur AI ska använda detta dokument

### Steg 1: Läs ALLTID innan start
När du får en uppgift, **börja** med att läsa detta dokument. Jämför med din plan.

### Steg 2: Sök efter exempel
Innan du skapar ny kod, **sök** i codebase efter liknande patterns:
```
grep -r "createBrowserClient" .
grep -r "participant_sessions" .
```

### Steg 3: Validera mot dokumentation
Om du ska bygga i Participants Domain → **LÄS** `PARTICIPANTS_DOMAIN_ARCHITECTURE.md` först.

### Steg 4: Fråga vid tvivel
Om något är oklart → **FRÅGA** användaren innan du gissar.

---

## 🛠️ Vanliga misstag & fixes

| Misstag | Fix |
|---------|-----|
| Skapar `middleware.ts` | Använd `proxy.ts` istället |
| `createClient is not exported` | Använd `createBrowserClient` från `@/lib/supabase/client` |
| `Column 'resolved_at' does not exist` | Tabellen använder `resolved: boolean` |
| `Cannot find module '@/components/ui/button'` | Använd `@/catalyst-ui-kit/button` |
| `iconColor="emerald"` ger error | Använd `iconColor="green"` |
| Blandar domäner | Håll kod inom rätt `features/` folder |

---

## 📚 Relaterad dokumentation

Läs dessa dokument när relevant:

| Dokument | När ska läsas |
|----------|---------------|
| `PARTICIPANTS_DOMAIN_ARCHITECTURE.md` | Bygger join-flow, sessions, roles |
| `PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md` | Förstå vad som INTE finns implementerat |
| `CATALYST_UI_KIT.md` | Lägger till UI-komponenter |
| `AUTH_SYSTEM_ANALYSIS.md` | Jobbar med auth/RLS |
| `MIGRATIONS.md` | Skapar nya databastabeller |

---

## ✅ Exempel på korrekt workflow

**Scenario:** AI ska bygga "Join session via code"-funktionalitet

1. ✅ Läser `AI_CODING_GUIDELINES.md` → ser regel #8 om Participants
2. ✅ Öppnar `PARTICIPANTS_DOMAIN_ARCHITECTURE.md` → förstår arkitekturen
3. ✅ Söker efter `participant_sessions` i koden → hittar schema
4. ✅ Använder `createBrowserClient` från rätt import
5. ✅ Skapar kod i `features/participants/` (rätt domän)
6. ✅ Följer TypeScript types från `@/types/supabase`

**Resultat:** Kod fungerar första gången, inga breaking changes.

---

## 🚫 Exempel på felaktigt workflow

**Scenario:** AI bygger samma funktionalitet utan att läsa guidelines

1. ❌ Antar att `multiplayer_sessions` är rätt tabell
2. ❌ Importerar `createClient` (finns inte)
3. ❌ Gissar kolumnnamn (`resolved_at` istället för `resolved`)
4. ❌ Skapar kod i `features/shared/` (fel domän)
5. ❌ Använder `any` överallt utan kommentarer

**Resultat:** TypeScript errors, runtime crashes, breaking changes.

---

## 📞 Support

Om detta dokument saknar något → **uppdatera det**! Det är en levande resurs.

Om du (AI) är osäker → **FRÅGA** användaren istället för att gissa.

---

**Version:** 1.0  
**Datum:** 2025-12-10  
**Nästa review:** Vid varje större arkitekturändring
