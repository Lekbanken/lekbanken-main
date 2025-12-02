# Achievements Admin Design Document

## Visual Concept Narrative

The **Achievements Admin** page is a precision-crafted badge/icon builder that blends Scandinavian simplicity with the playful energy of premium collectibles. The experience is designed for desktop-first workflows where administrators construct layered badges with surgical precision.

### Core Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header: Breadcrumbs + Page Title + Create Action                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─── Badge Library ─────────────────────────────────────────────────┐  │
│  │ [Search...] [Theme ▼] [Sort ▼]                         [+ Create] │  │
│  │                                                                   │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │  │
│  │  │ Badge  │  │ Badge  │  │ Badge  │  │ Badge  │  │ Badge  │      │  │
│  │  │ Card   │  │ Card   │  │ Card   │  │ Card   │  │ Card   │      │  │
│  │  │        │  │        │  │        │  │        │  │        │      │  │
│  │  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─── Badge Builder (Editor) ────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  ┌─ Visual Builder ─┐  ┌─ Layer Selectors ──────────────────────┐ │  │
│  │  │                  │  │                                        │ │  │
│  │  │  ThemeSelector   │  │  ┌─ Base ─────┐  ┌─ Background ──────┐ │ │  │
│  │  │  (6 presets)     │  │  │ ○ Circle   │  │ ○ Wings           │ │ │  │
│  │  │                  │  │  │ ○ Shield   │  │ ○ Laurel          │ │ │  │
│  │  │  ColorControls   │  │  │ ○ Ribbon   │  │ ○ Flames          │ │ │  │
│  │  │  (4 swatches)    │  │  └────────────┘  └───────────────────┘ │ │  │
│  │  │                  │  │                                        │ │  │
│  │  │  ┌────────────┐  │  │  ┌─ Foreground ─┐  ┌─ Symbol ────────┐ │ │  │
│  │  │  │            │  │  │  │ ○ Stars      │  │ ○ Heart         │ │ │  │
│  │  │  │   Badge    │  │  │  │ ○ Crown      │  │ ○ Lightning     │ │ │  │
│  │  │  │  Preview   │  │  │  │ ○ Sparkles   │  │ ○ Book / Dice   │ │ │  │
│  │  │  │            │  │  │  └──────────────┘  └─────────────────┘ │ │  │
│  │  │  └────────────┘  │  │                                        │ │  │
│  │  └──────────────────┘  └────────────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─ Metadata ────────────────┐  ┌─ Publishing & Sync ──────────┐ │  │
│  │  │ Title: __________________ │  │ Status: [Draft] [Published]  │ │  │
│  │  │ Subtitle: _______________ │  │ Roles: [Admin] [Creator] [+] │ │  │
│  │  │ Description: ____________ │  │ Orgs: [Org1] [Org2] [+]      │ │  │
│  │  │ Reward: [___] coins       │  │ ☐ Profile Frame Sync         │ │  │
│  │  └───────────────────────────┘  └────────────────────────────────┘ │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                    [Cancel]  [Save Badge]                   │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Editor Flow Behavior

1. **Initial State**: Badge Library shows existing achievements in a responsive grid. Badge Builder shows an empty state prompting selection or creation.

2. **Selection/Creation**: Clicking "Create" or editing a card populates the Badge Builder with either defaults or existing values. The preview updates in real-time.

3. **Layer Communication**: Each layer group (Base, Background, Foreground, Symbol) is visually distinct. Selecting an element:
   - Adds a subtle ring highlight
   - Shows a checkmark indicator
   - Optionally triggers a micro-animation on the preview

4. **Theme vs Custom Colors**: Selecting a theme auto-applies its palette. Adjusting any color swatch breaks theme binding and enters "Custom" mode.

5. **Publishing Flow**: Draft badges can be previewed but not awarded. Publishing requires at least one role/org assignment.

---

## Tailwind/CSS Refinement Checklist

### Color Palette (Lekbanken Brand)

```css
/* CSS Custom Properties for reference */
--lk-primary: #8661ff;      /* Vibrant purple */
--lk-accent: #00c7b0;       /* Teal/Cyan */
--lk-warm: #ffd166;         /* Warm yellow */
--lk-success: #22c55e;      /* Green */
--lk-error: #ef4444;        /* Red */
```

