# Personuppgiftsbiträdesavtal (PUB)
## Data Processing Agreement (DPA)

**Version:** 1.0  
**Datum:** 2026-01-13  
**Status:** Mall för signering

---

## Avtalsparter

### Personuppgiftsansvarig (Controller)

**Organisationsnamn:** ___________________________________  
**Organisationsnummer:** ___________________________________  
**Adress:** ___________________________________  
**Kontaktperson:** ___________________________________  
**E-post:** ___________________________________  

Nedan kallad "**Kunden**" eller "**Personuppgiftsansvarig**"

### Personuppgiftsbiträde (Processor)

**Lekbanken AS**  
**Organisationsnummer:** [ORG_NR]  
**Adress:** [ADDRESS]  
**Kontaktperson:** [NAME]  
**E-post:** privacy@lekbanken.no  

Nedan kallad "**Lekbanken**" eller "**Biträdet**"

---

## 1. Bakgrund och Ändamål

### 1.1 Bakgrund
Kunden har ingått ett huvudavtal med Lekbanken avseende tillhandahållande av SaaS-plattformen Lekbanken ("**Tjänsten**"). Som en del av Tjänsten kommer Lekbanken att behandla personuppgifter på Kundens vägnar.

### 1.2 Ändamål
Detta avtal reglerar Lekbankens behandling av personuppgifter i egenskap av personuppgiftsbiträde åt Kunden, i enlighet med EU:s dataskyddsförordning (GDPR) artikel 28.

### 1.3 Rangordning
Vid eventuell konflikt mellan detta avtal och huvudavtalet ska detta personuppgiftsbiträdesavtal ha företräde avseende frågor om behandling av personuppgifter.

---

## 2. Definitioner

**Personuppgifter:** All information som direkt eller indirekt kan identifiera en fysisk person.

**Behandling:** Varje åtgärd som utförs på personuppgifter, exempelvis insamling, registrering, lagring, bearbetning, överföring, radering.

**Registrerad:** Den fysiska person vars personuppgifter behandlas.

**Underbiträde:** Tredje part som Biträdet anlitar för att behandla personuppgifter på Kundens vägnar.

**Särskilda kategorier av personuppgifter:** Personuppgifter enligt GDPR artikel 9, inklusive religiös tillhörighet, hälsodata och biometriska uppgifter.

---

## 3. Behandlingens Art, Ändamål och Varaktighet

### 3.1 Behandlingens Art

Biträdet kommer att utföra följande typer av behandling:

| Behandlingsaktivitet | Beskrivning |
|---------------------|-------------|
| Insamling | Mottagning av personuppgifter från Kunden och registrerade |
| Lagring | Säker lagring i databas inom EU/EES |
| Bearbetning | Hantering för att tillhandahålla Tjänsten |
| Överföring | Kommunikation med registrerade (e-post) |
| Radering | Borttagning enligt Kundens instruktion |

### 3.2 Behandlingens Ändamål

Behandlingen sker uteslutande för att:
- Tillhandahålla SaaS-plattformen Lekbanken
- Möjliggöra användarhantering och autentisering
- Hantera organisationsmedlemskap och roller
- Möjliggöra aktivitetsplanering och genomförande
- Kommunicera med användare via e-post
- Hantera betalningar och fakturering

### 3.3 Varaktighet

Behandlingen pågår under hela avtalstiden och avslutas enligt avsnitt 12 (Avtalets upphörande).

---

## 4. Kategorier av Personuppgifter

### 4.1 Vanliga Personuppgifter

| Kategori | Exempel |
|----------|---------|
| Kontaktuppgifter | Namn, e-post, telefon |
| Kontoinformation | Användar-ID, lösenordshash, MFA-faktorer |
| Organisationsdata | Roller, medlemskap, behörigheter |
| Aktivitetsdata | Genomförda aktiviteter, poäng, prestationer |
| Teknisk data | IP-adress, webbläsare, sessionsdata |
| Betalningsdata | Faktureringsadress, betalningshistorik |

### 4.2 Särskilda Kategorier (GDPR Artikel 9)

**Viktigt:** Behandling av särskilda kategorier kräver uttryckligt samtycke från den registrerade.

