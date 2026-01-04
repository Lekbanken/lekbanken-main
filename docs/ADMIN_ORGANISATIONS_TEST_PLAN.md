# Admin Organisations – Test Plan

## Scope
Listvy för `/admin/organisations` med summary cards, filter/sök, preview‑rader och snabbåtgärder.

## Manual test checklist
- [ ] Besök `/admin/organisations` som `system_admin` → sidan laddar utan varning.
- [ ] Header visar titel + beskrivning och CTA “Skapa organisation”.
- [ ] Summary cards visar Totalt, Aktiva, Inaktiva, Trial/Demo, Billing kopplad.
- [ ] Sökfält filtrerar organisationer (debounced ~300ms) på namn, slug, UUID, kontakt eller domän.
- [ ] Filter: Status, Billing, Språk, Domän påverkar listan korrekt.
- [ ] Sort: Nyast, Namn A–Ö, Flest medlemmar, Senast uppdaterad fungerar.
- [ ] Klick på rad öppnar Organisationskortet.
- [ ] Kebab‑meny:
  - [ ] Visa organisation → öppnar kortet.
  - [ ] Redigera → öppnar kortet (overview).
  - [ ] Hantera medlemmar → öppnar kortet (tab=members).
  - [ ] Hantera billing → öppnar kortet + #billing.
  - [ ] Öppna Stripe visas endast om `customerId` finns.
  - [ ] Stäng av/Återaktivera uppdaterar status.
  - [ ] Ta bort organisation öppnar bekräftelsedialog och kräver två steg.
- [ ] Empty state:
  - [ ] Inga organisationer → CTA “Skapa organisation”.
  - [ ] Filtrerad tomlista → “Rensa filter”.
- [ ] Error state visar “Ladda om” och `router.refresh()` hämtar data igen.

## Data dependencies & gaps
- **Branding**: listan använder `tenants.logo_url`. Om branding bara finns i `tenant_branding` visas initialer. För full branding‑preview krävs antingen `logo_url` i `tenants` eller en join mot media‑tabellen.
- **Custom domain**: listan visar första `tenant_domains` med `kind=custom` och status `active/pending`. Om domäner saknas visas “Ingen domän”.
- **Billing**: status hämtas från `tenant_subscriptions.status` och/eller `tenants.subscription_status`. Stripe‑länk visas om `billing_accounts.provider_customer_id` finns.
- **Members count**: hämtas via `user_tenant_memberships(count)` i samma query.

## Optional follow‑ups
- Koppla domän‑status till exakta labels (ex. “Aktiv/Väntande/Avstängd”) via enum‑mapping.
- Lägg till explicit “Saknar språk”‑badge om `default_language` saknas för många tenants.
