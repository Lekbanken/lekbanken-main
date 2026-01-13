# Service Level Agreement (SLA)
## Lekbanken Enterprise

**Version:** 1.0  
**Gäller från:** 2025-01-13  
**Dokumentägare:** CTO

---

## 1. Definitioner

| Term | Definition |
|------|------------|
| **Drifttid** | Tid då tjänsten är tillgänglig för användare |
| **Planerat underhåll** | Föranmält underhåll med 72h varsel |
| **Incident** | Oplanerad händelse som påverkar tjänstens funktion |
| **RTO** | Recovery Time Objective - maximal tid för återställning |
| **RPO** | Recovery Point Objective - maximal dataförlust mätt i tid |

---

## 2. Tjänstetillgänglighet

### 2.1 Tillgänglighetsgaranti

| Plan | Garanterad tillgänglighet | Max nedtid/månad |
|------|---------------------------|------------------|
| **Standard** | 99.5% | 3h 36min |
| **Professional** | 99.9% | 43min |
| **Enterprise** | 99.95% | 22min |

Tillgänglighet beräknas som:
```
Tillgänglighet = (Total tid - Oplanerad nedtid) / Total tid × 100
```

### 2.2 Mätperiod

- Tillgänglighet mäts per kalendermånad
- Planerat underhåll räknas ej som nedtid
- Mätning sker via extern monitoring (Vercel Analytics + uppetid.io)

### 2.3 Undantag

Följande räknas ej som nedtid:
- Planerat underhåll (max 4h/månad, 72h förvarning)
- Force majeure (naturkatastrofer, krig, etc.)
- Tredjepartsstörningar utanför vår kontroll
- Kundens egen infrastruktur eller nätverk

---

## 3. Responstider för Support

### 3.1 Prioritetsnivåer

| Prioritet | Beskrivning | Exempel |
|-----------|-------------|---------|
| **P1 - Kritisk** | Tjänsten helt otillgänglig | Total nedtid, dataintrång |
| **P2 - Hög** | Viktiga funktioner påverkade | Inloggning fungerar ej |
| **P3 - Medium** | Delvis funktionsnedsättning | Långsam laddning |
| **P4 - Låg** | Mindre problem | Kosmetiska fel |

### 3.2 Responstider per Plan

| Prioritet | Standard | Professional | Enterprise |
|-----------|----------|--------------|------------|
| P1 | 4h | 1h | 15min |
| P2 | 8h | 4h | 1h |
| P3 | 24h | 8h | 4h |
| P4 | 72h | 24h | 8h |

**Notera:** Responstid = tid till första svar från tekniker, ej lösningstid.

### 3.3 Supportkanaler

| Plan | Kanaler | Tillgänglighet |
|------|---------|----------------|
| Standard | E-post | Vardagar 09-17 CET |
| Professional | E-post, Chatt | Vardagar 08-18 CET |
| Enterprise | E-post, Chatt, Telefon, Slack | 24/7 |

---

## 4. Backup & Återställning

### 4.1 Backup-schema

| Typ | Frekvens | Lagringstid | Plats |
|-----|----------|-------------|-------|
| Kontinuerlig replikering | Realtid | 7 dagar | EU (samma region) |
| Automatisk backup | Var 6:e timme | 30 dagar | EU (annan region) |
| Veckobackup | Söndag 03:00 CET | 90 dagar | EU (annan region) |
| Månadsbackup | 1:a i månaden | 1 år | EU (annan region) |
| Årsbackup | 1 januari | 7 år | EU (annan region) + krypterat arkiv |

### 4.2 RTO/RPO per Plan

| Plan | RPO (Max dataförlust) | RTO (Max återställningstid) |
|------|----------------------|----------------------------|
| Standard | 24h | 8h |
| Professional | 6h | 4h |
| Enterprise | 1h | 1h |

### 4.3 Återställningstest

- Årlig DR-övning genomförs i januari
- Resultat rapporteras till Enterprise-kunder
- Kunder kan begära delta i övning

---

## 5. Säkerhetsincidenter

### 5.1 Hantering av säkerhetsincidenter

| Åtgärd | Tidsgräns |
|--------|-----------|
| Initial bedömning | 1h efter upptäckt |
| Intern eskalering | 2h efter upptäckt |
| Kundmeddelande (vid påverkan) | 24h |
| GDPR-anmälan (vid personuppgiftsincident) | 72h till IMY |
| Post-incident rapport | 5 arbetsdagar |

### 5.2 Kommunikation vid incident

- Statusuppdateringar var 30 min under aktiv incident
- Enterprise-kunder får direktkontakt med incident manager
- All kommunikation dokumenteras och arkiveras

---

## 6. Ändringshantering