| Kategori | Behandlas | Krav |
|----------|-----------|------|
| Religiös tillhörighet | ✅ Ja (för Svenska Kyrkan) | Explicit samtycke |
| Hälsodata | ❌ Nej | - |
| Biometriska uppgifter | ❌ Nej | - |
| Etniskt ursprung | ❌ Nej | - |

### 4.3 Personuppgifter om Barn

Behandling av barns personuppgifter (under 18 år) sker endast med vårdnadshavares samtycke enligt GDPR artikel 8.

---

## 5. Kategorier av Registrerade

| Kategori | Beskrivning |
|----------|-------------|
| Administratörer | Kundens organisationsadministratörer |
| Tränare/Ledare | Personal som hanterar aktiviteter |
| Deltagare | Individer som deltar i aktiviteter |
| Föräldrar/Vårdnadshavare | Vårdnadshavare för minderåriga |
| Organisationsmedlemmar | Övriga användare i Kundens organisation |

---

## 6. Biträdets Skyldigheter

### 6.1 Dokumenterade Instruktioner

Biträdet ska endast behandla personuppgifter enligt Kundens dokumenterade instruktioner, inklusive avseende överföringar till tredje land.

Om Biträdet enligt unionsrätt eller nationell rätt är skyldig att behandla utöver instruktioner ska Biträdet informera Kunden innan sådan behandling sker (om inte lag förbjuder detta).

### 6.2 Konfidentialitet

Biträdet ska säkerställa att alla personer som har behörighet att behandla personuppgifter:
- Har förbundit sig att iaktta konfidentialitet, eller
- Omfattas av en lämplig lagstadgad tystnadsplikt

### 6.3 Säkerhetsåtgärder

Biträdet ska implementera lämpliga tekniska och organisatoriska åtgärder för att säkerställa en säkerhetsnivå som är lämplig i förhållande till risken.

**Tekniska åtgärder:**

| Åtgärd | Implementation |
|--------|----------------|
| Kryptering vid lagring | AES-256 |
| Kryptering vid överföring | TLS 1.3 |
| Åtkomstkontroll | Row Level Security (RLS) |
| Multifaktorautentisering | TOTP för administratörer |
| Säkerhetskopiering | Daglig backup, 30 dagars PITR |
| Intrångsdetektering | Aktiv övervakning |

**Organisatoriska åtgärder:**

| Åtgärd | Implementation |
|--------|----------------|
| Åtkomstbegränsning | Need-to-know princip |
| Säkerhetsutbildning | Obligatorisk för all personal |
| Incidenthantering | Dokumenterad process |
| Säkerhetsrevisioner | Årliga granskningar |

### 6.4 Underbiträden

#### 6.4.1 Godkännande
Kunden ger härmed ett generellt godkännande för anlitande av underbiträden enligt den lista som bifogas (Bilaga A).

#### 6.4.2 Nya Underbiträden
Vid anlitande av nya underbiträden ska Biträdet:
1. Informera Kunden minst **30 dagar** i förväg
2. Ge Kunden möjlighet att invända
3. Säkerställa att underbiträdet omfattas av likvärdiga skyldigheter

#### 6.4.3 Invändning
Om Kunden invänder mot ett nytt underbiträde ska parterna i god anda försöka hitta en lösning. Om ingen lösning nås har Kunden rätt att säga upp avtalet.

### 6.5 Överföring till Tredje Land

All persondata lagras inom EU/EES. Om överföring till tredje land krävs ska detta ske med:
- Adekvat skyddsnivå (adequacy decision), eller
- Standard Contractual Clauses (SCC), eller
- Annan godkänd skyddsmekanism enligt GDPR kapitel V

### 6.6 Bistånd till Kunden

#### 6.6.1 Registrerades Rättigheter
Biträdet ska bistå Kunden med att fullgöra skyldigheten att svara på begäranden om utövande av den registrerades rättigheter:
- Rätt till tillgång (artikel 15)
- Rätt till rättelse (artikel 16)
- Rätt till radering (artikel 17)
- Rätt till begränsning (artikel 18)
- Rätt till dataportabilitet (artikel 20)
- Rätt att invända (artikel 21)

