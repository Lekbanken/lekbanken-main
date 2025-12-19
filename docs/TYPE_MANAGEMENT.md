# TypeScript Type Management Guide

## 🎯 Översikt

Detta projekt använder auto-genererade TypeScript types från Supabase-databasen. Det är **kritiskt** att dessa types hålls synkroniserade med databasschemat.

---

## 🔄 När Ska Types Regenereras?

Types måste regenereras **varje gång** något av följande händer:

### ✅ Obligatoriska Tillfällen
- ✅ **Efter varje SQL migration** (`supabase/migrations/*.sql`)
- ✅ När nya tabeller läggs till
- ✅ När kolumner läggs till/tas bort/ändras
- ✅ När enums skapas eller ändras
- ✅ När foreign keys eller relationer ändras

### ⚠️ Varningar
Om du ser något av dessa tecken, regenerera types:
- TypeScript errors om saknade tabeller/kolumner
- Behov av `as any` casts i Supabase queries
- Build errors relaterade till databas types
- ESLint varningar om `@typescript-eslint/no-explicit-any`

---

## 📝 Hur Man Regenererar Types

### Method 1: Från Remote Database (Rekommenderat för Produktion)

```bash
npm run db:types:remote
```

Detta kommando:
1. Ansluter till din länkade Supabase-databas
2. Läser aktuellt schema
3. Genererar TypeScript types
4. Sparar till `types/supabase.ts`

**Förutsättningar:**
- Projektet måste vara länkat: `supabase link --project-ref YOUR_REF`
- Kräver `.supabase/config.toml` fil

### Method 2: Från Local Database (För Development)

```bash
# Starta lokal Supabase (kräver Docker)
supabase start

# Generera types från lokal databas
npm run db:types
```

### Method 3: Manuellt från Dashboard

1. Gå till Supabase Dashboard
2. Settings → API → Generate TypeScript Types
3. Kopiera output
4. Ersätt innehållet i `types/supabase.ts`

---

## 🔍 Verifiera Types

### Efter Regenerering

```bash
# 1. Kör type check
npm run type-check

# 2. Kör build för att säkerställa inget är trasigt
npm run build

# 3. Leta efter 'as any' casts som nu kan tas bort
npm run db:check-any
```

### Verifiera i Databas

```bash
# Kör verification script i SQL Editor
npm run db:verify
# Öppna sedan: scripts/verify-migrations.sql i Supabase Dashboard
```

Note: If you executed migrations manually in Supabase SQL Editor, the schema may be updated even if
`supabase_migrations.schema_migrations` does not show the corresponding versions yet.
Use `scripts/verify-migrations.sql` to detect this mismatch and (when appropriate) register the missing entries.

---

## 🚫 Undvik 'as any' Casts

### ❌ Dåligt (Temporär Fix)
```typescript
const { data } = await (supabase as any)
  .from('user_mfa')
  .select('*')
```

### ✅ Bra (Efter Type Regeneration)
```typescript
const { data } = await supabase
  .from('user_mfa')
  .select('*')
```

### Varför 'as any' är Farligt
- Förlorar TypeScript type safety
- Kan dölja runtime errors
- Gör refactoring riskabelt
- Svårt att hitta breaking changes

---

## 🔧 Workflow för Migrations

### Standard Development Workflow

```bash
# 1. Skapa ny migration
supabase migration new feature_name

# 2. Skriv SQL
# Edit: supabase/migrations/TIMESTAMP_feature_name.sql

# 3. Test lokalt (om möjligt)
supabase db push --local
npm run db:types

# 4. Apply till remote
supabase db push --linked

# 5. Regenerera types från remote
npm run db:types:remote

# 6. Verifiera
npm run type-check
npm run build

# 7. Commit tillsammans
git add supabase/migrations/TIMESTAMP_feature_name.sql
git add types/supabase.ts
git commit -m "feat: add feature_name with type regeneration"
```

### När Du Kör Någon Annans Migration

```bash
# 1. Pull latest code
git pull

# 2. Kör migrations (via Dashboard eller CLI)
# Se docs/MIGRATIONS.md för detaljer

# 3. Regenerera types
npm run db:types:remote

# 4. Verifiera
npm run type-check
```

---

