# Lekbanken Admin Design System

> A comprehensive design narrative and implementation guide for the Admin UI/UX

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- `components/admin/shared/AdminPageHeader.tsx`
- `components/admin/shared/AdminPageLayout.tsx`
- `components/admin/shared/` (empty/loading/error states)
- `features/admin/` (reference pages implementing the patterns)

## Validation checklist

- New admin pages follow the documented structure (header → optional stats → table/forms → states).
- Shared components used from `components/admin/shared/` (avoid one-off patterns).
- UI changes do not introduce new hard-coded colors; prefer existing Tailwind/theme tokens.

---

## 1. Design Narrative

### 1.1 Layout Rhythm

The Admin area follows a consistent spatial hierarchy:

| Level | Spacing | Usage |
|-------|---------|-------|
| **Page** | `px-4 lg:px-8` horizontal, `pt-6 pb-10` vertical | Main content padding |
| **Section** | `mb-8` between major sections | Headers, stat grids, content blocks |
| **Group** | `mb-6` | Related content clusters |
| **Item** | `gap-4` or `gap-6` | Cards, table rows, form fields |
| **Micro** | `gap-2` or `gap-3` | Buttons, badges, inline elements |

### 1.2 Typography Scale

```
Page Title:     text-2xl lg:text-3xl font-semibold tracking-tight
Section Title:  text-lg font-semibold
Card Title:     text-base font-semibold
Body:           text-sm
Caption:        text-xs text-muted-foreground
Label:          text-sm font-medium
Stat Value:     text-2xl font-bold
Stat Label:     text-sm font-medium text-muted-foreground
Breadcrumb:     text-xs
Badge:          text-xs font-medium
```

### 1.3 Color System (Lekbanken Palette)

**Primary Actions & Highlights:**
- Primary: `#8661ff` (purple) — Main CTA, active states, brand accent
- Accent: `#00c7b0` (teal) — Secondary highlights, success-adjacent

**Semantic Colors:**
- Success: `emerald-500/600` — Positive trends, completed states
- Warning: `amber-500/600` — Attention needed, pending states
- Error/Destructive: `red-500/600` — Errors, deletions, alerts
- Info: `blue-500/600` — Informational, neutral stats

**Neutral Scale:**
- Foreground: `slate-900` (light) / `slate-200` (dark)
- Muted: `slate-500/600` for secondary text
- Border: `slate-200` (light) / `slate-700` (dark)
- Background: `white` (light) / `slate-900` (dark)

### 1.4 Iconography Guidelines

**Navigation Icons:**
- Size: `h-5 w-5` (20×20px)
- Style: Outline, 1.8px stroke
- Color: `slate-400` default, `primary` when active

**Page Header Icons:**
- Container: `h-12 w-12` rounded-xl with gradient background
- Icon: `h-6 w-6` inside container
- Gradient: `from-primary/20 to-primary/5` with `ring-1 ring-primary/10`

**Stat Card Icons:**
- Container: `h-10 w-10` rounded-lg with semantic gradient
- Icon: `h-5 w-5` inside container
- Gradients by type:
  - Primary: `from-primary/20 to-primary/5`
  - Blue: `from-blue-500/20 to-blue-500/5`
  - Green: `from-emerald-500/20 to-emerald-500/5`
  - Amber: `from-amber-500/20 to-amber-500/5`
  - Purple: `from-purple-500/20 to-purple-500/5`
  - Red: `from-red-500/20 to-red-500/5`

**Action Icons (Buttons):**
- Size: `h-4 w-4` for standard buttons
- Position: Left of label with `gap-2`
- Color: Inherit from button variant

### 1.5 Spacing Rules

**Consistent Gap Scale:**
```
gap-1.5  →  6px   (micro: badge padding, icon-text)
gap-2    →  8px   (small: button groups, inline items)
gap-3    →  12px  (medium: form fields, list items)
gap-4    →  16px  (standard: cards, sections)
gap-6    →  24px  (large: major section breaks)
gap-8    →  32px  (xl: page sections)
```