**Svarstid:** Biträdet ska svara på Kundens begäran inom **10 arbetsdagar**.

#### 6.6.2 Säkerhetsincidenter
Biträdet ska bistå Kunden med att fullgöra skyldigheter enligt GDPR artiklarna 32-36 avseende:
- Säkerhetsåtgärder
- Anmälan av personuppgiftsincidenter
- Konsekvensbedömningar
- Förhandssamråd med tillsynsmyndighet

### 6.7 Radering och Återlämnande

Vid avtalets upphörande ska Biträdet, efter Kundens val:
- **Radera** alla personuppgifter, eller
- **Återlämna** alla personuppgifter till Kunden

Kunden ska meddela sitt val inom **30 dagar** efter avtalets upphörande. Om inget val meddelas ska personuppgifterna raderas.

Undantag: Personuppgifter som måste bevaras enligt lag (t.ex. bokföringskrav).

### 6.8 Revisionsrätt

Kunden har rätt att genomföra revision av Biträdets efterlevnad av detta avtal:
- Med minst **30 dagars** skriftligt varsel
- Högst **en gång per år** (om inte incident föranleder ytterligare revision)
- Under ordinarie kontorstid
- På Kundens bekostnad

Biträdet ska tillhandahålla all nödvändig information och ge tillträde till lokaler och system.

Alternativt kan Biträdet tillhandahålla:
- Certifieringar (SOC 2, ISO 27001)
- Tredjepartsrevisioner
- Sammanfattningar av säkerhetsgranskningar

---

## 7. Personuppgiftsincidenter

### 7.1 Anmälan

Biträdet ska anmäla personuppgiftsincidenter till Kunden **utan onödigt dröjsmål**, och senast inom **24 timmar** efter upptäckt.

### 7.2 Information

Anmälan ska innehålla:
- Beskrivning av personuppgiftsincidentens art
- Kategorier och ungefärligt antal registrerade som berörs
- Kategorier och ungefärligt antal personuppgiftsposter som berörs
- Sannolika konsekvenser av incidenten
- Åtgärder som vidtagits eller föreslås för att hantera incidenten

### 7.3 Dokumentation

Biträdet ska dokumentera alla personuppgiftsincidenter, inklusive:
- Omständigheter kring incidenten
- Dess effekter
- Vidtagna åtgärder

---

## 8. Ansvar och Ersättning

### 8.1 Skadestånd
Vid brott mot GDPR eller detta avtal som orsakar skada för registrerade ansvarar parterna enligt GDPR artikel 82.

### 8.2 Ansvarsbegränsning
Biträdets totala ansvar under detta avtal begränsas till det belopp som framgår av huvudavtalet, dock lägst motsvarande **12 månaders avgifter**.

### 8.3 Undantag
Ansvarsbegränsningen gäller inte vid:
- Uppsåt eller grov vårdslöshet
- Brott mot konfidentialitetsåtaganden
- Skadestånd till registrerade enligt GDPR artikel 82

---

## 9. Avtalstid och Uppsägning

### 9.1 Avtalstid
Detta avtal träder i kraft vid undertecknande och gäller så länge huvudavtalet är i kraft.

### 9.2 Uppsägning
Vid uppsägning av huvudavtalet upphör även detta avtal. Bestämmelserna om radering/återlämnande (avsnitt 6.7) och konfidentialitet fortsätter att gälla.

---

## 10. Tillämplig Lag och Tvistelösning

### 10.1 Tillämplig Lag
Detta avtal lyder under **svensk lag**.

### 10.2 Tvistelösning
Tvister som uppstår i anledning av detta avtal ska i första hand lösas genom förhandling. Om parterna inte kan enas ska tvisten avgöras av **svensk allmän domstol** med **Stockholms tingsrätt** som första instans.

---

## 11. Ändringar

Ändringar av detta avtal ska ske skriftligen och undertecknas av båda parter. Biträdet har rätt att uppdatera bilagor (t.ex. underbiträdeslista) med 30 dagars varsel.

---

## 12. Bilagor