## 🛡️ Förebyggande Åtgärder

### CI/CD Checks (Redan Implementerat)

Vi har GitHub Actions som:
- ✅ Kör `npm run type-check` på varje push/PR
- ✅ Letar efter `as any` i production code
- ✅ Kör full build för att validera

Se: `.github/workflows/typecheck.yml`

### Pre-commit Hooks (Redan Implementerat)

Git pre-commit hook som:
- ✅ Kör type check innan commit
- ⚠️ Varnar om `as any` i staged files
- ✅ Förhindrar commits med type errors

Se: `.husky/pre-commit`

### ESLint Rules (Redan Implementerat)

ESLint varnar för:
- `@typescript-eslint/no-explicit-any` - Använd inte `any`
- `@typescript-eslint/consistent-type-imports` - Konsekvent imports
- `@typescript-eslint/no-unused-vars` - Oanvända variabler

Se: `eslint.config.mjs`

---

## 📊 Troubleshooting

### Problem: "Cannot find name 'table_name'"

**Orsak:** Tabellen finns inte i generated types  
**Lösning:**
```bash
# 1. Verifiera att tabellen finns i databasen
npm run db:verify

# 2. Regenerera types
npm run db:types:remote

# 3. Verifiera fix
npm run type-check
```

### Problem: "Property 'column_name' does not exist"

**Orsak:** Kolumnen finns inte i generated types  
**Lösning:** Samma som ovan

### Problem: "Type 'enum_name' does not exist"

**Orsak:** Enum finns inte i generated types  
**Lösning:** Samma som ovan + verifiera att enum skapades i migration

### Problem: "Types are out of date"

**Orsak:** Migration kördes men types regenererades inte  
**Lösning:**
```bash
npm run db:types:remote
```

### Problem: "Docker not running" (för lokal type generation)

**Lösning:** 
- Alternativ 1: Starta Docker Desktop
- Alternativ 2: Använd `npm run db:types:remote` istället

---

## 📚 Relaterade Filer

- **Generated Types:** `types/supabase.ts`
- **Custom Types:** `types/admin.ts`, `types/api.ts`, etc.
- **Migrations:** `supabase/migrations/*.sql`
- **Scripts:**
  - `scripts/regenerate-types.ps1` - PowerShell wrapper för type regeneration
  - `scripts/find-any-casts.ps1` - Hitta alla `as any` casts
  - `scripts/verify-migrations.sql` - SQL för verifiering
- **CI/CD:** `.github/workflows/typecheck.yml`
- **Hooks:** `.husky/pre-commit`
- **Config:** `eslint.config.mjs`, `package.json`

---

## 🎓 Best Practices

### ✅ DO
- Regenerera types efter varje migration
- Commit types och migration tillsammans
- Använd `npm run type-check` innan commit
- Ta bort `as any` casts när types finns
- Verifiera i CI/CD pipeline

### ❌ DON'T
- Använd `as any` som permanent lösning
- Commita migrations utan att regenera types
- Skippa type checks med `--no-verify`
- Editera `types/supabase.ts` manuellt (auto-generated!)
- Låt type errors komma in i main branch

---

## 🚀 Quick Reference

```bash
# Type Management
npm run type-check           # Kör TypeScript check
npm run type-check:watch     # Watch mode för type check
npm run db:types:remote      # Regenerera från remote DB
npm run db:types             # Regenerera från local DB

# Verification
npm run db:verify            # Visa verify script path
npm run db:check-any         # Leta efter 'as any' casts
npm run build                # Full build validation

# Development
npm run dev                  # Start dev server
npm run lint                 # Run ESLint
```

---

## 📞 Support

Om du stöter på problem:

1. **Kolla documentation:**
   - `reports/TYPE_MISMATCHES_ANALYSIS.md` - Detaljerad analys
   - `docs/MIGRATIONS.md` - Migration guide
   
2. **Verifiera databas:**
   - Kör `scripts/verify-migrations.sql` i SQL Editor
   
3. **Regenerera types:**
   - `npm run db:types:remote`
   
4. **Fråga teamet:**
   - TypeScript errors i build
   - Migration issues

---

**Last Updated:** 2024-12-10  
**Status:** ✅ Fully Implemented
