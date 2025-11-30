# 🎨 Design Implementation TODO

> Översikt över hela UI/Design-implementationen för Lekbanken.  
> Uppdaterad: 2025-11-30

---

## 📊 Status Översikt

| Område | Status | Progress |
|--------|--------|----------|
| Design System | ✅ Klar | 100% |
| UI Primitives | ✅ Klar | 100% |
| Feedback & States | ✅ Klar | 100% |
| Interactive Components | ✅ Klar | 100% |
| Marketing | ✅ Klar | 100% |
| App Shell | ✅ Klar | 100% |
| App Sandbox | ✅ Klar | 100% |
| App Pages | ✅ Klar | 100% |
| Admin Sandbox | ✅ Klar | 100% |
| Admin Navigation | ✅ Klar | 100% |
| Design Consistency | ✅ Klar | 100% |
| Admin Implementation | ✅ Klar | 100% |
| Dark Mode | ⬜ Ej påbörjad | 0% |

---

## ✅ KLART

### Design System (globals.css)
- [x] CSS Variables för färger
- [x] Tailwind v4 @theme inline tokens
- [x] Primary: #8661ff
- [x] Accent: #00c7b0
- [x] Yellow: #ffd166
- [x] Dark mode CSS variables (grundläggande)

### UI Primitives (components/ui/)
- [x] **Button** - 4 varianter (default, primary, outline, ghost) × 3 storlekar + länk-stöd
- [x] **Card** - 4 varianter + sub-komponenter (Header, Title, Description, Content, Footer)
- [x] **Badge** - 9 varianter × 3 storlekar + dot (inkl. error, secondary)
- [x] **Input** - Med label, error, hint, ikoner
- [x] **Textarea** - Med label, error, hint
- [x] **Select** - Med label, error, hint
- [x] **index.tsx** - Central export

### Marketing (components/marketing/)
- [x] **Hero** - Med stats-kort och preview-mockup
- [x] **Header** - Sticky nav med Headless UI mobilmeny
- [x] **PricingSection** - 3 tiers med månads/års toggle
- [x] **Testimonials** - Grid med featured testimonial
- [x] **StepsTimeline** - Hur det funkar
- [x] **StepsSpotlight** - Feature highlight
- [x] **CTASection** - Call to action
- [x] **Footer** - Komplett footer med länkar och social

### Marketing Page (/)
- [x] Header integrerad
- [x] Hero integrerad
- [x] StepsTimeline integrerad
- [x] StepsSpotlight integrerad
- [x] Testimonials integrerad
- [x] PricingSection integrerad
- [x] CTASection integrerad
- [x] Footer integrerad

### App Components (components/app/)
- [x] **AppShell** - Layout med SideNav + BottomNav
- [x] **SideNav** - Desktop navigation
- [x] **BottomNav** - Mobile navigation
- [x] **GameCard** - 3 varianter (default, compact, featured)
- [x] **nav-items** - Navigation configuration

### App Pages (/app)
- [x] **/app** - Dashboard med stats, aktiviteter, snabbåtgärder
- [x] **/app/games** - Spellista med sök, filter, grid/list-vy
- [x] **/app/games/[gameId]** - Speldetalj med info, regler, tips
- [x] **/app/profile** - Profilsida med level, XP, achievements
- [x] **/app/profile/friends** - Vänlista med requests
- [x] **/app/leaderboard** - Topplista med podium och ranking
- [x] **/app/support** - Supportformulär och FAQ
- [x] **/app/subscription** - Prenumerationshantering
- [x] **/app/notifications** - Notifikationslista
- [x] **/app/shop** - Butik med valutor och items
- [x] **/app/challenges** - Utmaningar och progress
- [x] **/app/events** - Händelser och event
- [x] **/app/preferences** - Inställningar

### Feedback & States (components/ui/)
- [x] **Alert** - 4 varianter (info, success, warning, error) + closable
- [x] **Toast** - Positioner + varianter
- [x] **EmptyState** - Illustration placeholder
- [x] **ErrorState** - Felmeddelande med retry
- [x] **LoadingSpinner** - Animerad spinner
- [x] **Skeleton** - Loading placeholder