### Library Grid

```tsx
// Card grid layout
className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

// Individual card
className="group relative rounded-2xl border border-border/60 bg-card 
           transition-all duration-200 hover:border-primary/40 
           hover:shadow-lg hover:shadow-primary/5"

// Card preview container (with subtle gradient)
className="flex items-center justify-center rounded-xl 
           border border-dashed border-border/50 bg-gradient-to-br 
           from-muted/30 to-muted/10 p-6"

// Status badge positioning
className="absolute right-3 top-3"
```

### Filters Section

```tsx
// Filter bar container
className="flex flex-wrap items-center gap-3 border-b border-border/40 
           bg-muted/20 px-4 py-3"

// Search input
className="flex-1 min-w-[200px] rounded-lg border border-border/60 
           bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60
           focus:border-primary focus:ring-2 focus:ring-primary/20 
           transition-colors"

// Select dropdown
className="rounded-lg border border-border/60 bg-background px-3 py-2 
           text-sm cursor-pointer hover:border-primary/40"
```

### Layer Selectors

```tsx
// Layer group container
className="space-y-3"

// Layer group title
className="flex items-center gap-2 text-sm font-semibold text-foreground"

// Layer grid (thumbnails)
className="grid grid-cols-2 gap-2 sm:grid-cols-3"

// Layer button (default state)
className="group flex flex-col items-center gap-2 rounded-xl border-2 
           border-border/60 bg-card p-3 transition-all duration-200
           hover:border-primary/40 hover:shadow-md"

// Layer button (selected state)
className="border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"

// Layer thumbnail icon container
className="flex h-10 w-10 items-center justify-center rounded-lg 
           bg-muted/50 transition-transform group-hover:scale-105"

// Selected indicator (checkmark)
className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center 
           rounded-full bg-primary text-white shadow-sm"
```

### Color Controls

```tsx
// Color swatches row
className="flex flex-wrap gap-3"

// Individual swatch button
className="relative flex items-center gap-2 rounded-lg border px-3 py-2 
           transition-all hover:scale-105 cursor-pointer"

// Swatch circle
className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10"

// Color picker input (hidden, triggered by swatch)
className="absolute inset-0 opacity-0 cursor-pointer"

// Active swatch state
className="border-primary ring-2 ring-primary/30"
```

### Badge Preview

```tsx
// Preview container (with ambient glow)
className="relative flex items-center justify-center rounded-2xl 
           bg-gradient-to-br from-background to-muted/30 p-8"

// Ambient glow layer (optional)
style={{
  background: `radial-gradient(circle at 50% 50%, ${themeColor}30, transparent 70%)`
}}
className="absolute inset-0 opacity-40 blur-2xl pointer-events-none"

// Preview size toggle buttons
className="flex gap-1 rounded-lg border border-border/40 bg-muted/30 p-1"

// Size button (active)
className="rounded-md px-2 py-1 text-xs font-medium 
           bg-primary/10 text-primary"

// Size button (inactive)
className="rounded-md px-2 py-1 text-xs font-medium 
           text-muted-foreground hover:text-foreground transition-colors"
```

### Metadata & Publishing

```tsx
// Section container
className="rounded-xl border border-border/60 bg-card p-4 space-y-4"

// Section title
className="text-sm font-semibold text-foreground flex items-center gap-2"

// Input field
className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 
           text-sm transition-colors focus:border-primary 
           focus:ring-2 focus:ring-primary/20"

// Status toggle group
className="flex rounded-lg border border-border/60 bg-muted/20 p-1"

// Status button (draft)
className="rounded-md px-3 py-1.5 text-sm font-medium 
           bg-muted text-muted-foreground"

// Status button (published - active)
className="rounded-md px-3 py-1.5 text-sm font-medium 
           bg-primary text-white shadow-sm"

// Role/Org chips container
className="flex flex-wrap gap-2"

// Role chip
className="inline-flex items-center gap-1.5 rounded-full 
           bg-primary/10 px-3 py-1 text-xs font-medium text-primary"

// Add chip button
className="inline-flex items-center gap-1 rounded-full border 
           border-dashed border-border px-3 py-1 text-xs 
           text-muted-foreground hover:border-primary/40 
           hover:text-primary transition-colors cursor-pointer"

// Profile frame sync toggle row
className="flex items-center justify-between rounded-lg 
           border border-border/60 bg-muted/20 px-4 py-3"
```

