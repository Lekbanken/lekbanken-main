
███████╗  ██████╗  ██████╗  ███╗   ███╗  ██████╗  ██╗ ██╗   ██╗ ███████╗ ██████╗
██╔════╝ ██╔═══██╗ ██╔══██╗ ████╗ ████║ ██╔════╝  ██║ ██║   ██║ ██╔════╝ ██╔══██╗
█████╗   ██║   ██║ ██████╔╝ ██╔████╔██║ ██║  ███╗ ██║ ██║   ██║ █████╗   ██████╔╝
██╔══╝   ██║   ██║ ██╔══██╗ ██║╚██╔╝██║ ██║   ██║ ██║ ╚██╗ ██╔╝ ██╔══╝   ██╔══██╗
██║      ╚██████╔╝ ██║  ██║ ██║ ╚═╝ ██║ ╚██████╔╝ ██║  ╚████╔╝  ███████╗ ██║  ██║
╚═╝       ╚═════╝  ╚═╝  ╚═╝ ╚═╝     ╚═╝  ╚═════╝  ╚═╝   ╚═══╝   ╚══════╝ ╚═╝  ╚═╝

# ============================================================

# ██╗      ███████╗ ██╗  ██╗ ██████╗   █████╗  ███╗   ██╗ ██╗  ██╗ ███████╗ ███╗   ██╗
# ██║      ██╔════╝ ██║ ██╔╝ ██╔══██╗ ██╔══██╗ ████╗  ██║ ██║ ██╔╝ ██╔════╝ ████╗  ██║
# ██║      █████╗   █████╔╝  ██████╔╝ ███████║ ██╔██╗ ██║ █████╔╝  █████╗   ██╔██╗ ██║
# ██║      ██╔══╝   ██╔═██╗  ██╔══██╗ ██╔══██║ ██║╚██╗██║ ██╔═██╗  ██╔══╝   ██║╚██╗██║
# ███████╗ ███████╗ ██║  ██╗ ██████╔╝ ██║  ██║ ██║ ╚████║ ██║  ██╗ ███████╗ ██║ ╚████║
# ╚══════╝ ╚══════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═══╝ ╚═╝  ╚═╝ ╚══════╝ ╚═╝  ╚═══╝

#   ⚡  VS CODE WORKFLOW — JOHAN EDITION  ⚡
###  _A Tactical Manual for Safe, Clean, and Stylish Coding_
###  _Dark Mode Required. Hoodie Optional._

---

## Metadata

- Owner: -
- Status: active
- Date: 2025-11-29
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active workflow manual for VS Code sessions, local tooling, and safe day-to-day repo operations.

# ============================================================
#   🤖 0. FOR AI AGENTS: READ THIS FIRST!
## <Before you write ANY code, read the right docs in the right order.>
# ============================================================

**⚠️ MANDATORY FOR ALL AI AGENTS**

Before making changes to this codebase, read:

```text
docs/ai/AI_CODING_GUIDELINES.md
PROJECT_CONTEXT.md
launch-readiness/launch-control.md
docs/database/environments.md
docs/DEVELOPER_SETUP.md
docs/TOOLING_MATRIX.md
docs/NOTION_SYNC_PLAN.md
docs/VS_CODE_WORKFLOW.md
.github/copilot-instructions.md
```

Why this exists:

- `docs/ai/AI_CODING_GUIDELINES.md` prevents common implementation mistakes.
- `PROJECT_CONTEXT.md` explains the product and domain intent.
- `launch-readiness/launch-control.md` explains current operational state.
- `docs/database/environments.md` explains what is local, preview, and production.
- `docs/DEVELOPER_SETUP.md` explains the practical local toolchain.
- `docs/TOOLING_MATRIX.md` locks which tools are primary, secondary, or skipped.
- `docs/NOTION_SYNC_PLAN.md` explains how Notion stays updated without becoming split-brain.
- `docs/VS_CODE_WORKFLOW.md` explains the session workflow.
- `.github/copilot-instructions.md` defines repo rules the agent must follow.