### 6.1 Ändringstyper

| Typ | Beskrivning | Förvarning |
|-----|-------------|------------|
| Standard | Nya funktioner, buggfixar | Ingen (release notes) |
| Normal | Mindre infrastrukturändringar | 72h |
| Kritisk | Säkerhetspatchar | Omedelbart |
| Major | Stora uppgraderingar | 30 dagar |

### 6.2 Release-cykel

- **Produktionsdeploy:** Automatiskt via CI/CD vid varje merge till main
- **Större uppdateringar:** Månatligen, första tisdagen i månaden
- **Underhållsfönster:** Söndagar 02:00-06:00 CET

---

## 7. Krediteringsmodell

### 7.1 Tillgänglighetskrediter

Om tillgängligheten understiger garanterad nivå:

| Tillgänglighet | Kredit |
|---------------|--------|
| < garanterad nivå | 10% av månadsavgift |
| < 99% | 25% av månadsavgift |
| < 95% | 50% av månadsavgift |
| < 90% | 100% av månadsavgift |

### 7.2 Responstidskrediter

Vid överskriden P1-responstid:

| Överskridning | Kredit |
|--------------|--------|
| 1-4h | 5% av månadsavgift |
| 4-8h | 10% av månadsavgift |
| > 8h | 25% av månadsavgift |

### 7.3 Hur man begär kredit

1. E-posta support@lekbanken.se inom 30 dagar efter incident
2. Ange datum, tid och beskrivning av problemet
3. Kredit utfärdas på nästa faktura

### 7.4 Begränsningar

- Max kredit per månad: 100% av månadsavgift
- Krediter gäller ej vid force majeure eller kundorsakade problem
- Krediter är ej utbetalningsbara i kontanter

---

## 8. Kundens Ansvar

Kunden ansvarar för:

- Att hålla kontaktuppgifter uppdaterade
- Att rapportera problem via officiella kanaler
- Att följa våra användarvillkor
- Att säkerställa att egna system som integrerar med tjänsten fungerar
- Att utbilda sina användare i säker användning

---

## 9. Eskalering

### 9.1 Eskaleringsväg

| Nivå | Roll | Kontakt | När |
|------|------|---------|-----|
| 1 | Support | support@lekbanken.se | Första kontakt |
| 2 | Supportchef | Efter 2h utan lösning på P1 |
| 3 | CTO | Efter 4h utan lösning på P1 |
| 4 | VD | Efter 8h utan lösning på P1 |

### 9.2 Enterprise-eskalering

Enterprise-kunder har direkt kontakt till:
- **Dedikerad kundansvarig:** [namn]@lekbanken.se
- **Teknisk kontakt:** [namn]@lekbanken.se
- **Eskalering:** cto@lekbanken.se

---

## 10. Rapportering

### 10.1 Månatlig rapport (Enterprise)

Enterprise-kunder får månatlig rapport innehållande:
- Tillgänglighetsstatistik
- Incidentsammanfattning
- Supportärendestatistik
- Säkerhetsuppdateringar
- Roadmap-uppdateringar

### 10.2 Kvartalsgenomgång (Enterprise)

- Kvartalsvis affärsgenomgång med kundansvarig
- Genomgång av SLA-uppfyllnad
- Planering inför kommande kvartal

---

## 11. Avtalstid och Uppsägning

### 11.1 Avtalstid

| Plan | Bindningstid | Uppsägningstid |
|------|--------------|----------------|
| Standard | Månadsvis | 30 dagar |
| Professional | 12 månader | 90 dagar |
| Enterprise | 12-36 månader | 90 dagar |

### 11.2 Vid avtalsslut

- Dataexport tillhandahålls utan extra kostnad
- 30 dagars grace period för datahämtning
- Data raderas permanent efter 90 dagar

---

## 12. Ändringar av SLA

- Lekbanken kan uppdatera denna SLA med 30 dagars förvarning
- Materiella försämringar ger kund rätt att säga upp utan avgift
- Aktuell SLA finns alltid på lekbanken.se/legal/sla

---

## 13. Kontakt

**Support:**  
E-post: support@lekbanken.se  
Telefon (Enterprise): +46 8 XXX XX XX  

**Säkerhetsincidenter:**  
E-post: security@lekbanken.se  
PGP-nyckel: [publiceras på hemsida]

**GDPR/Dataskydd:**  
E-post: gdpr@lekbanken.se  
Dataskyddsombud: [namn], dpo@lekbanken.se

---

## Bilaga A: Historik

| Version | Datum | Ändringar |
|---------|-------|-----------|
| 1.0 | 2025-01-13 | Initial version |

---

*Detta SLA gäller tillsammans med Lekbankens allmänna villkor och personuppgiftspolicy.*
