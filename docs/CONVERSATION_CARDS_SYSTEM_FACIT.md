# Samtalskort (Conversation Cards) — Systemfacit

## Syfte
Samtalskort är en Toolbelt-tool som låter host (och ev deltagare beroende på scope) välja en publicerad samling och bläddra mellan kort under en pågående session.

I Admin kan samlingar skapas, redigeras, förhandsvisas och fyllas på via strikt CSV-import.

## Datamodell (Supabase)
Migration: `supabase/migrations/20260103120000_conversation_cards_v1.sql`

- `conversation_card_collections`
  - Scope: `scope_type` = `global|tenant`, `tenant_id` (null för global)
  - Innehåll: `title`, `description`, `audience`, `language`
  - Syften: `main_purpose_id` (FK till `purposes`)
  - Status: `status` = `draft|published`

- `conversation_card_collection_secondary_purposes`
  - Many-to-many mellan `conversation_card_collections` och `purposes` (undersyften)

- `conversation_cards`
  - `collection_id`, `sort_order`
  - Fält: `card_title`, `primary_prompt`, `followup_1..3`, `leader_tip`, `metadata`

### Åtkomst (RLS)
- Läsning:
  - Publicerade globala samlingar är läsbara.
  - Tenant-samlingar är läsbara för aktiva tenant-medlemmar.
  - `public.is_global_admin()` kan läsa allt.
- Skrivning:
  - Globala samlingar: endast global admin.
  - Tenant-samlingar: tenant role `owner|admin`.

## CSV-import (låst format)
Källa: `features/conversation-cards/csv-format.ts`

Exakt header (ordning och stavning måste matcha):

`collection_title,collection_description,main_purpose,sub_purpose,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip`

Regler (MVP):
- Import publicerar inte automatiskt.
- `primary_prompt` krävs.
- `main_purpose` och `sub_purpose` matchas mot befintliga `purposes` via `purpose_key` (exakt) eller `name` (case-insensitive).

## API
### Admin (CRUD + import)
- List/Create: `app/api/admin/toolbelt/conversation-cards/collections/route.ts`
- Get/Update/Delete: `app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/route.ts`
- Create card: `app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/cards/route.ts`
- Update/Delete card: `app/api/admin/toolbelt/conversation-cards/cards/[cardId]/route.ts`
- Import: `app/api/admin/toolbelt/conversation-cards/collections/[collectionId]/import/route.ts`

### Toolbelt (published-only)
- List collections: `app/api/toolbelt/conversation-cards/collections/route.ts`
- Get collection + cards: `app/api/toolbelt/conversation-cards/collections/[collectionId]/route.ts`

## Admin UI
- List: `app/admin/toolbelt/conversation-cards/page.tsx`
- Create: `app/admin/toolbelt/conversation-cards/new/page.tsx`
- Detail/Edit/Cards/Preview: `app/admin/toolbelt/conversation-cards/[collectionId]/page.tsx`
- Import UI: `app/admin/toolbelt/conversation-cards/[collectionId]/import/page.tsx`

## Toolbelt tool
- Tool key: `conversation_cards_v1`
- Registry: `features/tools/registry.ts`
- UI: `features/tools/components/ConversationCardsV1.tsx`
- Render hook: `features/tools/components/Toolbelt.tsx`

Tooln visar publicerade samlingar och låter användaren bläddra i ordning.

## Artifact (Play)
Artifact-rendering är read-only och återanvänder samma publicerade samlingar.

### Artifact type + metadata
- `artifact_type`: `conversation_cards_collection`
- `metadata.conversation_card_collection_id`: ID för samlingen som ska visas

### Play API
- GET `app/api/play/sessions/[id]/conversation-cards/collections/[collectionId]/route.ts`
  - Auth: host session user eller participant via `x-participant-token`
  - Enbart `status = published`
  - Tenant-samlingar begränsas till sessionens `tenant_id`

## Kvar att göra (för full master-prompt)
- Artifact-integration (referera en samling som artifact utan att duplicera logik). ✅ (MVP)
- Sandbox-dokumentation + exempelstates.
- Regenerera Supabase-typer (`types/supabase.ts`) efter migrering (just nu används en overlay-typ i `features/conversation-cards/db-types.ts`).