**Do not guess architecture, environment rules, migration flow, or tool responsibility.**

---

# ============================================================
#   🟪 1. STARTA DAGEN
## <Här sätter du upp sessionen utan att starta mer än vad du faktiskt behöver.>
# ============================================================

## 1.1 Öppna projektet

→ VS Code → Open Folder → `lekbanken-main`

## 1.2 Kontrollera repo-läget först

Kör alltid detta innan du börjar skriva kod:

```bash
git status
git branch --show-current
```

Bekräfta sedan:

- Vilken branch du står på
- Om det redan finns lokala ändringar
- Om sessionen gäller kod, databas, review, docs eller felsökning
- Vilket dagens datum är om sessionen kommer att uppdatera aktiv dokumentation

Om du ska uppdatera metadata i aktiva canonical docs:

- använd datumet från aktuell session/context om det redan anges
- annars kontrollera systemdatum först
- gissa aldrig datum från minne eller från ett äldre dokument

## 1.3 Hämta senaste ändringar när det är säkert

```bash
git pull
```

Detta gör att du inte bygger vidare på gammal state.

## 1.4 Starta lokal Supabase när uppgiften kräver det

För normalt kod- och databasarbete:

```bash
supabase start
```

Använd lokal Supabase som default för utveckling.

**Regel:** `.env.local` ska fortsätta peka på lokal Supabase, inte preview eller production.

## 1.5 Starta dev-servern när UI eller appflöden behöver köras

```bash
npm run dev
```

Öppna sedan:

- `http://localhost:3000`
- eller `http://localhost:3001` om port 3000 redan används

## 1.6 Starta inte onödiga tjänster

Om du bara ska:

- läsa kod
- göra review
- uppdatera docs
- analysera arkitektur

... ska du normalt **inte** starta dev-servern eller lokal Supabase i onödan.

## 1.7 Om `.next` eller lockfile strular

```bash
Remove-Item -Recurse -Force .next
npm run dev
```

## 1.8 Om du använder de nya promptarna

I chatten kan du använda:

- `/Lekbanken Session Start`
- `/Lekbanken Session End`

De ligger i `.github/prompts/` och är tänkta att standardisera start och stopp av en session.

---

# ============================================================
#   🟦 2. UNDER DAGEN (ACTIVE CODING)
## <Jobba lokalt först, verifiera nära ändringen och håll diffen ren.>
# ============================================================

## 2.1 Lekbankens låsta grundmodell

Arbeta efter detta som default:

- **Local first** — daglig utveckling sker lokalt
- **Preview before production** — verifiera online i preview innan merge
- **Repo before Notion** — när implementation truth spelar roll är repo:t källan
- **Guarded production** — produktionsdatabas och liveflöden ska nås med avsikt, inte av misstag

## 2.2 Vad som är source of truth

| System | Är source of truth för | Är inte source of truth för |
|--------|------------------------|-----------------------------|
| GitHub repo | Kod, migrations, promptfiler, CI, implementerad dokumentation | Produktbacklog, fri kunskapsyta |
| Notion | Portal, beslutshistorik, kunskapsnav, översikt | Slutgiltig implementation om repo säger något annat |
| Atlas | Lokal visualisering, annotations, risk- och refactorstöd | Runtime, produktion, affärslogik |
| Sandbox | Lokal experimentyta för UI och flöden | Publik produktfunktion |

## 2.3 Branch- och deploymodell

Rekommenderat defaultflöde:

1. Skapa en kortlivad feature branch från `main`
2. Gör en tydligt avgränsad förändring
3. Verifiera lokalt
4. Push och öppna PR
5. Kontrollera GitHub checks och Vercel preview
6. Merg:a till `main` först när preview är verifierad

## 2.4 Databasregler

Gör alltid migrations lokalt först:

```bash
supabase migration new my_change
npm run db:reset
```