### Action Buttons

```tsx
// Button container
className="flex items-center justify-end gap-3 border-t border-border/40 
           bg-muted/10 px-4 py-4 mt-6 -mx-4 -mb-4 rounded-b-2xl"

// Cancel button
className="rounded-lg border border-border/60 bg-background px-4 py-2 
           text-sm font-medium text-muted-foreground 
           hover:bg-muted/50 transition-colors"

// Save button
className="rounded-lg bg-primary px-4 py-2 text-sm font-medium 
           text-white shadow-sm hover:bg-primary/90 
           transition-colors"
```

### Empty States

```tsx
// Empty state container
className="flex flex-col items-center justify-center rounded-xl 
           border-2 border-dashed border-border/50 bg-muted/10 
           p-12 text-center"

// Empty state icon
className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl 
           bg-primary/10 text-primary"

// Empty state title
className="text-lg font-semibold text-foreground mb-2"

// Empty state description
className="text-sm text-muted-foreground max-w-sm mb-6"
```

---

## Iconography Recommendations

### Layer Category Icons

| Category    | Icon Suggestion                              | Notes                                  |
|-------------|----------------------------------------------|----------------------------------------|
| Base        | `square-stack` / `layers`                    | Foundation, stacked shapes             |
| Background  | `arrows-pointing-out` / `sparkles-behind`    | Wings, laurels expand outward          |
| Foreground  | `arrows-pointing-in` / `sparkles-front`      | Stars, crowns overlay the center       |
| Symbol      | `star` / `heart` / `bolt`                    | Central meaningful icon                |

### State Icons

| State       | Icon                  | Visual Treatment                       |
|-------------|-----------------------|----------------------------------------|
| Selected    | Checkmark in circle   | `bg-primary text-white` overlay        |
| Locked      | Lock closed           | Grayscale with reduced opacity         |
| Draft       | Pencil / Document     | Muted badge with dashed border         |
| Published   | Check-badge / Globe   | Success green or primary accent        |
| Synced      | Link / Sync arrows    | Accent color indicator                 |

### Recommended Icon Libraries

1. **Heroicons** (already in use) - Clean, consistent stroke icons
2. **Lucide React** - Additional variety if needed
3. **Custom SVG** - For unique badge layer thumbnails

---

## Visual Grouping Recommendations

### Card Hierarchy

```
┌─ Card Container ─────────────────────────────────────────┐
│  ┌─ Header ────────────────────────────────────────────┐ │
│  │  Icon + Title + Actions                             │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─ Content ───────────────────────────────────────────┐ │
│  │  Primary content area                               │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─ Footer (optional) ─────────────────────────────────┐ │
│  │  Secondary actions                                  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Builder Section Grouping

```
Visual Construction          │  Configuration
─────────────────────────────┼──────────────────────────
Preview area                 │  Metadata form
Theme selector               │  Publishing controls
Color controls               │  Role assignments
                             │  Org assignments
Layer selectors              │  Profile frame sync
(grouped by position)        │
```

### Spacing Scale (Tailwind)

- **Between major sections**: `gap-6` or `space-y-6`
- **Between grouped elements**: `gap-4` or `space-y-4`
- **Between related items**: `gap-2` or `space-y-2`
- **Internal padding**: Cards `p-4` to `p-6`, buttons `px-3 py-2`

---

## State Examples

### 1. Default State (Empty Editor)

```
Badge Builder
├── Empty state illustration
├── "Select or create an achievement"
├── "Choose from the library or start fresh"
└── [Create Achievement] button
```

### 2. Selected Layer State

```tsx
// Layer button with selection indicator
<button className="relative border-primary bg-primary/5 ring-2 ring-primary/20">
  <ThumbnailIcon />
  <span>Wings</span>
  {/* Checkmark overlay */}
  <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-primary">
    <CheckIcon className="h-3 w-3 text-white" />
  </div>
