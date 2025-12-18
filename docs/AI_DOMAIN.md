# AI Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-18

## Purpose

AI Domain samlar allt som rör **AI-stödda funktioner** i Lekbanken (förslag, generering, semantisk sök, assistans/automation).

Viktigt: AI Domain är **feature-flag-first**. Inga större AI-funktioner ska vara påslagna “out of the box”.

## Policy: Feature flags (hard requirement)

Alla user-facing AI-funktioner ska vara gated bakom feature flags.

Principer:
- **Default OFF** i alla miljöer (om inte explicit aktiverat).
- **Defense in depth**:
  - UI ska inte visa AI-funktioner om flaggan är av.
  - API routes ska returnera “not found”/“disabled” när flaggan är av (så att direktanrop inte fungerar).
- Feature flags ska vara enkla att slå av snabbt (env vars).

### Flaggar

- `FEATURE_AI` – master switch för AI-funktioner (default `false`).
- `FEATURE_AI_SUGGESTIONS` – specifik flagga för AI-förslag (default `false`).

Rekommenderad konvention framåt:
- Lägg alltid nya user-facing AI-flöden bakom `FEATURE_AI` + en specifik flagga (t.ex. `FEATURE_AI_GAME_GENERATION`).

## Current state (reality check)

Det finns **ingen aktiv LLM-integration** (OpenAI/Anthropic etc) i repo:t just nu.

Det som finns idag:
- En generell feature-flag mekanism i `lib/config/env.ts`.
- `FEATURE_AI_SUGGESTIONS` är definierad i docs + env-config, men har ingen aktiv code-path som använder den.
- Media kan klassas som `type = 'ai'` via `app/api/media`.
  - Detta är nu gated bakom `FEATURE_AI` för att undvika att AI-relaterad mediahantering råkar vara öppen utan avsikt.
- Admin har en statisk “AI prompt” (för att copy-pasta till en extern modell) i `features/admin/games/GameAdminPage.tsx`. Det är inte en AI-funktion i produkten (ingen API/LLM-koppling).

## Likely future scope (when enabled)

Exempel på funktioner som hör till AI Domain och ska feature-flag-gate:as:
- AI-sök (semantisk sök / re-rank)
- AI-förslag på lekar baserat på kontext (ålder, tid, syfte, produkt)
- Generering av lek-innehåll (draft) i admin/creator flows
- Bildgenerering eller auto-tagging för media
- Översättningsassistans (om det använder modeller)

## Boundaries & integrations

- Games Domain: AI kan föreslå och/eller generera *drafts*, men Games Domain äger datamodellen.
- Browse Domain: AI-förslag/rekommendationer påverkar discovery, men Browse Domain äger UI + ranking/presentation.
- Translation Engine Domain: AI kan vara ett verktyg, men Translation Engine äger i18n invariants och fallback.
- Media Domain: AI-genererade assets ska hanteras som media (t.ex. `type='ai'`) men kräver gates.

## Implementation guidance

När ni bygger riktiga AI-flöden:
- Lägg API routes under `app/api/ai/*` eller under respektive domän (t.ex. `app/api/games/ai-*`) men med tydlig gate.
- Kör alltid `FEATURE_AI`-check i API först (och gärna även en sub-flag).
- Spara prompts/outputs på ett sätt som är säkert (PII, loggning, retention) – och dokumentera i den här domändocken.

### API convention: gate helper

För framtida endpoints: använd helpern i `lib/ai/gate.ts`.

Exempel (read endpoint, hidden when disabled):

```ts
import { gateAi } from '@/lib/ai/gate'
import { NextResponse } from 'next/server'

export async function GET() {
  const gate = gateAi('aiSuggestions')
  if (gate) return gate

  return NextResponse.json({ ok: true })
}
```

Exempel (write endpoint, explicit 403 when disabled):

```ts
import { forbidAiIfDisabled } from '@/lib/ai/gate'
import { NextResponse } from 'next/server'

export async function POST() {
  const gate = forbidAiIfDisabled('aiSuggestions')
  if (gate) return gate

  return NextResponse.json({ ok: true })
}
```
