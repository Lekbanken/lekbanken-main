-- Legal & Data Handling Phase 1
-- Generated from messages/{sv,no,en}.json

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','tenant')),
  tenant_id uuid NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('terms','privacy','org_terms','dpa','cookie_policy')),
  locale text NOT NULL CHECK (locale IN ('no','sv','en')),
  title text NOT NULL,
  content_markdown text NOT NULL,
  version_int int NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  requires_acceptance boolean NOT NULL DEFAULT true,
  change_summary text NOT NULL,
  previous_version_id uuid NULL REFERENCES public.legal_documents(id),
  created_by uuid NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  CONSTRAINT legal_documents_scope_tenant_check CHECK (
    (scope = 'global' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_unique_version ON public.legal_documents (
  type,
  locale,
  scope,
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
  version_int
);

CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_unique_active ON public.legal_documents (
  type,
  locale,
  scope,
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid)
) WHERE is_active;

CREATE INDEX IF NOT EXISTS idx_legal_documents_active ON public.legal_documents (type, locale) WHERE is_active;

CREATE TABLE IF NOT EXISTS public.user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  tenant_id_snapshot uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  accepted_locale text NOT NULL CHECK (accepted_locale IN ('no','sv','en')),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text NULL,
  user_agent text NULL,
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user ON public.user_legal_acceptances (user_id);
CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_document ON public.user_legal_acceptances (document_id);
CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_created ON public.user_legal_acceptances (accepted_at);

CREATE TABLE IF NOT EXISTS public.cookie_catalog (
  key text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('necessary','functional','analytics','marketing')),
  purpose text NOT NULL,
  provider text NULL,
  ttl_days int NULL,
  default_on boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cookie_key text NOT NULL REFERENCES public.cookie_catalog(key) ON DELETE CASCADE,
  consent boolean NOT NULL,
  given_at timestamptz NOT NULL DEFAULT now(),
  schema_version int NOT NULL,
  source text NOT NULL CHECK (source IN ('banner','settings')),
  tenant_id_snapshot uuid NULL REFERENCES public.tenants(id) ON DELETE SET NULL,
  UNIQUE(user_id, cookie_key, schema_version)
);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user ON public.cookie_consents (user_id, schema_version);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_cookie ON public.cookie_consents (cookie_key);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_documents_public_select ON public.legal_documents;
CREATE POLICY legal_documents_public_select ON public.legal_documents
  FOR SELECT TO authenticated, anon
  USING (is_active = true AND scope = 'global');

DROP POLICY IF EXISTS legal_documents_system_admin_all ON public.legal_documents;
CREATE POLICY legal_documents_system_admin_all ON public.legal_documents
  FOR ALL USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS legal_documents_tenant_admin_select ON public.legal_documents;
