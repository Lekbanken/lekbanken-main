# Learning Admin Phase 2 – Implementation Log

**Datum:** 2026-01-10  
**Status:** ✅ Komplett

---

## Sammanfattning

Phase 2 slutförde funktionella byggklossar för Learning Admin-modulen med fokus på:
- Fullständig CRUD för kurser, lärstigar och krav
- Scope-baserad filtrering (Global/Tenant)
- Roll-baserade behörigheter (System Admin / Tenant Admin)
- Rapporter med statistik per kurs
- Block-baserad innehållsredigering med JSON-fallback

---

## Vad som byggts

### Server Actions (`app/actions/learning-admin.ts`)

| Action | Beskrivning | Behörighet |
|--------|-------------|------------|
| `getLearningHubStats` | Aggregerad statistik för dashboard | Admin |
| `createPath` | Skapa ny lärstig | System Admin |
| `updatePath` | Uppdatera lärstig | System Admin |
| `deletePath` | Ta bort lärstig | System Admin |
| `listPathNodes` | Lista noder i lärstig | Admin |
| `listPathEdges` | Lista kanter i lärstig | Admin |
| `addPathNode` | Lägg till kurs i lärstig | System Admin |
| `removePathNode` | Ta bort kurs från lärstig | System Admin |
| `addPathEdge` | Skapa förkunskapskrav | System Admin |
| `removePathEdge` | Ta bort förkunskapskrav | System Admin |
| `listCoursesForPathEditor` | Lista kurser för path editor | System Admin |
| `updateRequirementAdmin` | Uppdatera krav | Admin (scope-baserat) |
| `getLearningReports` | Hämta rapportstatistik | Admin |

### UI-komponenter

| Komponent | Fil | Funktionalitet |
|-----------|-----|----------------|
| Hub Stats | `page.tsx` | Livesiffror med scope-filter |
| Course Editor | `CourseEditorDrawer.tsx` | Block-baserad editor för innehåll/quiz/rewards |
| Path Editor | `PathEditorDrawer.tsx` | Hantering av noder och kanter |
| Requirement Editor | `RequirementEditorDrawer.tsx` | Full edit-mode |
| Reports Page | `reports/page.tsx` | Statistik per kurs med filter |

---

## Scope- och Säkerhetsregler

### Rollbehörigheter

| Resurs | System Admin | Tenant Admin |
|--------|--------------|--------------|
| **Kurser (Global)** | CRUD | Endast läsning |
| **Kurser (Tenant)** | CRUD | CRUD (egen tenant) |
| **Lärstigar** | CRUD | Endast läsning |
| **Krav (Global)** | CRUD | Endast läsning |
| **Krav (Tenant)** | CRUD | CRUD (egen tenant) |
| **Rapporter** | Alla scope | Egen tenant |

### Säkerhetskontroller (Server-side)

```typescript
// Global resources: System Admin only
if (scope === 'global' && !isSystem) {
  return { success: false, error: 'Endast systemadministratörer...' };
}

// Tenant resources: Check membership
if (scope === 'tenant') {
  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) return { success: false, error: 'Ingen åtkomst' };
}
```

### UI-restriktioner

- **Paths page:** Visar "Endast visning" badge för non-system-admins
- **Courses table:** Edit/Archive knappar disabled för globala kurser (tenant admin)
- **Requirements page:** Create/Edit/Delete begränsade baserat på scope

---

## Data-integritet

### Constraint-hantering

| Scenario | Hantering |
|----------|-----------|
| **Self-edge** (from == to) | Blockeras server-side med tydligt felmeddelande |
| **Duplicate edge** | PostgreSQL unique constraint → user-friendly error |
| **Duplicate node** | PostgreSQL unique constraint → user-friendly error |
| **Duplicate slug** | PostgreSQL unique constraint → "finns redan" error |

### Quiz Builder Constraints

- **Min options:** 2 (remove-knapp dold vid 2)
- **Max options:** 6 (add-knapp dold vid 6)
- **Correct answer:** Radio-knapp med auto-deselection

---

## Rapporter - Join-logik

