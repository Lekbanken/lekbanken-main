# 📋 Demo Mode - Säljarguide

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-13
- Last updated: 2026-03-21
- Last validated: -

> Draft internal sales guide for demo mode, premium demo sharing, and sales follow-up workflows.

**Dokument:** Intern guide för säljteamet
**Version:** 1.0
**Senast uppdaterad:** 2026-01-13

---

## 🎯 Översikt

Lekbanken erbjuder två typer av demo för potentiella kunder:

### 1. Gratis Demo (Self-Service)
- **Åtkomst:** Vem som helst kan starta via lekbanken.no/demo
- **Tid:** 2 timmar per session
- **Innehåll:** 15-20 utvalda aktiviteter
- **Begränsningar:** 
  - Ingen export
  - Inga team-funktioner
  - Ingen anpassad branding
  - 3 sessioner per IP per timme

### 2. Premium Demo (Sales-Assisted)
- **Åtkomst:** Via speciell länk som säljare delar
- **Tid:** Förlängd period (konfigureras av admin)
- **Innehåll:** Alla 1200+ aktiviteter
- **Funktioner:** Alla premium-funktioner upplåsta

---

## 🔗 Hur man delar Premium Demo

### Skapa Premium Demo-länk

```
https://lekbanken.no/auth/demo?tier=premium&code=DEMO_PREMIUM_2024
```

**Parametrar:**
- `tier=premium` - Aktiverar premium-läge
- `code=DEMO_PREMIUM_2024` - Nuvarande access-kod (kontakta tech för aktuell kod)
- `redirect=/app/activities` - Valfri: Skicka kund till specifik sida

### Exempel: Personlig demo-länk för en specifik kund

```
https://lekbanken.no/auth/demo?tier=premium&code=DEMO_PREMIUM_2024&redirect=/app/activities
```

---

## 📊 Vad kan du se om demo-användare?

### Admin Dashboard (`/admin/demo/sessions`)

Som administratör kan du se:
- Antal aktiva demo-sessioner
- Conversion rate (demo → kontaktförfrågan)
- Populäraste aktiviteter i demo
- Tid spenderad i demo
- Geografisk fördelning

### Analytics Events

Följande spåras för varje demo-session:
- `demo_session_started` - När demo startas
- `demo_activity_viewed` - Vilka aktiviteter som visas
- `demo_activity_played` - Vilka aktiviteter som spelas
- `demo_feature_blocked` - När användare försöker nå premium-funktioner
- `demo_upgrade_clicked` - Klick på "Kontakta säljare"
- `demo_upgrade_submitted` - Inskickat kontaktformulär
- `demo_converted` - Lyckad konvertering

---

## 💼 Säljprocessen

### Lead från Gratis Demo

1. **Användare startar gratis demo** på lekbanken.no/demo
2. **Utforskar plattformen** (vi ser aktivitet i analytics)
3. **Försöker använda premium-funktion** → Ser "Kontakta säljare"
4. **Fyller i kontaktformulär** på /demo/upgrade
5. **Vi får notifikation** med:
   - Namn, e-post, organisation
   - Teamstorlek
   - Beskrivning av behov
   - Demo-session ID (för att se deras aktivitet)

### Uppföljning

1. Kontakta kund inom 24 timmar
2. Använd demo-session ID för att se:
   - Vilka aktiviteter de tittade på
   - Hur lång tid de spenderade
   - Vilka funktioner de försökte nå
3. Erbjud personlig demo med premium-länk
4. Boka demo-samtal

---

## 🎮 Demo-innehåll

### Vad ingår i gratis demo?

| Kategori | Antal | Exempel |
|----------|-------|---------|
| Sport & Idrott | 5 | Stafetter, bolllekar |
| Teambuilding | 4 | Isbrytare, samarbetsövningar |
| Utomhuslek | 3 | Naturbingo, orientering |
| Inomhuslek | 3 | Pausaktiviteter |
| Kreativa | 3 | Dramaövningar |

### Vad är INTE tillgängligt i gratis demo?

- ❌ Skapa egna aktiviteter
- ❌ Redigera befintliga aktiviteter
- ❌ Exportera till PDF/Word
- ❌ Bjuda in teammedlemmar
- ❌ Organisationsinställningar
- ❌ Avancerad analys
- ❌ Anpassad branding
- ❌ Återkommande scheman

---

## 🛠️ Teknisk Information

### Cookies & Data

- **Sessionscookie:** Varar 2 timmar
- **Data raderas:** Automatiskt efter 24 timmar
- **Ingen registrering:** Krävs inte för gratis demo
- **GDPR-kompatibel:** Minimal datainsamling

### Felsökning

**"Kan inte starta demo"**
- Kunden kan ha nått rate limit (3/timme)
- Be dem vänta eller skicka premium-länk

**"Demo har gått ut"**
- Normal efter 2 timmar
- Användare kan starta ny demo
- Eller kontakta oss för premium

**"Sidan fungerar inte"**
- Kontrollera att cookies är aktiverade
- Rensa cache och försök igen
- Testa i incognito-läge

---

## 📞 Kontakt

**Teknisk support för demo:**
- Slack: #demo-support
- E-post: tech@lekbanken.no

**Uppdatera demo-innehåll:**
- Kontakta produktteamet
- Slack: #product

**Ändra premium access-kod:**
- Kontakta tech/DevOps
- Koden lagras i miljövariabler

---

## 📈 KPIer att följa

| Mätvärde | Mål | Nuläge |
|----------|-----|--------|
| Demo sessions/dag | 50+ | - |
| Demo → Lead conversion | 10% | - |
| Lead → Kund conversion | 25% | - |
| Tid i demo (medel) | 15+ min | - |
| Bounce rate | <30% | - |

---

*Senast uppdaterad av Product Team*