CREATE POLICY legal_documents_tenant_admin_select ON public.legal_documents
  FOR SELECT USING (
    scope = 'tenant' AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS legal_documents_tenant_admin_insert ON public.legal_documents;
CREATE POLICY legal_documents_tenant_admin_insert ON public.legal_documents
  FOR INSERT WITH CHECK (
    scope = 'tenant' AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS legal_documents_tenant_admin_update ON public.legal_documents;
CREATE POLICY legal_documents_tenant_admin_update ON public.legal_documents
  FOR UPDATE USING (
    scope = 'tenant' AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  ) WITH CHECK (
    scope = 'tenant' AND tenant_id IS NOT NULL
    AND public.has_tenant_role(tenant_id, ARRAY['owner','admin']::public.tenant_role_enum[])
  );

DROP POLICY IF EXISTS user_legal_acceptances_select ON public.user_legal_acceptances;
CREATE POLICY user_legal_acceptances_select ON public.user_legal_acceptances
  FOR SELECT USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_legal_acceptances_insert ON public.user_legal_acceptances;
CREATE POLICY user_legal_acceptances_insert ON public.user_legal_acceptances
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cookie_catalog_public_select ON public.cookie_catalog;
CREATE POLICY cookie_catalog_public_select ON public.cookie_catalog
  FOR SELECT USING (true);

DROP POLICY IF EXISTS cookie_catalog_system_admin_all ON public.cookie_catalog;
CREATE POLICY cookie_catalog_system_admin_all ON public.cookie_catalog
  FOR ALL USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS cookie_consents_select ON public.cookie_consents;
CREATE POLICY cookie_consents_select ON public.cookie_consents
  FOR SELECT USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS cookie_consents_insert ON public.cookie_consents;
CREATE POLICY cookie_consents_insert ON public.cookie_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cookie_consents_update ON public.cookie_consents;
CREATE POLICY cookie_consents_update ON public.cookie_consents
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO public.cookie_catalog (key, category, purpose, provider, ttl_days, default_on)
VALUES
  ('necessary', 'necessary', 'Essential cookies required for core functionality.', null, null, true),
  ('functional', 'functional', 'Preferences and enhanced features.', null, null, false),
  ('analytics', 'analytics', 'Anonymous usage analytics.', null, null, false),
  ('marketing', 'marketing', 'Marketing and advertising tracking.', null, null, false)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.legal_documents (scope, tenant_id, type, locale, title, content_markdown, version_int, is_active, requires_acceptance, change_summary, previous_version_id, created_by, created_at, published_at)
VALUES
  ('global', NULL, 'terms', 'sv', 'Användarvillkor', $$
## 1. Introduktion
Välkommen till Lekbanken! Dessa användarvillkor ("Villkoren") reglerar din användning av Lekbanken-plattformen och våra tjänster. Genom att använda våra tjänster godkänner du dessa villkor.

## 2. Användning av tjänsten
### 2.1 Behörighet
För att använda Lekbanken måste du vara minst 18 år gammal eller ha tillstånd från vårdnadshavare. Om du använder tjänsten på uppdrag av en organisation, garanterar du att du har behörighet att ingå detta avtal för organisationens räkning.

### 2.2 Kontosäkerhet
Du är ansvarig för att hålla dina inloggningsuppgifter säkra och för all aktivitet som sker under ditt konto. Du måste omedelbart meddela oss om du upptäcker obehörig användning av ditt konto.

### 2.3 Accepterad användning
Du samtycker till att inte:
- Använda tjänsten för olagliga ändamål
- Försöka få obehörig åtkomst till systemet
- Ladda upp skadligt innehåll eller virus
- Trakassera, hota eller förolämpa andra användare
- Överföra spam eller oönskad kommunikation
- Bryta mot andras immateriella rättigheter

## 3. Innehåll och immateriella rättigheter
### 3.1 Ditt innehåll
Du behåller äganderätten till allt innehåll du laddar upp till Lekbanken. Genom att ladda upp innehåll ger du oss en icke-exklusiv licens att använda, visa och distribuera ditt innehåll för att tillhandahålla tjänsten.

### 3.2 Vårt innehåll
All programvara, design, text, grafik och annat material som tillhandahålls av Lekbanken skyddas av upphovsrätt och andra immateriella rättigheter. Du får inte kopiera, modifiera eller distribuera vårt innehåll utan skriftligt tillstånd.

## 4. Betalning och prenumerationer
### 4.1 Avgifter
Vissa funktioner i Lekbanken kräver en betald prenumeration. Alla priser anges på vår prissättningssida och inkluderar tillämplig moms.

### 4.2 Fakturering
Prenumerationsavgifter debiteras automatiskt vid början av varje faktureringsperiod. Du är ansvarig för att tillhandahålla giltiga betalningsuppgifter.

### 4.3 Återbetalning
Återbetalningar hanteras i enlighet med vår återbetalningspolicy. Kontakta vår support för att diskutera återbetalning inom 14 dagar från köpdatum.

## 5. Uppsägning
Du kan när som helst avsluta ditt konto genom att kontakta vår support. Vi förbehåller oss rätten att stänga av eller avsluta konton som bryter mot dessa villkor.

## 6. Ansvarsbegränsning
Lekbanken tillhandahålls "i befintligt skick" utan garantier av något slag. Vi ansvarar inte för indirekta skador, förlorad vinst eller dataförlust som uppstår från användningen av våra tjänster.

## 7. Ändringar av villkoren
Vi kan uppdatera dessa villkor från tid till annan. Vi kommer att meddela dig om väsentliga ändringar via e-post eller genom ett meddelande i tjänsten. Din fortsatta användning av tjänsten efter ändringar utgör ditt godkännande av de nya villkoren.

## 8. Tillämplig lag
Dessa villkor regleras av norsk lag. Eventuella tvister ska lösas i norska domstolar.

## 9. Kontaktinformation
Om du har frågor om dessa användarvillkor, vänligen kontakta oss:
- E-post: legal@lekbanken.no
- Adress: Lekbanken AS, Oslo, Norge

Genom att använda Lekbanken godkänner du dessa användarvillkor och vår
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now()),
  ('global', NULL, 'privacy', 'sv', 'Integritetspolicy', $$
## 1. Introduktion
På Lekbanken värnar vi om din integritet. Denna integritetspolicy förklarar hur vi samlar in, använder, lagrar och skyddar dina personuppgifter när du använder våra tjänster.
Vi följer Dataskyddsförordningen (GDPR) och norsk dataskyddslagstiftning.

## 2. Personuppgifter vi samlar in
### 2.1 Information du tillhandahåller
- Kontoinformation: Namn, e-postadress, lösenord (krypterat)
- Profilinformation: Profilbild, biografi, preferenser
- Organisationsinformation: Organisationsnamn, kontaktuppgifter
- Betalningsinformation: Faktureringsadress (betalningsuppgifter hanteras av Stripe)

### 2.2 Information vi samlar in automatiskt
- Användningsdata: Sidvisningar, funktionsanvändning, sessionstid
- Enhetsinformation: Enhetstyp, webbläsare, operativsystem
- Loggdata: IP-adress, datum och tid för åtkomst, felloggar
- Cookies: Se vår cookiepolicy nedan

## 3. Hur vi använder dina uppgifter
Vi använder dina personuppgifter för att:
- Tillhandahålla och förbättra våra tjänster
- Hantera ditt konto och autentisering
- Bearbeta betalningar och fakturor
- Skicka tjänstemeddelanden och uppdateringar
- Ge kundsupport
- Analysera användning och optimera användarupplevelsen
- Upptäcka och förhindra bedrägerier eller säkerhetsincidenter
- Följa juridiska krav

## 4. Rättslig grund för behandling
Vi behandlar dina personuppgifter baserat på:
- Avtal: För att fullgöra vårt avtal med dig (tjänsteleverans)
- Samtycke: När du har gett explicit samtycke (t.ex. marknadsföring)
- Berättigat intresse: För att förbättra tjänsten och förhindra missbruk
- Juridisk skyldighet: För att följa lagar och förordningar

## 5. Delning av personuppgifter
Vi delar dina uppgifter endast med:

### 5.1 Tjänsteleverantörer
- Supabase: Databashosting och autentisering
- Vercel: Webbhosting och CDN
- Stripe: Betalningshantering

### 5.2 Juridiska krav
Vi kan dela uppgifter om det krävs enligt lag, domstolsbeslut eller myndighetsbegäran.

### 5.3 Företagsöverlåtelser
Vid fusion, förvärv eller försäljning kan dina uppgifter överföras till den nya ägaren.

## 6. Lagring och säkerhet
### 6.1 Var lagras data?
Dina personuppgifter lagras i Europa (via Supabase EU-region) för att följa GDPR-krav.

### 6.2 Hur länge lagras data?
- Aktiva konton: Så länge ditt konto är aktivt
- Avslutade konton: 30 dagar efter avslutning (backup-syfte)
- Loggar: 90 dagar
- Fakturor: 7 år (bokföringskrav)

### 6.3 Säkerhetsåtgärder
- HTTPS-kryptering för all datatransmission
- Krypterade lösenord (bcrypt)
- Row-Level Security (RLS) i databasen
- Regelbundna säkerhetsupdateringar
- Åtkomstkontroll och auditloggar

## 7. Dina rättigheter
Enligt GDPR har du rätt att:
- Tillgång: Få en kopia av dina personuppgifter
- Rättelse: Korrigera felaktiga uppgifter
- Radering: Begära att vi raderar dina uppgifter ("rätten att bli glömd")
- Dataportabilitet: Få dina uppgifter i strukturerat format
- Invändning: Motsätta dig viss behandling
- Begränsa behandling: Begära begränsad behandling
- Återkalla samtycke: Dra tillbaka samtycke när som helst

För att utöva dessa rättigheter, kontakta oss på

## 8. Cookies
Vi använder cookies för att:
- Nödvändiga cookies: Autentisering, sessionhantering
- Funktionella cookies: Språkval, preferenser
- Analytiska cookies: Användningsstatistik (anonymiserad)
Du kan hantera cookies i dina webbläsarinställningar. Observera att vissa funktioner kanske inte fungerar korrekt om du blockerar cookies.

## 9. Barn
Lekbanken är inte avsett för barn under 13 år. Vi samlar inte medvetet in personuppgifter från barn. Om du är vårdnadshavare och upptäcker att ditt barn har lämnat personuppgifter, kontakta oss så raderar vi informationen.

## 10. Ändringar av integritetspolicyn
Vi kan uppdatera denna policy från tid till annan. Vi kommer att meddela dig om väsentliga ändringar via e-post eller genom ett meddelande i tjänsten.

## 11. Kontaktinformation
Om du har frågor om denna integritetspolicy eller hur vi hanterar dina personuppgifter:
- E-post: privacy@lekbanken.no
- Adress: Lekbanken AS, Oslo, Norge
- Dataskyddsombud: dpo@lekbanken.no

## 12. Klagomål
Om du är missnöjd med hur vi hanterar dina personuppgifter har du rätt att lämna in ett klagomål till Datatilsynet (Norges dataskyddsmyndighet):
- Webbplats:
- E-post: postkasse@datatilsynet.no

Genom att använda Lekbanken godkänner du denna integritetspolicy och våra
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.legal_documents (scope, tenant_id, type, locale, title, content_markdown, version_int, is_active, requires_acceptance, change_summary, previous_version_id, created_by, created_at, published_at)
VALUES
  ('global', NULL, 'terms', 'no', 'Brukervilkår', $$
## 1. Introduksjon
Velkommen til Lekbanken! Disse brukervilkårene ("Vilkårene") regulerer din bruk av Lekbanken-plattformen og våre tjenester. Ved å bruke våre tjenester godtar du disse vilkårene.

## 2. Bruk av tjenesten
### 2.1 Kvalifikasjon
For å bruke Lekbanken må du være minst 18 år eller ha tillatelse fra foresatte. Hvis du bruker tjenesten på vegne av en organisasjon, garanterer du at du har myndighet til å inngå denne avtalen på vegne av organisasjonen.

### 2.2 Kontosikkerhet
Du er ansvarlig for å holde påloggingsinformasjonen din sikker og for all aktivitet som skjer under kontoen din. Du må umiddelbart varsle oss hvis du oppdager uautorisert bruk av kontoen din.

### 2.3 Akseptabel bruk
Du samtykker til å ikke:
- Bruke tjenesten til ulovlige formål
- Forsøke å få uautorisert tilgang til systemet
- Laste opp skadelig innhold eller virus
- Trakassere, true eller fornærme andre brukere
- Overføre spam eller uønsket kommunikasjon
- Krenke andres immaterielle rettigheter

## 3. Innhold og immaterielle rettigheter
### 3.1 Ditt innhold
Du beholder eierskapet til alt innhold du laster opp til Lekbanken. Ved å laste opp innhold gir du oss en ikke-eksklusiv lisens til å bruke, vise og distribuere innholdet ditt for å levere tjenesten.

### 3.2 Vårt innhold
All programvare, design, tekst, grafikk og annet materiale levert av Lekbanken er beskyttet av opphavsrett og andre immaterielle rettigheter. Du kan ikke kopiere, modifisere eller distribuere vårt innhold uten skriftlig tillatelse.

## 4. Betaling og abonnementer
### 4.1 Avgifter
Noen funksjoner i Lekbanken krever et betalt abonnement. Alle priser er oppført på vår prisside og inkluderer gjeldende mva.

### 4.2 Fakturering
Abonnementsavgifter belastes automatisk ved starten av hver faktureringsperiode. Du er ansvarlig for å oppgi gyldig betalingsinformasjon.

### 4.3 Refusjoner
Refusjoner håndteres i samsvar med vår refusjonspolicy. Kontakt vår support for å diskutere refusjon innen 14 dager fra kjøpsdato.

## 5. Oppsigelse
Du kan når som helst avslutte kontoen din ved å kontakte vår support. Vi forbeholder oss retten til å suspendere eller avslutte kontoer som bryter disse vilkårene.

## 6. Ansvarsbegrensning
Lekbanken leveres "som den er" uten garantier av noe slag. Vi er ikke ansvarlige for indirekte skader, tapt fortjeneste eller datatap som oppstår fra bruk av våre tjenester.

## 7. Endringer i vilkårene
Vi kan oppdatere disse vilkårene fra tid til annen. Vi vil varsle deg om vesentlige endringer via e-post eller gjennom en melding i tjenesten. Din fortsatte bruk av tjenesten etter endringer utgjør din aksept av de nye vilkårene.

## 8. Gjeldende lov
Disse vilkårene reguleres av norsk lov. Eventuelle tvister skal løses i norske domstoler.

## 9. Kontaktinformasjon
Hvis du har spørsmål om disse brukervilkårene, vennligst kontakt oss:
- E-post: legal@lekbanken.no
- Adresse: Lekbanken AS, Oslo, Norge

Ved å bruke Lekbanken godtar du disse brukervilkårene og vår
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now()),
  ('global', NULL, 'privacy', 'no', 'Personvernerklæring', $$
## 1. Introduksjon
Hos Lekbanken bryr vi oss om ditt personvern. Denne personvernerklæringen forklarer hvordan vi samler inn, bruker, lagrer og beskytter dine personopplysninger når du bruker våre tjenester.
Vi følger Personvernforordningen (GDPR) og norsk personvernlovgivning.

## 2. Personopplysninger vi samler inn
### 2.1 Informasjon du oppgir
- Kontoinformasjon: Navn, e-postadresse, passord (kryptert)
- Profilinformasjon: Profilbilde, biografi, preferanser
- Organisasjonsinformasjon: Organisasjonsnavn, kontaktdetaljer
- Betalingsinformasjon: Faktureringsadresse (betalingsdetaljer håndteres av Stripe)

### 2.2 Informasjon vi samler inn automatisk
- Bruksdata: Sidevisninger, funksjonsbruk, sesjonsvarighet
- Enhetsinformasjon: Enhetstype, nettleser, operativsystem
- Loggdata: IP-adresse, dato og tidspunkt for tilgang, feillogger
- Informasjonskapsler: Se vår informasjonskapselpolicy nedenfor

## 3. Hvordan vi bruker dine opplysninger
Vi bruker dine personopplysninger til å:
- Levere og forbedre våre tjenester
- Administrere din konto og autentisering
- Behandle betalinger og fakturaer
- Sende servicemeldinger og oppdateringer
- Gi kundestøtte
- Analysere bruk og optimalisere brukeropplevelsen
- Oppdage og forhindre svindel eller sikkerhetshendelser
- Overholde juridiske krav

## 4. Rettslig grunnlag for behandling
Vi behandler dine personopplysninger basert på:
- Avtale: For å oppfylle vår avtale med deg (tjenesteleveranse)
- Samtykke: Når du har gitt eksplisitt samtykke (f.eks. markedsføring)
- Berettiget interesse: For å forbedre tjenesten og forhindre misbruk
- Juridisk forpliktelse: For å overholde lover og forskrifter

## 5. Deling av personopplysninger
Vi deler dine opplysninger kun med:

### 5.1 Tjenesteleverandører
- Supabase: Databasehosting og autentisering
- Vercel: Webhosting og CDN
- Stripe: Betalingshåndtering

### 5.2 Juridiske krav
Vi kan dele opplysninger hvis det kreves ved lov, rettskjennelse eller myndighetsforespørsel.

### 5.3 Virksomhetsoverdragelser
Ved fusjon, oppkjøp eller salg kan dine opplysninger overføres til den nye eieren.

## 6. Lagring og sikkerhet
### 6.1 Hvor lagres data?
Dine personopplysninger lagres i Europa (via Supabase EU-region) for å overholde GDPR-krav.

### 6.2 Hvor lenge lagres data?
- Aktive kontoer: Så lenge kontoen din er aktiv
- Avsluttede kontoer: 30 dager etter avslutning (for sikkerhetskopi)
- Logger: 90 dager
- Fakturaer: 7 år (regnskapskrav)

### 6.3 Sikkerhetstiltak
- HTTPS-kryptering for all dataoverføring
- Krypterte passord (bcrypt)
- Row-Level Security (RLS) i databasen
- Regelmessige sikkerhetsoppdateringer
- Tilgangskontroll og revisjonslogger

## 7. Dine rettigheter
I henhold til GDPR har du rett til:
- Innsyn: Få en kopi av dine personopplysninger
- Retting: Korrigere unøyaktige opplysninger
- Sletting: Be om at vi sletter dine opplysninger ("retten til å bli glemt")
- Dataportabilitet: Motta dine opplysninger i et strukturert format
- Innsigelse: Motsette deg viss behandling
- Begrensning: Be om begrenset behandling
- Trekke samtykke: Trekke tilbake samtykke når som helst

For å utøve disse rettighetene, kontakt oss på

## 8. Informasjonskapsler
Vi bruker informasjonskapsler for å:
- Nødvendige informasjonskapsler: Autentisering, sesjonshåndtering
- Funksjonelle informasjonskapsler: Språkvalg, preferanser
- Analytiske informasjonskapsler: Bruksstatistikk (anonymisert)
Du kan administrere informasjonskapsler i nettleserinnstillingene. Merk at noen funksjoner kanskje ikke fungerer riktig hvis du blokkerer informasjonskapsler.

## 9. Barn
Lekbanken er ikke beregnet for barn under 13 år. Vi samler ikke bevisst inn personopplysninger fra barn. Hvis du er foresatt og oppdager at barnet ditt har oppgitt personopplysninger, kontakt oss så sletter vi informasjonen.

## 10. Endringer i personvernerklæringen
Vi kan oppdatere denne policyen fra tid til annen. Vi vil varsle deg om vesentlige endringer via e-post eller gjennom en melding i tjenesten.

## 11. Kontaktinformasjon
Hvis du har spørsmål om denne personvernerklæringen eller hvordan vi håndterer dine personopplysninger:
- E-post: privacy@lekbanken.no
- Adresse: Lekbanken AS, Oslo, Norge
- Personvernombud: dpo@lekbanken.no

## 12. Klager
Hvis du er misfornøyd med hvordan vi håndterer dine personopplysninger, har du rett til å sende inn en klage til Datatilsynet:
- Nettsted:
- E-post: postkasse@datatilsynet.no

Ved å bruke Lekbanken godtar du denne personvernerklæringen og våre
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now())
ON CONFLICT DO NOTHING;

INSERT INTO public.legal_documents (scope, tenant_id, type, locale, title, content_markdown, version_int, is_active, requires_acceptance, change_summary, previous_version_id, created_by, created_at, published_at)
VALUES
  ('global', NULL, 'terms', 'en', 'Terms of Service', $$
## 1. Introduction
Welcome to Lekbanken! These terms of service ("Terms") govern your use of the Lekbanken platform and our services. By using our services, you agree to these terms.

## 2. Use of the Service
### 2.1 Eligibility
To use Lekbanken, you must be at least 18 years old or have permission from a guardian. If you use the service on behalf of an organization, you warrant that you have authority to enter into this agreement on behalf of the organization.

### 2.2 Account Security
You are responsible for keeping your login credentials secure and for all activity that occurs under your account. You must immediately notify us if you discover unauthorized use of your account.

### 2.3 Acceptable Use
You agree not to:
- Use the service for illegal purposes
- Attempt to gain unauthorized access to the system
- Upload harmful content or viruses
- Harass, threaten or insult other users
- Transmit spam or unsolicited communications
- Violate others' intellectual property rights

## 3. Content and Intellectual Property
### 3.1 Your Content
You retain ownership of all content you upload to Lekbanken. By uploading content, you grant us a non-exclusive license to use, display and distribute your content to provide the service.

### 3.2 Our Content
All software, design, text, graphics and other material provided by Lekbanken is protected by copyright and other intellectual property rights. You may not copy, modify or distribute our content without written permission.

## 4. Payment and Subscriptions
### 4.1 Fees
Some features of Lekbanken require a paid subscription. All prices are listed on our pricing page and include applicable VAT.

### 4.2 Billing
Subscription fees are charged automatically at the beginning of each billing period. You are responsible for providing valid payment information.

### 4.3 Refunds
Refunds are handled in accordance with our refund policy. Contact our support to discuss refunds within 14 days of purchase.

## 5. Termination
You may cancel your account at any time by contacting our support. We reserve the right to suspend or terminate accounts that violate these terms.

## 6. Limitation of Liability
Lekbanken is provided "as is" without warranties of any kind. We are not liable for indirect damages, lost profits or data loss arising from use of our services.

## 7. Changes to Terms
We may update these terms from time to time. We will notify you of significant changes via email or through a notice in the service. Your continued use of the service after changes constitutes your acceptance of the new terms.

## 8. Applicable Law
These terms are governed by Norwegian law. Any disputes shall be resolved in Norwegian courts.

## 9. Contact Information
If you have questions about these terms of service, please contact us:
- Email: legal@lekbanken.no
- Address: Lekbanken AS, Oslo, Norway

By using Lekbanken, you agree to these terms of service and our
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now()),
  ('global', NULL, 'privacy', 'en', 'Privacy Policy', $$
## 1. Introduction
At Lekbanken, we care about your privacy. This privacy policy explains how we collect, use, store and protect your personal data when you use our services.
We comply with the General Data Protection Regulation (GDPR) and Norwegian data protection legislation.

## 2. Personal Data We Collect
### 2.1 Information You Provide
- Account Information: Name, email address, password (encrypted)
- Profile Information: Profile picture, biography, preferences
- Organization Information: Organization name, contact details
- Payment Information: Billing address (payment details are handled by Stripe)

### 2.2 Information We Collect Automatically
- Usage Data: Page views, feature usage, session duration
- Device Information: Device type, browser, operating system
- Log Data: IP address, date and time of access, error logs
- Cookies: See our cookie policy below

## 3. How We Use Your Data
We use your personal data to:
- Provide and improve our services
- Manage your account and authentication
- Process payments and invoices
- Send service messages and updates
- Provide customer support
- Analyze usage and optimize user experience
- Detect and prevent fraud or security incidents
- Comply with legal requirements

## 4. Legal Basis for Processing
We process your personal data based on:
- Contract: To fulfill our agreement with you (service delivery)
- Consent: When you have given explicit consent (e.g., marketing)
- Legitimate Interest: To improve the service and prevent abuse
- Legal Obligation: To comply with laws and regulations

## 5. Sharing of Personal Data
We only share your data with:

### 5.1 Service Providers
- Supabase: Database hosting and authentication
- Vercel: Web hosting and CDN
- Stripe: Payment processing

### 5.2 Legal Requirements
We may share data if required by law, court order or government request.

### 5.3 Business Transfers
In case of merger, acquisition or sale, your data may be transferred to the new owner.

## 6. Storage and Security
### 6.1 Where is Data Stored?
Your personal data is stored in Europe (via Supabase EU region) to comply with GDPR requirements.

### 6.2 How Long is Data Stored?
- Active Accounts: As long as your account is active
- Closed Accounts: 30 days after closure (for backup purposes)
- Logs: 90 days
- Invoices: 7 years (accounting requirements)

### 6.3 Security Measures
- HTTPS encryption for all data transmission
- Encrypted passwords (bcrypt)
- Row-Level Security (RLS) in the database
- Regular security updates
- Access control and audit logs

## 7. Your Rights
Under GDPR, you have the right to:
- Access: Obtain a copy of your personal data
- Rectification: Correct inaccurate data
- Erasure: Request deletion of your data ("right to be forgotten")
- Data Portability: Receive your data in a structured format
- Objection: Object to certain processing
- Restriction: Request limited processing
- Withdraw Consent: Withdraw consent at any time

To exercise these rights, contact us at

## 8. Cookies
We use cookies for:
- Necessary Cookies: Authentication, session management
- Functional Cookies: Language selection, preferences
- Analytical Cookies: Usage statistics (anonymized)
You can manage cookies in your browser settings. Note that some features may not work properly if you block cookies.

## 9. Children
Lekbanken is not intended for children under 13 years of age. We do not knowingly collect personal data from children. If you are a guardian and discover that your child has provided personal data, contact us and we will delete the information.

## 10. Changes to Privacy Policy
We may update this policy from time to time. We will notify you of significant changes via email or through a notice in the service.

## 11. Contact Information
If you have questions about this privacy policy or how we handle your personal data:
- Email: privacy@lekbanken.no
- Address: Lekbanken AS, Oslo, Norway
- Data Protection Officer: dpo@lekbanken.no

## 12. Complaints
If you are dissatisfied with how we handle your personal data, you have the right to file a complaint with Datatilsynet (Norway's data protection authority):
- Website:
- Email: postkasse@datatilsynet.no

By using Lekbanken, you agree to this privacy policy and our
$$, 1, true, true, 'Initial legal baseline import', NULL, NULL, now(), now())
ON CONFLICT DO NOTHING;