**Padding Scale:**
```
p-3      →  12px  (compact cards, toolbar items)
p-4      →  16px  (standard cards, dialogs)
p-5      →  20px  (stat cards, emphasized content)
p-6      →  24px  (large dialogs, settings panels)
px-4 lg:px-8  →  Page horizontal padding
```

---

## 2. Component Patterns

### 2.1 AdminPageHeader

**Structure:**
```tsx
<AdminPageHeader
  title="Page Title"
  description="Brief explanation of page purpose"
  icon={<HeroIcon className="h-6 w-6" />}
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'Current Page' }
  ]}
  actions={
    <Button className="gap-2">
      <PlusIcon className="h-4 w-4" />
      Primary Action
    </Button>
  }
/>
```

**Best Practices:**
- Always include breadcrumbs for navigation context
- Primary action button in top-right
- Description should be 1 line, explaining page purpose
- Icon should match the navigation icon

### 2.2 AdminStatGrid

**Layout:**
- 4 columns on large screens: `lg:grid-cols-4`
- 2 columns on medium: `sm:grid-cols-2`
- 1 column on mobile: `grid-cols-1`

**Card Pattern:**
```tsx
<AdminStatCard
  label="Metric Name"
  value={1234}
  change="+12%"
  trend="up"
  icon={<ChartIcon className="h-5 w-5" />}
  iconColor="blue"
  isLoading={isLoading}
/>
```

### 2.3 AdminDataTable

**Toolbar Pattern:**
```tsx
<AdminTableToolbar
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Sök användare..."
  filters={
    <>
      <FilterSelect label="Status" options={statusOptions} />
      <FilterSelect label="Roll" options={roleOptions} />
    </>
  }
  actions={
    <Button className="gap-2">
      <PlusIcon className="h-4 w-4" />
      Lägg till
    </Button>
  }
/>
```

**Column Guidelines:**
- First column: Primary identifier (name, title)
- Middle columns: Key attributes, hide less important on mobile
- Last column: Status badge + actions menu

### 2.4 Empty States

**Standard Pattern:**
```tsx
<EmptyState
  icon={<DocumentIcon className="h-8 w-8" />}
  title="Inga resultat"
  description="Det finns inga objekt att visa. Skapa ett nytt för att komma igång."
  action={{
    label: "Skapa ny",
    onClick: () => openCreateModal()
  }}
/>
```

### 2.5 Loading States

**Skeleton Patterns:**
- Tables: Show header + 5 skeleton rows
- Cards: Show card outline with pulsing content blocks
- Stats: Show icon placeholder + value placeholder

### 2.6 Error States

**Standard Pattern:**
```tsx
<AdminErrorState
  title="Något gick fel"
  description="Det gick inte att ladda data. Försök igen senare."
  action={{
    label: "Försök igen",
    onClick: () => refetch()
  }}
/>
```

---

## 3. Page Family Guidelines

### 3.1 List/Table Pages
> Users, Organisations, Licenses, Products, Tickets

**Structure:**
1. `AdminPageHeader` with page title, description, primary CTA
2. `AdminStatGrid` with 3-4 key metrics (optional)
3. `AdminTableToolbar` with search + filters + actions
4. `AdminDataTable` with columns + empty state
5. `AdminPagination` at bottom

**Primary Actions:**
- Top-right: "Lägg till" / "Skapa ny" / "Bjud in"
- Row actions: Edit, View, Delete (via dropdown or icon buttons)

### 3.2 Dashboard/Overview Pages
> Dashboard, Support, Billing

**Structure:**
1. `AdminPageHeader` with welcome or overview title
2. `AdminStatGrid` with 4 key health metrics
3. Quick Links grid (2-4 cards)
4. Secondary content (activity feed, recent items, shortcuts)

### 3.3 Settings/Form Pages
> Settings, Personalization

**Structure:**
1. `AdminPageHeader` with settings icon
2. Card sections for grouped settings
3. Form fields with labels
4. Sticky save/cancel actions at bottom or in header

### 3.4 Analytics/Reports Pages
> Analytics, Leaderboard