Regler:

- Skapa migration i repo:t, inte i SQL Editor som primär väg
- Testa lokalt innan push
- Använd **aldrig** bar `supabase db push`
- Använd `npm run db:push` när production-migrering verkligen ska göras

## 2.5 Kvalitetskontroller under arbetet

Snabb kontroll:

```bash
npm run verify:quick
```

Större kontroll före push eller större ändring:

```bash
node scripts/verify.mjs
```

## 2.6 Vercel-regel: skriv aldrig remote env till `.env.local`

Det här är en hård regel framåt:

- `vercel link` får inte lämnas i ett läge där `.env.local` pekar mot preview eller production
- `vercel env pull` ska **inte** skriva till `.env.local`

Använd i stället en separat fil, till exempel:

```bash
vercel env pull .env.vercel.preview --environment=development
```

Syfte:

- `.env.local` förblir lokal-first
- remote env kan fortfarande inspekteras säkert
- preview-värden blandas inte ihop med lokal Docker-Supabase

## 2.7 Håll koll på vad du faktiskt ändrar

```bash
git status
```

Målet är att alltid förstå:

- vilka filer som ändrats
- varför de ändrats
- om diffen fortfarande matchar uppgiften

## 2.8 Om du råkar öppna Node REPL (du ser `>`)

Tryck:

```text
CTRL + C
CTRL + C
```

---

# ============================================================
#   🟥 3. NÄR DU ÄR FÄRDIG FÖR DAGEN
## <Stäng ned sessionen säkert, verifiera lagom mycket och lämna ett begripligt läge.>
# ============================================================

## 3.1 Börja med att läsa arbetsytans state

```bash
git status
```

Bekräfta:

- modified files
- staged files
- untracked files
- om något borde delas upp i flera commits

## 3.2 Kör proportionerlig verifiering

Normalt minst:

```bash
npm run verify:quick
```

Vid större kodändringar:

```bash
node scripts/verify.mjs
```

Om du inte hann verifiera något viktigt ska det uttryckligen dokumenteras i handoffen.

## 3.3 Säkerställ docs-sync när det krävs

Särskilt viktigt för Planner-domänen enligt `.github/copilot-instructions.md`.

Om du gjort en strukturell Planner-ändring kan dessa behöva uppdateras:

- `planner-audit.md`
- `planner-implementation-plan.md`
- `planner-architecture.md`

För alla domäner som använder `architecture + audit + implementation plan` gäller samma princip enligt `docs/TRIPLET_WORKFLOW_STANDARD.md`:

- verifiera audit före kodändring
- uppdatera implementationsplan före och efter implementation
- uppdatera audit efter implementation
- uppdatera architecture om stabil struktur ändrats

Om aktiva canonical docs uppdaterades ska du också göra en dateringskontroll enligt `docs/DOCUMENT_DATING_STANDARD.md`:

- använd sessionens datum om det redan finns i kontexten
- annars verifiera systemdatum först
- kontrollera att `Datum/Date`, `Senast uppdaterad/Last updated` och `Senast validerad/Last validated` betyder rätt sak
- lämna inte sessionen med osäkra eller gissade datumfält

## 3.4 Commit:a med tydlig avsikt

Exempel:

```bash
git add <relevanta filer>
git commit -m "planner: tighten publish access checks"
```

Undvik vaga commits som bara säger att du "jobbade lite".

## 3.5 Push först när du förstår läget

```bash
git push
```

Om nästa steg är online-verifiering: öppna PR och kontrollera preview.

## 3.6 Stäng bara det du faktiskt startade

Dev-server:

```text
CTRL + C
```

Lokal Supabase:

```bash
supabase stop
```

**Men:** stoppa inte lokal Supabase slentrianmässigt om du har fler aktiva arbetsflöden eller parallella sessioner.

---

# ============================================================
#   🟨 4. TIPS & REGLER (KEEP YOURSELF ALIVE)
## <Det här är reglerna som håller ihop Lekbanken över tid.>
# ============================================================