- **Bilaga A:** Förteckning över underbiträden
- **Bilaga B:** Tekniska och organisatoriska säkerhetsåtgärder
- **Bilaga C:** Kundens instruktioner för behandling

---

## Underskrifter

### Personuppgiftsansvarig (Kunden)

**Namn:** ___________________________________

**Titel:** ___________________________________

**Datum:** ___________________________________

**Underskrift:** ___________________________________

---

### Personuppgiftsbiträde (Lekbanken AS)

**Namn:** ___________________________________

**Titel:** ___________________________________

**Datum:** ___________________________________

**Underskrift:** ___________________________________

---

# Bilaga A: Förteckning över Underbiträden

| Underbiträde | Tjänst | Plats | DPA | Skyddsmekanism |
|--------------|--------|-------|-----|----------------|
| Supabase Inc. | Databas, Auth, Storage | EU (Frankfurt) | ✅ | SCC |
| Vercel Inc. | Hosting, CDN | EU (Stockholm) | ✅ | SCC |
| Stripe Payments Europe Ltd. | Betalningshantering | EU (Ireland) | ✅ | SCC |
| Resend Inc. | E-postleverans | EU/US | ✅ | SCC |

**Senast uppdaterad:** 2026-01-13

---

# Bilaga B: Tekniska och Organisatoriska Säkerhetsåtgärder

## 1. Kryptering

| Typ | Standard | Implementation |
|-----|----------|----------------|
| Data at rest | AES-256 | Supabase managed encryption |
| Data in transit | TLS 1.3 | All API communication |
| Backup encryption | AES-256 | Encrypted backups |

## 2. Åtkomstkontroll

| Kontroll | Implementation |
|----------|----------------|
| Row Level Security | 100% av databastabeller |
| Role-based access | tenant_role_enum (owner, admin, coach, participant) |
| MFA | TOTP för privilegierade roller |
| Session management | Automatisk timeout, device tracking |

## 3. Loggning och Övervakning

| Funktion | Implementation |
|----------|----------------|
| Access logging | Alla dataåtkomster loggas |
| Audit trails | tenant_audit_logs, user_audit_logs |
| Security monitoring | Real-time alerts |
| Error tracking | Centraliserad felhantering |

## 4. Backup och Återställning

| Parameter | Värde |
|-----------|-------|
| Backup frequency | Kontinuerlig (PITR) |
| Retention | 30 dagar |
| RTO | 4 timmar |
| RPO | 1 timme |
| Testing | Kvartalsvis |

## 5. Incidenthantering

| Fas | Åtgärd |
|-----|--------|
| Upptäckt | Automatisk och manuell övervakning |
| Anmälan | Inom 24 timmar till kund |
| Åtgärd | Dokumenterad eskaleringsprocess |
| Uppföljning | Post-mortem och förebyggande åtgärder |

---

# Bilaga C: Instruktioner för Behandling

## 1. Allmänna Instruktioner

Biträdet ska behandla personuppgifter endast för att:
1. Tillhandahålla den avtalade Tjänsten
2. Svara på support-ärenden
3. Fullgöra legala skyldigheter
4. Verkställa Kundens specifika instruktioner

## 2. Specifika Instruktioner

### 2.1 Registerutdrag (GDPR Art. 15)
Vid begäran ska Biträdet:
- Sammanställa all data om den registrerade
- Leverera i strukturerat format (JSON)
- Inom 10 arbetsdagar

### 2.2 Radering (GDPR Art. 17)
Vid begäran ska Biträdet:
- Radera personuppgifter från aktiva system
- Anonymisera data i backups vid nästa rotation
- Bekräfta radering skriftligen

### 2.3 Dataportering (GDPR Art. 20)
Vid begäran ska Biträdet:
- Exportera data i maskinläsbart format (JSON)
- Leverera till Kunden eller annan mottagare
- Inom 10 arbetsdagar

## 3. Kontaktpunkter

**Kundens kontaktperson för dataskydd:**
___________________________________

**Biträdets kontaktperson för dataskydd:**
privacy@lekbanken.no

---

*Dokumentet genererat 2026-01-13 för Svenska Kyrkan Enterprise Compliance*