### Interactive Components (components/ui/)
- [x] **Dialog** - Modal med Headless UI
- [x] **DropdownMenu** - Actions menu med Headless UI
- [x] **Avatar** - Med fallback initialer + storlekar
- [x] **Breadcrumbs** - Navigation breadcrumbs
- [x] **Tabs** - Horisontell tab navigation

### Admin Navigation
- [x] **sidebar.tsx** - Refaktorerad med design tokens
- [x] **topbar.tsx** - Refaktorerad med design tokens
- [x] **admin-nav-items.tsx** - Navigation konfiguration
- [x] **layout-client.tsx** - Uppdaterad layout

### Admin Sandbox (/sandbox/admin)
- [x] /sandbox/admin - Admin sandbox index
- [x] /sandbox/admin/dashboard - Dashboard med stats
- [x] /sandbox/admin/users - Användarhantering
- [x] /sandbox/admin/content - Innehållshantering
- [x] /sandbox/admin/analytics - Statistik och grafer
- [x] /sandbox/admin/settings - Systeminställningar
- [x] /sandbox/admin/support - Supportärenden
- [x] /sandbox/admin/billing - Fakturering
- [x] /sandbox/admin/notifications - Notifieringar
- [x] /sandbox/admin/organisations - Organisationer
- [x] /sandbox/admin/licenses - Licenshantering
- [x] /sandbox/admin/achievements - Achievements
- [x] /sandbox/admin/leaderboard - Leaderboard config
- [x] /sandbox/admin/moderation - Moderering
- [x] /sandbox/admin/personalization - Personalisering

### Design Consistency Audit
- [x] All App pages now use semantic design tokens
- [x] No hardcoded gray-*/slate-* colors in user-facing pages
- [x] components/GameCard.tsx updated
- [x] Documentation: docs/DESIGN_CONSISTENCY_TODO.md

### Admin Implementation
- [x] /admin - Dashboard med KPI cards, activity feed, alerts
- [x] /admin/users - User management med Supabase CRUD
- [x] /admin/content - Content planner med tabs och modals
- [x] /admin/analytics - 4 tabs (overview, pages, features, errors)
- [x] /admin/settings - Organization overview, info, danger zone
- [x] /admin/billing - Stats cards och section cards
- [x] /admin/notifications - Form med preview panel
- [x] /admin/support - Support placeholder
- [x] /admin/organisations - Organisations placeholder
- [x] /admin/licenses - Licenses placeholder
- [x] /admin/achievements-advanced - 3 tabs (challenges, events, leaderboard)
- [x] /admin/moderation - Queue, reports, stats tabs
- [x] /admin/personalization - 4 tabs (preferences, interests, content, recommendations)
- [x] /admin/marketplace - Stats, items, analytics tabs
- [x] /admin/tickets - Ticket list med detail panel

### Sandbox (/sandbox)
- [x] Huvudsida med kategorier (UI, Marketing, App, Admin)
- [x] /sandbox/buttons - Buttons + Badges
- [x] /sandbox/cards - Cards
- [x] /sandbox/forms - Forms
- [x] /sandbox/hero - Hero
- [x] /sandbox/pricing - Pricing
- [x] /sandbox/testimonials - Testimonials
- [x] /sandbox/navigation - Header
- [x] /sandbox/app - App sandbox index
- [x] /sandbox/app/shell - AppShell preview
- [x] /sandbox/app/game-card - GameCard varianter
- [x] /sandbox/app/dashboard - Dashboard layout
- [x] /sandbox/app/games - Games lista
- [x] /sandbox/app/leaderboard - Leaderboard
- [x] /sandbox/app/profile - Profilsida
- [x] /sandbox/app/shop - Butik
- [x] /sandbox/app/planner - Planerare
- [x] /sandbox/app/events - Events
- [x] /sandbox/feedback - Feedback & States (Alert, Toast, Empty, Error, Loading, Skeleton)
- [x] /sandbox/interactive - Interactive (Dialog, Dropdown, Avatar, Breadcrumbs, Tabs)

---

## ⬜ TODO (Framtida - vid behov)

### Fler UI Komponenter (Prioritet: LÅG)

> Dessa komponenter finns redan inline i olika sidor men kan extraheras till återanvändbara komponenter om det behövs.