</button>
```

### 3. Theme Applied State

```tsx
// Theme card with applied indicator
<div className="border-primary bg-primary/5 ring-2 ring-primary/20">
  <ColorSwatches colors={theme.colors} />
  <span className="text-primary font-medium">{theme.name}</span>
  <CheckCircleIcon className="absolute -right-1 -top-1 h-5 w-5 text-primary" />
</div>
```

### 4. Profile Frame Sync States

```tsx
// Sync OFF
<div className="flex items-center justify-between bg-muted/20 border-border/60">
  <div>
    <p className="text-foreground">Profile Frame Sync</p>
    <p className="text-muted-foreground text-xs">Disabled</p>
  </div>
  <Switch checked={false} />
</div>

// Sync ON
<div className="flex items-center justify-between bg-accent/10 border-accent/30">
  <div>
    <p className="text-foreground">Profile Frame Sync</p>
    <p className="text-accent text-xs flex items-center gap-1">
      <LinkIcon className="h-3 w-3" /> Synced
    </p>
  </div>
  <Switch checked={true} />
</div>
```

### 5. Publishing Status States

```tsx
// Draft
<Badge variant="secondary" className="border-dashed">
  <PencilIcon className="h-3 w-3" />
  Draft
</Badge>

// Published
<Badge variant="success">
  <CheckBadgeIcon className="h-3 w-3" />
  Published
</Badge>
```

### 6. Empty Library State

```tsx
<div className="flex flex-col items-center justify-center p-16 text-center">
  <div className="mb-4 rounded-2xl bg-primary/10 p-4">
    <SparklesIcon className="h-12 w-12 text-primary" />
  </div>
  <h3 className="text-xl font-semibold">No achievements yet</h3>
  <p className="text-muted-foreground max-w-sm mt-2">
    Create your first achievement badge to reward and motivate your users.
  </p>
  <Button className="mt-6">
    <PlusIcon className="h-4 w-4" />
    Create your first badge
  </Button>
</div>
```

---

## Animation Ideas (Optional Enhancements)

### Preview Transitions

```css
/* Smooth layer transitions */
.badge-layer {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Subtle pulse on theme change */
@keyframes theme-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.95; }
}

.badge-preview-updating {
  animation: theme-pulse 400ms ease-out;
}
```

### Selection Feedback

```css
/* Layer selection pop */
.layer-selected {
  animation: selection-pop 200ms ease-out;
}

@keyframes selection-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
```

### Color Swatch Hover

```css
/* Swatch lift on hover */
.color-swatch:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

## Typography Hierarchy

| Element              | Classes                                    |
|----------------------|--------------------------------------------|
| Page title           | `text-2xl font-semibold text-foreground`   |
| Page subtitle        | `text-sm text-muted-foreground`            |
| Card title           | `text-base font-semibold text-foreground`  |
| Section title        | `text-sm font-semibold text-foreground`    |
| Label                | `text-sm font-medium text-foreground`      |
| Helper text          | `text-xs text-muted-foreground`            |
| Badge text           | `text-xs font-medium`                      |
| Button text          | `text-sm font-medium`                      |

---

## Responsive Considerations

While desktop-first, the design should gracefully adapt:

```tsx
// Main grid layout
className="grid gap-6 lg:grid-cols-[1fr,400px]"

// On mobile, stack vertically
// On desktop, preview/visual builder on left, layers/metadata on right

// Library grid adapts
className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

// Layer grids compress
className="grid grid-cols-2 gap-2 sm:grid-cols-3"
```

---

## Micro-UX Details

1. **Keyboard Navigation**: Tab through layer options, Enter to select
2. **Focus States**: Clear focus rings (`focus:ring-2 focus:ring-primary/50`)
3. **Loading States**: Skeleton loaders for badge library
4. **Optimistic Updates**: Preview updates immediately, save confirms
5. **Tooltips**: On layer thumbnails showing full names
6. **Undo Support**: Consider tracking previous state for quick revert

---

## Implementation Priority

1. **Phase 1**: Core structure (header, library grid, editor layout)
2. **Phase 2**: Visual builder (preview, theme, colors)
3. **Phase 3**: Layer selectors (base, bg, fg, symbol)
4. **Phase 4**: Metadata & publishing
5. **Phase 5**: Polish (animations, empty states, accessibility)