**Structure:**
1. `AdminPageHeader` with date range filter in actions
2. Tab navigation for different views
3. `AdminStatGrid` for summary metrics
4. Charts/visualizations
5. Data tables for detailed breakdowns

### 3.5 Builder/Editor Pages
> Achievements, Content, Marketplace

**Structure:**
1. `AdminPageHeader` with mode indicator
2. Sidebar/panel for item list
3. Main editor area
4. Preview panel (optional)
5. Save/Publish actions

---

## 4. Accessibility Checklist

### Focus States
- All interactive elements have visible focus ring
- Focus ring uses `ring-2 ring-primary ring-offset-2`
- Tab order follows logical reading order

### Keyboard Navigation
- All actions accessible via keyboard
- Modal dialogs trap focus
- Escape closes modals/dropdowns
- Arrow keys navigate within menus

### Color Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Interactive elements: minimum 3:1 ratio
- Error states use both color AND icon/text

### Semantic Structure
- One `<h1>` per page (page title)
- Heading hierarchy: h1 → h2 → h3
- Tables have proper `<thead>` and `<th>` elements
- Forms use `<label>` elements

### Screen Readers
- Icons have `aria-hidden="true"` when decorative
- Buttons have descriptive labels
- Loading states announced with `aria-live`
- Breadcrumbs use `<nav aria-label="Brödsmulor">`

---

## 5. Implementation Checklist

When creating or updating an admin page, verify:

- [ ] Uses `AdminPageLayout` wrapper
- [ ] Has `AdminPageHeader` with title, description, icon, breadcrumbs
- [ ] Primary action in header top-right
- [ ] Loading state with skeletons
- [ ] Empty state with call-to-action
- [ ] Error state with retry action
- [ ] Consistent spacing using gap/padding scale
- [ ] Icons from HeroIcons (outline style)
- [ ] Swedish labels for UI text
- [ ] Keyboard accessible
- [ ] Focus states visible

---

## 6. Page-Specific Recommendations

### 6.1 Dashboard (`/admin`)
- **Stats**: 4 key metrics in `AdminStatGrid cols={4}`
- **Quick Links**: 2×2 grid of navigation cards with gradients
- **Activity Feed**: Right column with recent system events
- **Welcome**: Consider personalized greeting in header

### 6.2 Users (`/admin/users`)
- **Stats**: Total users, active, invited, roles count
- **Table**: Name, email, role, status, last login, actions
- **Filters**: Search, role dropdown, status dropdown
- **Primary Action**: "Bjud in användare" with `UserPlusIcon`

### 6.3 Organisations (`/admin/organisations`)
- **Stats**: Total orgs, active, suspended, pending
- **Table**: Name, contact, members, subscription, status
- **Filters**: Search, status, subscription tier
- **Primary Action**: "Lägg till organisation" with `BuildingOffice2Icon`

### 6.4 Licenses (`/admin/licenses`)
- **Stats**: Active, expiring soon, expired, total seats
- **Table**: Organisation, product, seats used/total, expires, status
- **Filters**: Search, product, status
- **Primary Action**: "Skapa licens" with `KeyIcon`

### 6.5 Content (`/admin/content`)
- **Tabs**: Content, Events, Schedule
- **Cards**: Grid of content items with status badges
- **Primary Action**: "Lägg till innehåll" with `PlusIcon`
- **Calendar View**: Optional schedule visualization

### 6.6 Analytics (`/admin/analytics`)
- **Date Picker**: Range selector in header actions
- **Tabs**: Overview, Pages, Features, Errors
- **Charts**: Line charts for trends, bar charts for comparisons
- **Stats**: Sessions, page views, active users, bounce rate

### 6.7 Billing (`/admin/billing`)
- **Stats**: MRR, active subscriptions, overdue invoices, churn
- **Quick Actions**: Cards linking to subscriptions, invoices
- **Revenue Chart**: Monthly revenue trend

### 6.8 Billing/Subscriptions (`/admin/billing/subscriptions`)
- **Table**: Organisation, plan, amount, status, renewal date
- **Filters**: Search, plan, status
- **Actions**: View details, cancel, upgrade

