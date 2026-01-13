# Svenska Kyrkan Onboarding Guide

**Version:** 1.0  
**Datum:** 2026-01-13  
**Målgrupp:** Svenska Kyrkan IT-ansvariga och beslutfattare

---

## 📋 Snabbstart

### Steg 1: Due Diligence Checklista
✅ [Komplett checklista längre ner](#due-diligence-checklista)

### Steg 2: Signera avtal
1. Huvudavtal (prenumeration)
2. Personuppgiftsbiträdesavtal (PUB/DPA)
3. SLA-bilaga

### Steg 3: Teknisk setup
1. Skapa organisation i Lekbanken
2. Konfigurera SSO (valfritt)
3. Bjud in administratörer
4. Aktivera MFA för alla admins

---

## 🔐 Säkerhetsöversikt

### Datasäkerhet

| Funktion | Status | Beskrivning |
|----------|--------|-------------|
| **Kryptering at rest** | ✅ | AES-256 för all lagrad data |
| **Kryptering in transit** | ✅ | TLS 1.3 för all kommunikation |
| **Row Level Security** | ✅ | 167/167 tabeller (100%) |
| **Tenant isolation** | ✅ | Komplett isolering mellan organisationer |
| **MFA** | ✅ | TOTP tillgängligt för alla användare |
| **Audit logging** | ✅ | Fullständig loggning av administrativa åtgärder |

### GDPR-efterlevnad

| Rättighet | Status | Implementation |
|-----------|--------|----------------|
| **Rätt till tillgång (Art. 15)** | ✅ | Självbetjäning: data export |
| **Rätt till rättelse (Art. 16)** | ✅ | Användare kan uppdatera profil |
| **Rätt till radering (Art. 17)** | ✅ | Självbetjäning: kontoradering |
| **Rätt till begränsning (Art. 18)** | ✅ | Via support |
| **Rätt till dataportabilitet (Art. 20)** | ✅ | JSON-export |
| **Rätt att invända (Art. 21)** | ✅ | Via support |
| **Samtycke (Art. 7)** | ✅ | Granulär consent management |
| **Barn (Art. 8)** | ✅ | Föräldrasamtycke under 18 år |
| **Särskilda kategorier (Art. 9)** | ✅ | Explicit samtycke för religiös data |

### Dataplacering

| Komponent | Plats | Leverantör |
|-----------|-------|------------|
| **Databas** | EU (Frankfurt) | Supabase |
| **Fillagring** | EU (Frankfurt) | Supabase |
| **Hosting** | EU (Stockholm) | Vercel |
| **Betalningar** | EU (Ireland) | Stripe |
| **E-post** | EU | Resend |

**✅ All data lagras inom EU/EES. Ingen dataöverföring till USA.**

---

## 📄 Avtalsdokumentation

### Tillgängliga dokument

| Dokument | Beskrivning | Länk |
|----------|-------------|------|
| **Användarvillkor** | Terms of Service | [/legal/terms](/legal/terms) |
| **Integritetspolicy** | Privacy Policy (GDPR-compliant) | [/legal/privacy](/legal/privacy) |
| **DPA/PUB** | Personuppgiftsbiträdesavtal | [docs/legal/DPA_TEMPLATE.md](docs/legal/DPA_TEMPLATE.md) |
| **Underleverantörer** | Subprocessor list | [/legal/subprocessors](/legal/subprocessors) |
| **Cookie Policy** | Cookie-hantering | [/legal/cookie-policy](/legal/cookie-policy) |

### Service Level Agreement (SLA)

| Parameter | Värde |
|-----------|-------|
| **Uptime-garanti** | 99.9% |
| **Support-svarstid (kritiskt)** | 1 timme |
| **Support-svarstid (normalt)** | 8 timmar |
| **RTO (Recovery Time Objective)** | 4 timmar |
| **RPO (Recovery Point Objective)** | 1 timme |

---

## 🛡️ Säkerhetsåtgärder för Svenska Kyrkan

### Rekommenderade inställningar

1. **MFA obligatoriskt för admins**
   - Aktivera MFA-enforcement för owner och admin-roller
   - TOTP via authenticator-app rekommenderas

2. **Rollbaserad åtkomst**
   - Använd minimalt privilegium
   - Tilldela roller: `owner`, `admin`, `coach`, `participant`

3. **Audit logging**
   - Granska audit log regelbundet
   - Exportera logs för extern revision

4. **Barn- och ungdomsdata**
   - Aktivera föräldrasamtycke-krav
   - Extra skydd för deltagare under 18 år

### Hantering av religiös data

Svenska Kyrkan hanterar religiösa personuppgifter som är **särskilda kategorier** enligt GDPR Artikel 9.

**Lekbankens åtgärder:**
- ✅ Explicit samtycke krävs
- ✅ Extra åtkomstloggning
- ✅ Begränsad åtkomst (need-to-know)
- ✅ Kryptering
- ✅ Radering vid samtyckets återkallande

---

## ❓ Vanliga Frågor (FAQ)

### Dataplacering

**F: Var lagras vår data?**
S: All data lagras i EU/EES (primärt Frankfurt/Stockholm). Ingen data lämnar EU-regionen.

**F: Använder ni amerikanska underleverantörer?**
S: Alla våra huvudleverantörer har EU-presence. Data behandlas inom EU.

**F: Vad händer vid Schrems III?**
S: Vi har kontinuerlig övervakning av EU-rättsläget och kan migrera till alternativa EU-leverantörer vid behov.

### GDPR

**F: Hur hanterar ni religiösa personuppgifter?**
S: Som särskild kategori med explicit samtycke, extra säkerhetsåtgärder, och strikt åtkomstkontroll.

**F: Hur snabbt kan användare få sina data?**
S: Självbetjäning: direkt. Via support: inom 30 dagar (GDPR-deadline).

**F: Hur raderas data vid kontoavslut?**
S: Användare kan radera konton själva. Data raderas/anonymiseras enligt GDPR. Vissa data behålls för bokföring (7 år).

### Säkerhet

**F: Har ni MFA?**
S: Ja, TOTP-baserad MFA är tillgängligt och rekommenderas för alla administratörer.

**F: Hur skyddas data vid intrång?**
S: Flera lager: kryptering, RLS, nätverksisolering, övervakning, incidenthantering.

**F: Vad händer vid dataintrång?**
S: Vi följer GDPR: anmälan till kund (24h) → myndighet (72h) → åtgärder → post-mortem.

### Avtal

**F: Kan vi få ett PUB-avtal?**
S: Ja, standardiserat DPA finns klart för signering.

**F: Kan vi revidera er säkerhet?**
S: Ja, enligt PUB-avtalet har ni revisionsrätt med 30 dagars varsel.

**F: Vad händer om vi avslutar?**
S: Ni får er data i strukturerat format. Data raderas efter 30 dagar.

---

## 📞 Kontaktinformation

### Teknisk Support
- **E-post:** support@lekbanken.no
- **Telefon:** [PHONE]
- **Svarstid:** 8 timmar (normalt), 1 timme (kritiskt)

### Dataskydd & Compliance
- **Dataskyddsombud (DPO):** dpo@lekbanken.no
- **Privacy-frågor:** privacy@lekbanken.no

### Säljkontakt
- **E-post:** sales@lekbanken.no
- **Telefon:** [PHONE]

---

## ✅ Due Diligence Checklista

### 1. Informationssäkerhet

- [x] GDPR-compliant Privacy Policy
- [x] Data Processing Agreement (DPA/PUB)
- [x] Subprocessor list
- [x] Data flow documentation
- [x] Encryption (at rest & in transit)
- [x] Access control (RBAC + RLS)
- [x] MFA for privileged users
- [x] Audit logging
- [x] Regular security reviews

### 2. Dataplacering

- [x] EU/EES database location (Frankfurt)
- [x] EU/EES file storage (Frankfurt)
- [x] EU hosting (Stockholm)
- [x] No US jurisdiction for data
- [x] Standard Contractual Clauses (SCC) med underleverantörer

### 3. Backup & Återställning

- [x] Kontinuerlig backup (PITR)
- [x] 30 dagars retention
- [x] RTO: 4 timmar
- [x] RPO: 1 timme
- [x] Disaster Recovery Plan
- [x] Testade återställningsrutiner

### 4. Avtal & Juridik

- [x] Terms of Service (SV/NO/EN)
- [x] Privacy Policy (SV/NO/EN)
- [x] DPA/PUB template
- [x] SLA dokumenterat
- [x] Revisionsrätt i avtal
- [x] Data portability
- [x] Exit-strategi

### 5. GDPR-rättigheter

- [x] Rätt till tillgång (data export)
- [x] Rätt till radering (account deletion)
- [x] Rätt till rättelse
- [x] Rätt till begränsning
- [x] Rätt till dataportabilitet
- [x] Rätt att invända
- [x] Samtyckehantering
- [x] 30-dagars svarstid garanterad

### 6. Särskilda kategorier

- [x] Explicit samtycke krävs
- [x] Extra säkerhetsåtgärder
- [x] Begränsad åtkomst (need-to-know)
- [x] Utökad loggning
- [x] Regelbunden granskning

### 7. Barn & Ungdomar

- [x] Föräldrasamtycke krävs (under 18)
- [x] Extra integritetsskydd
- [x] Begränsad datainsamling
- [x] Förhöjd säkerhet

### 8. Organisation & Drift

- [x] Utsett dataskyddsombud (DPO)
- [x] Incident response plan
- [x] Säkerhetsutbildning för personal
- [x] Regelbundna granskningar
- [x] Transparent kommunikation

---

## 🚀 Nästa Steg

1. **Granska denna dokumentation**
2. **Boka demo** - sales@lekbanken.no
3. **Signera avtal** (huvudavtal + DPA)
4. **Starta pilotprojekt**
5. **Full utrullning**

---

*Dokumentet uppdaterat 2026-01-13*  
*Version 1.0*
