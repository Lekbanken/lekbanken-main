# Canonical Baseline — Execution Runbook

> **Status:** ✅ GENOMFÖRD — Baseline verifierad 2026-03-13
> **Beslut:** Alternativ B — Canonical Baseline (GPT-godkänt)
> **Canonical file:** `supabase/migrations/00000000000000_baseline.sql`
> **Arkiv:** `supabase/migrations/_archived/` (304 filer)

---

## 1. Vad är Canonical Baseline?

Alla nya environments (sandbox, staging, CI, demo, enterprise) startar från **en enda baseline-migration** som representerar produktionsschemat vid tidpunkten för konsolidering. Gamla migreringar är arkiverade som historisk referens — **inte canonical source**.

### Princip

> Baseline är canonical. Arkivet är historik. Dubbelriktad sanning tillåts inte.

---

## 2. Hur baseline genererades

### Förutsättningar

- Supabase sandbox-projekt (`vmpdejhgpsrfulimsoqn`) med alla 307 migreringar applicerade
- Supabase CLI v2.75.0 (ingen Docker, ingen psql)
- Supabase Management API access token

### Steg

#### 2.1 Schema dump via Management API

Docker-blockerare förhindrade `supabase db dump`. Istället användes Supabase Management API:

```
POST https://api.supabase.com/v1/projects/{ref}/database/query
Authorization: Bearer {token}
Content-Type: application/json
{"query": "SELECT ..."}
```

Bulk-queries hämtade: tabeller + kolumner + constraints + foreign keys + views + indexes + functions + triggers + policies + grants + enums.

**Script:** `_dump_schema_bulk.js` (nu borttaget — se §6 för reproduktion)

**Output:** Rå SQL-fil (~759 KB, ~17 600 rader)

#### 2.2 Schema-kvalificering

Supabase CLI `db reset --linked` kör varje statement med **tomt `search_path`**. All schema-kvalificering krävs:

| Kategori | Antal fixar | Metod |
|----------|-------------|-------|
| Enum-typcast (`::enum_name` → `::public.enum_name`) | 28 enum-typer | Regex per typ |
| CHECK constraint cross-contamination | 2 tabeller | Manuell |
| View-definitioner (FROM/JOIN) | 4 views | Manuell |
| Funktionsparameter/returtyper | ~10 | Regex + manuell |
| Forward declarations (LANGUAGE sql ordning) | 2 funktioner | Insert stubs |
| Trigger-funktioner (`EXECUTE FUNCTION`) | 78 | Regex |
| Policy-funktionsanrop | 555+ | Regex per funktion |
| Policy-tabellreferenser (FROM/JOIN) | 180+ | Regex per tabell/vy |
| RESTRICTIVE policy-syntax | 1 | Manuell |
| UTF-8 BOM | 1 | `UTF8Encoding($false)` |

#### 2.3 Test och verifiering

```powershell
supabase db reset --linked --yes --dns-resolver https --no-seed
```

Upprepades 13 iterationer tills exit code 0.

#### 2.4 Schema-räkning

Verifierades via Management API:

| Objekt | Förväntat | Resultat |
|--------|-----------|---------|
| Tabeller | 247 | ✅ 247 |
| Funktioner | 156 | ✅ 156 |
| Policies | 545 | ✅ 545 |
| Enums | 28 | ✅ 28 |

---

## 3. Hur baseline verifieras (reproducerbart)

### 3.1 Fresh install test

```powershell
# Länka till target-projektet
supabase link --project-ref <ref>

# Reset (utan seeds)
supabase db reset --linked --yes --dns-resolver https --no-seed

# Förväntat: exit code 0, inga ERROR-rader
```

### 3.2 Schema count verification

```powershell
# Kräver Supabase access token
$token = $env:SB_TOKEN  # eller hämta från Windows Credential Manager
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
$ref = "<project-ref>"

# Tabeller
$b = @{ query = "SELECT count(*) as cnt FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" } | ConvertTo-Json
(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers $headers -Body $b)[0].cnt
# Förväntat: 247

# Funktioner
$b = @{ query = "SELECT count(*) as cnt FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.prokind='f'" } | ConvertTo-Json
(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers $headers -Body $b)[0].cnt
# Förväntat: 156

# Policies
$b = @{ query = "SELECT count(*) as cnt FROM pg_policies WHERE schemaname='public'" } | ConvertTo-Json
(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers $headers -Body $b)[0].cnt
# Förväntat: 545

# Enums
$b = @{ query = "SELECT count(*) as cnt FROM pg_type t JOIN pg_namespace n ON t.typnamespace=n.oid WHERE n.nspname='public' AND t.typtype='e'" } | ConvertTo-Json
(Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$ref/database/query" -Method POST -Headers $headers -Body $b)[0].cnt
# Förväntat: 28
```

### 3.3 Seeds test

```powershell
supabase db reset --linked --yes --dns-resolver https
# Förväntat: exit code 0
```