### 6.9 Billing/Invoices (`/admin/billing/invoices`)
- **Table**: Invoice #, organisation, amount, date, status
- **Filters**: Search, status, date range
- **Actions**: Download PDF, send reminder

### 6.10 Moderation (`/admin/moderation`)
- **Tabs**: Queue, Reports, Stats
- **Queue Cards**: Content pending review with quick actions
- **Reports Table**: Type, content, reporter, date, status
- **Stats**: Resolved today, pending, avg response time

### 6.11 Notifications (`/admin/notifications`)
- **Form**: Target selection, message type, content
- **Preview**: Real-time notification preview
- **History**: Recent sent notifications

### 6.12 Support (`/admin/support`)
- **Stats**: Open tickets, pending, resolved (30d), avg response
- **Quick Links**: Cards to Tickets, Moderation, Notifications
- **Recent Tickets**: List of latest support requests

### 6.13 Tickets (`/admin/tickets`)
- **Table**: Subject, priority, status, user, created, actions
- **Filters**: Search, priority, status
- **Detail Panel**: Sliding panel for ticket conversation

### 6.14 Products (`/admin/products`)
- **Table**: Name, category, capabilities, status
- **Filters**: Search, category, status
- **Primary Action**: "Lägg till produkt" with `PlusIcon`

### 6.15 Achievements (`/admin/achievements`)
- **Builder**: Two-panel layout (list + editor)
- **Preview**: Live badge preview
- **Themes**: Color/style selectors
- **Primary Action**: "Skapa achievement" with `TrophyIcon`

### 6.16 Achievements Advanced (`/admin/achievements-advanced`)
- **Tabs**: Challenges, Events, Leaderboard
- **Cards**: Challenge/event items with progress
- **Primary Actions**: Create challenge, create event

### 6.17 Personalization (`/admin/personalization`)
- **Tabs**: Preferences, Interests, Content, Recommendations
- **Charts**: Distribution pie charts, trend lines
- **Stats**: Preference counts, engagement metrics

### 6.18 Marketplace (`/admin/marketplace`)
- **Tabs**: Stats, Items, Analytics
- **Stats**: Revenue, items sold, active items
- **Table**: Item name, price, sales, stock, status
- **Primary Action**: "Lägg till vara" with `PlusIcon`

### 6.19 Settings (`/admin/settings`)
- **Cards**: Organisation info, branding, danger zone
- **Form Fields**: Name, description, logo upload
- **Danger Zone**: Delete organisation (with confirmation)

### 6.20 Leaderboard (`/admin/leaderboard`)
- **Tabs/Filters**: Users, Organisations
- **Table**: Rank, name, score, games, achievements
- **Timeframe**: 7d, 30d, 90d, all time
- **Primary Action**: "Exportera" with `ArrowDownTrayIcon`

---

## 7. Tailwind Class Quick Reference

### Borders & Shadows
```css
border border-border         /* Standard border */
border-border/50             /* Subtle border */
shadow-sm                    /* Subtle shadow */
shadow-md                    /* Medium shadow (hover) */
ring-1 ring-primary/10       /* Icon ring */
```

### Background Gradients
```css
bg-gradient-to-br from-primary/15 to-primary/5   /* Icon container */
bg-muted/40                                       /* Table header */
bg-muted/50                                       /* Hover state */
```

### Typography
```css
text-2xl font-semibold tracking-tight            /* Page title */
text-lg font-semibold                             /* Section title */
text-sm font-medium                               /* Label */
text-sm text-muted-foreground                    /* Description */
text-xs uppercase tracking-wider font-semibold   /* Table header */
```

### Spacing Patterns
```css
px-4 lg:px-8       /* Page horizontal */
py-6 lg:py-8       /* Page vertical */
p-5                /* Stat card */
px-5 py-4          /* Card header */
gap-4 lg:gap-5     /* Grid gaps */
mt-8               /* Section spacing */
mb-4               /* Header to content */
```

### Interactive States
```css
hover:bg-muted/50                           /* Row hover */
hover:border-border/80 hover:shadow-md      /* Card hover */
focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```
