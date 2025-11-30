# 🎨 Design Implementation TODO

> Översikt över hela UI/Design-implementationen för Lekbanken.  
> Uppdaterad: 2025-01-XX

---

## 📊 Status Översikt

| Område | Status | Progress |
|--------|--------|----------|
| Design System | ✅ Klar | 100% |
| UI Primitives | ✅ Klar | 100% |
| Marketing | ✅ Klar | 100% |
| App Shell | ✅ Klar | 100% |
| App Pages | 🔄 Pågår | 80% |
| Admin Panel | ⬜ Ej påbörjad | 0% |
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
- [x] **/app/profile** - Profilsida med level, XP, achievements
- [x] **/app/leaderboard** - Topplista med podium och ranking

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

---

## ⬜ TODO

### Fas 2: Fler UI Komponenter

#### Forms (Prioritet: HÖG)
- [ ] **Checkbox** - Med label, description
- [ ] **Radio** - Group med options
- [ ] **Switch/Toggle** - On/off med label
- [ ] **Slider** - Range input
- [ ] **DatePicker** - Kalenderväljare
- [ ] **FileUpload** - Drag & drop + click

#### Feedback (Prioritet: HÖG)
- [ ] **Alert** - Info, Success, Warning, Error
- [ ] **Toast** - Notifikationer (use react-hot-toast eller sonner)
- [ ] **Modal/Dialog** - Med Headless UI
- [ ] **Drawer** - Side panel
- [ ] **Tooltip** - Hover info
- [ ] **Popover** - Click info

#### Navigation (Prioritet: MEDIUM)
- [ ] **Tabs** - Horisontell navigation
- [ ] **Breadcrumb** - Sökväg
- [ ] **Pagination** - Sidnavigering
- [ ] **Stepper** - Flerstegsprocess
- [ ] **Dropdown Menu** - Actions menu

#### Data Display (Prioritet: MEDIUM)
- [ ] **Avatar** - Med fallback initialer
- [ ] **AvatarGroup** - Stacked avatars
- [ ] **Table** - Sortable, filterable
- [ ] **DataList** - Key-value pairs
- [ ] **Skeleton** - Loading placeholder
- [ ] **EmptyState** - Tom data illustration
- [ ] **Stats** - KPI-kort

#### Layout (Prioritet: LÅG)
- [ ] **Container** - Max-width wrapper
- [ ] **Stack** - Vertical/horizontal spacing
- [ ] **Grid** - Responsiv grid
- [ ] **Divider** - Horizontal/vertical separator
- [ ] **AspectRatio** - Bildförhållande

---

### Fas 3: Marketing Sidor

#### Landningssida (/)
- [ ] Sammanfoga alla sektioner
- [ ] Animationer (Framer Motion)
- [ ] SEO meta tags
- [ ] Open Graph bilder

#### Features (/features)
- [ ] Feature grid
- [ ] Detaljerade feature-sidor
- [ ] Screenshots/demos

#### Prissättning (/pricing)
- [ ] FAQ accordion
- [ ] Jämförelsetabell
- [ ] Enterprise kontaktformulär

#### Om oss (/about)
- [ ] Team section
- [ ] Mission/vision
- [ ] Timeline/historia

#### Kontakt (/contact)
- [ ] Kontaktformulär
- [ ] Karta (om relevant)
- [ ] Support-info

#### Auth
- [ ] Login sida design
- [ ] Register sida design
- [ ] Forgot password design
- [ ] Email verification design

---

### Fas 4: App UI

#### Dashboard (/app)
- [ ] Välkomst-kort
- [ ] Statistik-widgets
- [ ] Senaste aktiviteter
- [ ] Snabbåtgärder

#### Aktiviteter (/app/games)
- [ ] Lista med filter
- [ ] Grid/list toggle
- [ ] Sök med debounce
- [ ] Aktivitetskort (GameCard)
- [ ] Detaljsida

#### Planering (/app/planner)
- [ ] Kalendervy
- [ ] Drag & drop aktiviteter
- [ ] Pass-builder
- [ ] Export/print

#### Profil (/app/profile)
- [ ] Profilkort
- [ ] Redigera profil modal
- [ ] Avatar upload
- [ ] Inställningar

#### Leaderboard (/app/leaderboard)
- [ ] Topplistor
- [ ] Filtrera på kategori
- [ ] Animerade placeringar

---

### Fas 5: Admin Panel

#### Layout
- [ ] Admin sidebar
- [ ] Admin header
- [ ] Breadcrumbs

#### Users (/admin/users)
- [ ] Användartabell
- [ ] Sök & filter
- [ ] Användardetalj modal
- [ ] Bulk actions

#### Content (/admin/content)
- [ ] Aktivitetshantering
- [ ] CRUD interface
- [ ] Rich text editor

#### Analytics (/admin/analytics)
- [ ] Grafer (Recharts/Chart.js)
- [ ] KPI-kort
- [ ] Datumväljare

---

### Fas 6: Polish

#### Animationer
- [ ] Page transitions
- [ ] Micro-interactions
- [ ] Loading states
- [ ] Success animations

#### Accessibility (a11y)
- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Focus indicators
- [ ] Color contrast check

#### Performance
- [ ] Component lazy loading
- [ ] Image optimization
- [ ] Bundle analysis

#### Dark Mode
- [ ] Fullständig dark mode support
- [ ] Theme toggle komponent
- [ ] System preference detection
- [ ] Persist user preference

---

## 📁 Filstruktur

```
components/
├── ui/                      # ✅ Primitives
│   ├── button.tsx           # ✅
│   ├── card.tsx             # ✅
│   ├── badge.tsx            # ✅
│   ├── input.tsx            # ✅
│   ├── textarea.tsx         # ✅
│   ├── select.tsx           # ✅
│   ├── index.tsx            # ✅
│   ├── checkbox.tsx         # ⬜
│   ├── radio.tsx            # ⬜
│   ├── switch.tsx           # ⬜
│   ├── alert.tsx            # ⬜
│   ├── modal.tsx            # ⬜
│   ├── toast.tsx            # ⬜
│   ├── tabs.tsx             # ⬜
│   ├── avatar.tsx           # ⬜
│   ├── table.tsx            # ⬜
│   └── skeleton.tsx         # ⬜
│
├── marketing/               # ✅ Marknadsföring
│   ├── hero.tsx             # ✅
│   ├── header.tsx           # ✅
│   ├── pricing-section.tsx  # ✅
│   ├── testimonials.tsx     # ✅
│   ├── features.tsx         # ⬜
│   ├── cta.tsx              # ⬜
│   └── footer.tsx           # ⬜
│
├── app/                     # 🔄 App shell
│   ├── AppShell.tsx         # 🔄
│   ├── SideNav.tsx          # 🔄
│   ├── BottomNav.tsx        # 🔄
│   └── PageHeader.tsx       # 🔄
│
└── admin/                   # ⬜ Admin
    ├── AdminShell.tsx       # ⬜
    ├── AdminSidebar.tsx     # ⬜
    └── AdminHeader.tsx      # ⬜
```

---

## 🎯 Nästa Steg (Rekommenderat)

1. **Integrera marketing-sidan** - Sätt ihop Header + Hero + Pricing + Testimonials
2. **Lägg till Modal/Dialog** - Behövs för många features
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