---

## 4. Hur gamla migreringar arkiveras

```powershell
# Redan gjort — 304 filer i _archived/
ls supabase/migrations/_archived/*.sql | Measure-Object
```

Alla filer i `_archived/` är historisk referens. De får **inte** läggas tillbaka i `migrations/`.

---

## 5. Hur nya migreringar läggs till

```powershell
supabase migration new <description>
```

Skapar filnamn `YYYYMMDDHHMMSS_<description>.sql` i `supabase/migrations/`. Kör efter baseline i tidsordning.

**Viktigt:** Alla schema-referenser i nya migreringar bör vara schema-kvalificerade (`public.tabell`, `public.enum_typ`) för att fungera med Supabase CLI:s tomma `search_path`.

---

## 6. Hur baseline återskapas (om det behövs)

Om baseline behöver regenereras (t.ex. efter schema-ändringar i produktion):

### 6.1 Förutsättningar

- Supabase-projekt med aktuellt schema
- Supabase access token
- Node.js 18+

### 6.2 Schema dump script

Skapa `_dump_schema_bulk.js` med Management API-anrop:

```
1. Hämta alla tabeller + kolumner via information_schema
2. Hämta alla primary keys, unique constraints, check constraints
3. Hämta alla foreign keys
4. Hämta alla views (pg_get_viewdef)
5. Hämta alla indexes
6. Hämta alla functions (pg_get_functiondef)
7. Hämta alla triggers
8. Hämta alla RLS policies
9. Hämta alla grants
10. Hämta alla enums
11. Generera SQL i ordning: Extensions → Enums → Tables → FKs → Views → Indexes → Functions → Triggers → RLS → Policies → Grants
```

### 6.3 Schema-kvalificering

Kör regex-fixar per §2.2. De viktigaste:

```powershell
# 1. Enum-typcast
foreach ($e in $enumNames) {
  $content = $content -replace "::(?!public\.)$e", "::public.$e"
}

# 2. Trigger-funktioner
$content = [regex]::Replace($content, 'EXECUTE FUNCTION (?!public\.)(\w)', 'EXECUTE FUNCTION public.$1')

# 3. Policy-funktioner
foreach ($fn in @('is_system_admin','has_tenant_role','get_user_tenant_ids','is_global_admin','is_system_admin_jwt_only','is_tenant_member')) {
  $content = [regex]::Replace($content, "(?<!public\.)(?<!\w)$fn\(", "public.$fn(")
}

# 4. Policy-tabellreferenser (FROM/JOIN)
foreach ($t in $allTableAndViewNames) {
  $content = [regex]::Replace($content, "(\bFROM\s+\(*)(?!public\.)($t)(\s|\))", '$1public.$2$3')
  $content = [regex]::Replace($content, "(\bJOIN\s+\(*)(?!public\.)($t)(\s|\))", '$1public.$2$3')
}

# 5. Skriv utan BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
```

### 6.4 Testa

```powershell
supabase db reset --linked --yes --dns-resolver https --no-seed
# Förväntat: exit code 0
```

---

## 7. CI-gate

### Syfte

Säkerställ att baseline + alla migreringar fungerar för fresh install. Förhindra att samma problem byggs upp igen.

### Implementation (GitHub Actions)

```yaml
name: Database Baseline Check
on:
  pull_request:
    paths:
      - 'supabase/migrations/**'

jobs:
  baseline-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - name: Start local Supabase
        run: supabase start
      - name: Verify fresh install
        run: supabase db reset --local
      - name: Verify schema counts
        run: |
          TABLES=$(psql postgresql://postgres:postgres@localhost:54322/postgres -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
          echo "Tables: $TABLES"
          # Add count assertions as needed
```

### Alternativ (utan Docker i CI)

Om CI-miljö saknar Docker, använd Supabase Management API mot ett dedikerat CI-projekt:

```powershell
supabase db reset --linked --yes --dns-resolver https --no-seed
```

---

## 8. Kända begränsningar

| Begränsning | Status | Plan |
|-------------|--------|------|
| `updated_at`-triggervarianter (6 st) | Dokumenterad | Konsolidera i separat migration |
| `owner_tenant_id` vs `tenant_id` naming | Dokumenterad | Standardisera stegvis |
| `plan_schedules` phantom policies | Dokumenterad | Ta bort i separat migration |
| Gamification-sprawl (25–30 tabeller) | Dokumenterad | Konsolidera post-launch |
| Prod `schema_migrations` behöver uppdateras | Återstår | Vid prod-deploy av baseline |

---

## 9. Rollback

Om baseline visar sig ha problem:

1. Flytta `00000000000000_baseline.sql` till `_archived/`
2. Flytta tillbaka alla filer från `_archived/` till `migrations/`
3. Kör `supabase db reset --linked` med originalmigreringar

Produktionsdatabasen påverkas **aldrig** av baseline-ändringar — den har redan alla migreringar applicerade.
