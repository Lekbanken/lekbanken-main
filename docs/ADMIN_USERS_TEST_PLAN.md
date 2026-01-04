# Admin Users Test Plan

Test-plan för den refaktorerade `/admin/users`-sidan som matchar Organisation Card/List designfamiljen.

## Testscenarier

### 1. Data-layer & Server-side Rendering

| Test | Förväntat resultat |
|------|-------------------|
| Sidan laddas för system_admin | Alla användare visas, inga begränsningar |
| Server-error vid initial fetch | Fel visas med "Ladda om"-knapp |
| Tom databas | EmptyState med "Bjud in användare"-action |
| Initial data laddas från server | Ingen loading-spinner vid första render |

### 2. UserListItem (Användarkort)

| Test | Förväntat resultat |
|------|-------------------|
| Avatar visas korrekt | Bild om avatarUrl finns, annars initialer |
| Namn och e-post visas | Fallback till email om namn saknas |
| Status-badge visas | Korrekt färg per status (active=grön, disabled=röd, etc.) |
| Global roll-badge visas | Endast om globalRole !== null |
| Email verified-ikon | CheckBadgeIcon om emailVerified=true |
| Kopiera email | Klickbar, kopierar till urklipp, visar toast |
| Kopiera UUID | Klickbar, kopierar till urklipp, visar toast |
| Membership preview | Visar max 3 organisationer + "+N more" |
| Footer-grid | Visar medlemsantal, primär org, senast aktiv, registrerad |
| Actions dropdown | Visa, Redigera, Hantera medlemskap, Stäng av, Ta bort |
| Delete confirmation | AlertDialog med bekräftelse innan borttagning |

### 3. UserListToolbar

| Test | Förväntat resultat |
|------|-------------------|
| Sök på namn | Filtrerar listan i realtid (debounced 300ms) |
| Sök på email | Filtrerar listan |
| Sök på UUID | Filtrerar listan |
| Filter: Status | Dropdown med alla statusar |
| Filter: Global roll | Dropdown med alla roller |
| Filter: Medlemsroll | Dropdown med alla medlemsroller |
| Filter: Medlemskap | "Har medlemskap" / "Inga medlemskap" |
| Sortering | Nyast, Namn A-Ö, Senast aktiv, Flest medlemskap |
| Rensa filter-knapp | Visas när filter är aktiva, återställer alla |

### 4. Stat Cards (Summary)

| Test | Förväntat resultat |
|------|-------------------|
| Totalt | Korrekt antal användare |
| Aktiva | Antal med status=active |
| Inbjudna | Antal med status=invited |
| Avstängda | Antal med status=disabled |
| Utan org | Antal med membershipsCount=0 |

### 5. Loading States

| Test | Förväntat resultat |
|------|-------------------|
| Initial load | UserListSkeleton visas under RBAC-laddning |
| Refresh | Skeleton visas under router.refresh() |
| Kort-grid layout | 1 kolumn på mobil, 2 på tablet, 3 på desktop |

### 6. RBAC & Access Control

| Test | Förväntat resultat |
|------|-------------------|
| Ingen behörighet (admin.users.list=false) | EmptyState "Åtkomst nekad" |
| Kan bjuda in (admin.users.create=true) | "Bjud in användare"-knapp synlig |
| Kan inte bjuda in | Knappen dold |
| Kan redigera (admin.users.edit=true) | Edit/status actions i dropdown |
| Kan ta bort (admin.users.delete=true) | Delete action i dropdown |

### 7. Actions

| Test | Förväntat resultat |
|------|-------------------|
| View user | Navigerar till /admin/users/[id] |
| Edit user | Navigerar till /admin/users/[id]/edit |
| Manage memberships | Navigerar till /admin/users/[id]/memberships |
| Disable user | Uppdaterar status, visar toast |
| Delete user | Tar bort medlemskap + användare, visar toast |

### 8. Responsivitet

| Test | Förväntat resultat |
|------|-------------------|
| Mobil (< 768px) | 1-kolumn grid, toolbar stackar vertikalt |
| Tablet (768-1280px) | 2-kolumn grid |
| Desktop (> 1280px) | 3-kolumn grid |

### 9. Tillgänglighet (a11y)

| Test | Förväntat resultat |
|------|-------------------|
| Focus visible | Alla interaktiva element har synlig fokus |
| Screen reader | Labels på alla formulärelement |
| Keyboard navigation | Tab genom alla actions |
| Color contrast | WCAG AA på alla texter |

## Manuella Tester

### Happy Path
1. Logga in som system_admin
2. Navigera till /admin/users
3. Verifiera att kort visas i grid
4. Klicka på ett kort → visa detaljer
5. Använd sökfältet → verifiera filtrering
6. Testa "Bjud in användare" → dialog öppnas

### Edge Cases
1. Användare utan avatar → initialer visas
2. Användare utan medlemskap → "Inga medlemskap" i preview
3. Användare med 10+ medlemskap → "+7 more" visas
4. Mycket lång email → trunkeras med ellipsis

## Automatiserade Tester

```typescript
// tests/admin/users.spec.ts

test.describe('Admin Users Page', () => {
  test('should display user list for system_admin', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Användare' })).toBeVisible();
  });

  test('should filter users by search', async ({ page }) => {
    await page.goto('/admin/users');
    await page.fill('[placeholder*="Sök användare"]', 'test@example.com');
    // Assert filtered results
  });

  test('should show empty state when no users match filter', async ({ page }) => {
    await page.goto('/admin/users');
    await page.fill('[placeholder*="Sök användare"]', 'nonexistent-email-12345');
    await expect(page.getByText('Inga matchande användare')).toBeVisible();
  });
});
```

## Definition of Done

- [ ] Alla manuella tester genomförda utan fel
- [ ] TypeScript kompilerar utan fel
- [ ] Playwright e2e-tester passerar
- [ ] Designen matchar OrganisationListItem-mönstret
- [ ] Ingen legacy-kod kvar i UserAdminPage
- [ ] Server-side data fetching fungerar