## 4.1 Sandbox ska behandlas som lokal verktygsyta

`/sandbox` är tänkt för lokal testning, design och experiment.

Defaultregel:

- lokal-only
- inte en publik produktdel
- om den någon gång ska delas online måste den skyddas med tydlig auth och access policy

## 4.2 Atlas ska behandlas som lokalt besluts- och visualiseringsverktyg

Atlas är bra för:

- visualisering av struktur
- risk- och refactoröversikt
- mänskliga annotations

Atlas ska **inte** bli:

- runtime dependency
- produktionstvingande del
- en alternativ implementation truth bredvid repo:t

## 4.3 Notion är spegel och portal, inte primär implementation truth

Använd Notion för:

- översikter
- roadmap/backlog
- beslutshistorik
- onboarding och kunskapsdatabas

Men om repo och Notion säger olika saker om implementationen gäller repo:t.

## 4.4 Vercel preview är verifieringslagret, inte huvudarbetsplatsen

Rätt tänk:

- bygg lokalt
- kontrollera i preview
- släpp till production via `main`

Fel tänk:

- koda direkt mot preview som om det vore devmiljön

## 4.5 Multi-tenant är rätt default tills ett riktigt enterprise-krav finns

Framtidsregel:

- Lekbanken fortsätter som multi-tenant SaaS som standard
- dedikerad kundmiljö ska bara införas när det finns verkligt krav på isolering

Om sådan isolering behövs är det bättre med:

- separat Vercel-projekt
- separat Supabase-projekt eller databas
- separat secrets- och driftmodell

... i stället för att skapa en tung one-project-per-customer-modell för tidigt.

## 4.6 Resend och Stripe ska inte styra hela lokala loopen

Resend:

- bra för riktiga mailflöden senare
- ska inte blockera lokal utveckling

Stripe:

- utveckla lokalt
- verifiera realistiska flöden i preview
- håll live keys och webhook secrets strikt miljöseparerade

## 4.7 Läs verktygsmatrisen innan du lägger till ännu ett verktyg

Innan du lägger till en ny CLI, MCP-server eller automation, kontrollera:

- `docs/TOOLING_MATRIX.md`
- `docs/NOTION_SYNC_PLAN.md`

Frågan ska alltid vara:

- Är detta ett verkligt behov?
- Är detta redan löst av MCP?
- Skapar detta dubbelarbete eller split-brain?

## 4.8 `.env.local` ska aldrig bli production-default

`.env.local` är lokal. Punkt.

Production nås bara med tydlig avsikt genom guardade workflows.

---

# ============================================================
#   🟪 5. MINI CHEATSHEET (Tejpa på skärmen om du vill)
## <Kort version för verkliga sessioner.>
# ============================================================

## STARTA EN NORMAL KODSESSION

```bash
git status
git pull
supabase start
npm run dev
```

## STARTA EN DOCS ELLER REVIEW-SESSION

```bash
git status
git pull
```

## SNABB VERIFIERING

```bash
npm run verify:quick
```

## STÖRRE VERIFIERING

```bash
node scripts/verify.mjs
```

## HÄMTA VERCEL ENV SÄKERT

```bash
vercel env pull .env.vercel.preview --environment=development
```

## STÄNG EN SESSION

```bash
git status
CTRL + C
```

Och sedan vid behov:

```bash
supabase stop
git add <relevanta filer>
git commit -m "scope: clear summary"
git push
```

## CHAT-PROMPTS

```text
/Lekbanken Session Start
/Lekbanken Session End
```

## KOM IHÅG DE FEM VIKTIGASTE REGLERNA

```text
Local first
Preview before production
Repo before Notion
Atlas and Sandbox are local tools by default
Production DB changes only through guarded workflows
```


# ============================================================
#   END OF FILE — YOU ARE NOW OFFICIALLY A VS CODE OPERATOR
# ============================================================