#### Forms
- [ ] **Checkbox** - Med label, description (finns inline)
- [ ] **Radio** - Group med options (finns inline)
- [ ] **Switch/Toggle** - On/off med label (finns inline i preferences)
- [ ] **Slider** - Range input
- [ ] **DatePicker** - Kalenderväljare
- [ ] **FileUpload** - Drag & drop + click

#### Navigation
- [ ] **Pagination** - Sidnavigering (finns inline)
- [ ] **Stepper** - Flerstegsprocess

#### Data Display
- [ ] **AvatarGroup** - Stacked avatars
- [ ] **Table** - Sortable, filterable (finns inline i admin)
- [ ] **DataList** - Key-value pairs
- [ ] **Stats** - KPI-kort (finns inline i dashboard)

---

### Marketing Sidor (Prioritet: LÅG)

> Grundläggande marketing är klar. Dessa är framtida utökningar.

#### Features (/features)
- [ ] Feature grid
- [ ] Detaljerade feature-sidor
- [ ] Screenshots/demos

#### Om oss (/about)
- [ ] Team section
- [ ] Mission/vision

#### Kontakt (/contact)
- [ ] Kontaktformulär
- [ ] Support-info

---

### Polish & Dark Mode (Prioritet: LÅG)

#### Animationer
- [ ] Page transitions
- [ ] Micro-interactions
- [ ] Loading states
- [ ] Success animations

#### Accessibility (a11y)
- [ ] Keyboard navigation audit
- [ ] Screen reader labels
- [ ] Focus indicators
- [ ] Color contrast check

#### Performance
- [ ] Component lazy loading
- [ ] Image optimization (Next.js Image)
- [ ] Bundle analysis

#### Dark Mode
- [ ] Fullständig dark mode support
- [ ] Theme toggle komponent
- [ ] System preference detection
- [ ] Persist user preference
- [ ] Testa alla komponenter

---

## 📁 Aktuell Filstruktur

```
components/
├── ui/                      # ✅ UI Primitives (komplett)
│   ├── button.tsx           # ✅
│   ├── card.tsx             # ✅
│   ├── badge.tsx            # ✅
│   ├── input.tsx            # ✅
│   ├── textarea.tsx         # ✅
│   ├── select.tsx           # ✅
│   ├── alert.tsx            # ✅
│   ├── toast.tsx            # ✅
│   ├── dialog.tsx           # ✅
│   ├── dropdown-menu.tsx    # ✅
│   ├── avatar.tsx           # ✅
│   ├── breadcrumbs.tsx      # ✅
│   ├── tabs.tsx             # ✅
│   ├── empty-state.tsx      # ✅
│   ├── error-state.tsx      # ✅
│   ├── loading-spinner.tsx  # ✅
│   ├── skeleton.tsx         # ✅
│   └── index.tsx            # ✅
│
├── marketing/               # ✅ Marketing (komplett)
│   ├── hero.tsx             # ✅
│   ├── header.tsx           # ✅
│   ├── pricing-section.tsx  # ✅
│   ├── testimonials.tsx     # ✅
│   ├── steps-timeline.tsx   # ✅
│   ├── steps-spotlight.tsx  # ✅
│   ├── cta.tsx              # ✅
│   └── footer.tsx           # ✅
│
├── app/                     # ✅ App Shell (komplett)
│   ├── AppShell.tsx         # ✅
│   ├── SideNav.tsx          # ✅
│   ├── BottomNav.tsx        # ✅
│   ├── GameCard.tsx         # ✅
│   ├── PageHeader.tsx       # ✅
│   └── nav-items.tsx        # ✅
│
└── admin/                   # ✅ Admin (komplett)
    ├── sidebar.tsx          # ✅
    ├── topbar.tsx           # ✅
    └── admin-nav-items.tsx  # ✅
```
3. **Lägg till Toast** - Feedback för actions
4. **Uppdatera App Shell** - Använd design tokens
5. **Dark mode toggle** - Efterfrågat feature

---

## 📚 Resurser

- **Sandbox**: `http://localhost:3000/sandbox`
- **Design Tokens**: `app/globals.css`
- **TailwindPLUS Reference**: `docs/TAILWIND_PLUS_COMPONENTS.md`
- **UI Index**: `components/ui/index.tsx`

---

*Senast uppdaterad av Claude - 2025-11-30*