Rapportstatistik filtreras på **progress/attempts tenant_id**, inte på **course.tenant_id**:

```typescript
// Correct: Filter on attempt tenant, not course tenant
let attemptsQuery = supabase
  .from('learning_course_attempts')
  .select('course_id, score, passed, submitted_at')
  .gte('submitted_at', sinceISO);

if (tenantFilter) {
  attemptsQuery = attemptsQuery.eq('tenant_id', tenantFilter);
}
```

Detta säkerställer att globala kurser visar statistik för vald tenant.

---

## Kända begränsningar

1. **Path Graph Editor**
   - Formbaserad (inte visuell drag-drop)
   - Positionsdata sparas men används inte i UI

2. **Content Builder**
   - Stödjer text, image, video, quiz blocks
   - Ingen WYSIWYG - ren text/markdown

3. **Quiz Builder**
   - Endast single-choice frågor
   - Ingen fråge-randomisering i editor

4. **Reports**
   - Endast 30-dagars fönster
   - Ingen export-funktion

---

## Manual Test Checklist

### System Admin

- [ ] **Hub:** Växla scope All/Global/Tenant → siffror uppdateras
- [ ] **Courses:** 
  - [ ] Skapa global kurs
  - [ ] Skapa tenant-kurs
  - [ ] Uppdatera status
  - [ ] Arkivera kurs
- [ ] **Paths:**
  - [ ] Skapa global path
  - [ ] Skapa tenant path
  - [ ] Lägg till node (kurs)
  - [ ] Lägg till edge (förkunskapskrav)
  - [ ] Ta bort edge/node
  - [ ] Arkivera path
- [ ] **Requirements:**
  - [ ] Skapa global requirement
  - [ ] Skapa tenant requirement
  - [ ] Edit/Update
  - [ ] Toggle active
  - [ ] Delete
- [ ] **Reports:** Scope/tenant filter ändrar statistik

### Tenant Admin

- [ ] **Courses:**
  - [ ] Kan skapa tenant-kurs
  - [ ] Kan se globala kurser
  - [ ] KAN INTE edit:a globala kurser
  - [ ] KAN INTE arkivera globala kurser
- [ ] **Paths:**
  - [ ] Ser "Endast visning" badge
  - [ ] Inga edit/delete knappar synliga
  - [ ] Server blockar write-försök
- [ ] **Requirements:**
  - [ ] Kan skapa tenant requirement
  - [ ] Kan edit/toggle/delete tenant requirements
  - [ ] KAN INTE modifiera global requirements

### Data Integrity

- [ ] Skapa edge med from == to → blockeras
- [ ] Skapa duplicate edge → user-friendly error
- [ ] Lägg till redan-existerande kurs i path → blockeras

### Builder UX

- [ ] Toggle Advanced Mode → JSON synkroniseras
- [ ] Toggle tillbaka → blocks återställs från JSON
- [ ] Quiz: min 2 options enforced
- [ ] Quiz: max 6 options enforced

---

## Filändringar

### Nya filer
- `app/admin/learning/paths/PathEditorDrawer.tsx`

### Modifierade filer
- `app/actions/learning-admin.ts` (+~500 rader)
- `app/admin/learning/page.tsx`
- `app/admin/learning/courses/page.tsx`
- `app/admin/learning/courses/CourseEditorDrawer.tsx`
- `app/admin/learning/paths/page.tsx`
- `app/admin/learning/requirements/page.tsx`
- `app/admin/learning/requirements/RequirementEditorDrawer.tsx`
- `app/admin/learning/reports/page.tsx`

---

## TypeScript Status

✅ Alla TypeScript-fel fixade  
✅ `npx tsc --noEmit --skipLibCheck` passerar utan learning-relaterade fel

---

## Nästa steg (Future phases)

1. **Path Visualization:** ReactFlow/dagre för visuell graph editor
2. **Content WYSIWYG:** Rich text editor istället för markdown
3. **Quiz Types:** Multi-choice, fill-in, matching
4. **Reports Export:** CSV/PDF export
5. **Scheduling:** Tidsstyrt publicering av kurser
