# Badge Builder UX Guide
## Achievements Admin – Complete UX Narrative & Implementation Reference

> **Last Updated:** 2025-01-20  
> **Status:** Design Reference  
> **Scope:** Visual badge editor for custom achievements  

---

## Table of Contents
1. [UX Narrative: Badge Creation Flow](#ux-narrative-badge-creation-flow)
2. [Layout Architecture & Tailwind Recommendations](#layout-architecture--tailwind-recommendations)
3. [Visual Polish: Typography, Spacing, States](#visual-polish-typography-spacing-states)
4. [Performance Guidance](#performance-guidance)
5. [Component Quick Reference](#component-quick-reference)

---

## UX Narrative: Badge Creation Flow

### Scene 1: Empty State → "Let's Build Something Beautiful"

When an admin first lands on `/admin/achievements` with no badges yet, they shouldn't see a barren void. Instead:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│       🏆  No achievements yet                       │
│                                                     │
│   Create your first badge to reward players.       │
│   Badges sync to profile frames and gamification.  │
│                                                     │
│         [ + Create First Achievement ]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**UX Principles:**
- **Warmth over sterility** – An encouraging headline, not "No data"
- **Explain the value** – Why should they create badges?
- **Single clear CTA** – Primary button, high contrast, centered

**Tailwind Implementation:**
```tsx
<AdminEmptyState
  icon={TrophyIcon}
  title="No achievements yet"
  description="Create your first badge to reward players. Badges sync to profile frames and gamification."
  action={{ label: "Create First Achievement", onClick: handleCreate }}
/>
```

---

### Scene 2: Create Mode Opens → Two-Column Editor Appears

Clicking "Create" slides in a panel (or navigates to full editor). The editor is split:

```
┌─────────────────────────────────────────────────────────────────┐
│ VISUAL BUILDER (Left)              │ METADATA & PUBLISHING     │
│ ──────────────────────────────     │ ──────────────────────    │
│                                    │                           │
│    ┌─────────────┐                │ Title _______________     │
│    │             │                │ Subtitle _____________    │
│    │   [Badge    │  ← Live        │ Description              │
│    │   Preview]  │    Preview     │ ┌───────────────────┐    │
│    │             │                │ │                   │    │
│    └─────────────┘                │ └───────────────────┘    │
│                                    │                           │
│    Size:  ○ sm  ● md  ○ lg        │ Reward 🪙 [ 100 ] coins   │
│                                    │                           │
│ ────────────────────────────       │ ────────────────────────  │
│ Theme Mode: [Theme] [Custom]       │ Status: [Draft][Published]│
│                                    │                           │
│ ┌─────┬─────┬─────┐               │ Roles that can publish:   │
│ │Gold │Blue │Lush │  ← Presets    │ [Admin ×] [+ Add role]    │
│ └─────┴─────┴─────┘               │                           │
│                                    │ Organizations:            │
│ ────────────────────────────       │ [Org Alpha ×] [+ Add]     │
│ Color Controls (4 pickers)         │                           │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │ ▢ Profile Frame Sync      │
│ │Base│ │Bg  │ │Fg  │ │Sym │       │                           │
│ └────┘ └────┘ └────┘ └────┘       ├───────────────────────────┤
│                                    │                           │
│ ────────────────────────────       │ [ Cancel ]   [ Save ✓ ]   │
│ Layer Selection                    │                           │
│                                    │                           │
│ Base Shape:                        │                           │
│ ┌────┬────┬────┬────┐             │                           │
│ │None│ ⬡  │ ◯  │ ⬟  │             │                           │
│ └────┴────┴────┴────┘             │                           │
│                                    │                           │
│ Background:                        │                           │
│ ┌────┬────┬────┬────┐             │                           │
│ │None│ ★  │ ◇  │ ❋  │             │                           │
│ └────┴────┴────┴────┘             │                           │
│                                    │                           │
│ Foreground:                        │                           │
│ ┌────┬────┬────┬────┐             │                           │
│ │None│ ▲  │ ○  │ ◆  │             │                           │
│ └────┴────┴────┴────┘             │                           │
│                                    │                           │
│ Symbol:                            │                           │
│ ┌────┬────┬────┬────┐             │                           │
│ │None│ ⚡ │ 🎯 │ 🔥 │             │                           │
│ └────┴────┴────┴────┘             │                           │
│                                    │                           │
└─────────────────────────────────────────────────────────────────┘
```

**UX Principles:**
- **Preview stays visible** – Always see what you're building
- **Visual controls (left)** – Art/design decisions grouped together
- **Metadata & publishing (right)** – Text/admin decisions separate
- **Progressive disclosure** – Theme mode hides individual pickers when active

---

### Scene 3: Choosing a Base Shape

The user starts by selecting a base shape. This is the foundational layer.

**Micro-interaction flow:**
1. User hovers over a shape thumbnail → subtle scale + glow
2. User clicks → border animates to primary, checkmark appears
3. Preview updates instantly with CSS mask tinting

**Visual Feedback:**
```
Unselected:  border-border/60  bg-card
Hover:       border-primary/40  scale-[1.02]  shadow-md
Selected:    border-primary  ring-2 ring-primary/20  checkmark badge
```

**Empty hint (before any selection):**
```
💡 Start by picking a base shape – this is your badge's foundation.
```

---

### Scene 4: Layering Background, Foreground, Symbol

After base, the user adds decorative layers. Each layer selector follows the same pattern:

**Category differentiation via subtle gradients:**
| Layer      | Gradient Background        | Icon Tint  |
|------------|----------------------------|------------|
| Base       | `from-purple-500/10`       | Purple     |
| Background | `from-teal-500/10`         | Teal       |
| Foreground | `from-amber-500/10`        | Amber      |
| Symbol     | `from-rose-500/10`         | Rose       |

**"None" option always first** – allows clearing a layer

**Thumbnail grid:**
- 2-column layout on mobile, 3-4 columns on wider panels
- Each thumbnail: 48×48px, rounded-lg, ring-1 ring-black/10
- Lazy-loaded with skeleton placeholders

---

### Scene 5: Theme vs Custom Mode

A segmented control toggles between:

**Theme Mode:**
- Show preset swatches (Gold, Ocean, Forest, etc.)
- Clicking a theme applies all 4 colors at once
- Color pickers become read-only visual indicators

**Custom Mode:**
- Hide theme presets
- Show interactive color pickers for each layer
- Badge shows "Custom" indicator

**Mode switch behavior:**
```tsx
onModeChange={(mode) => {
  if (mode === 'theme' && draft.icon.themeId) {
    // Reapply theme colors
    applyTheme(draft.icon.themeId);
  } else if (mode === 'custom') {
    // Keep current colors, switch to custom editing
    setDraft({ ...draft, icon: { ...draft.icon, mode: 'custom' } });
  }
}}
```

---

### Scene 6: Fine-Tuning Colors

In custom mode, 4 color pickers appear in a 2×2 grid:

```
┌─────────────────┬─────────────────┐
│  🎨 Base        │  🎨 Background  │
│  Primary badge  │  Back layer     │
│  [ ████ ]       │  [ ████ ]       │
│  #8661ff        │  #00c7b0        │
├─────────────────┼─────────────────┤
│  🎨 Foreground  │  🎨 Symbol      │
│  Front layer    │  Center icon    │
│  [ ████ ]       │  [ ████ ]       │
│  #ffd166        │  #ffffff        │
└─────────────────┴─────────────────┘

Lekbanken Palette:
○ ○ ○ ○ ○ ○  ← Quick preset swatches
```

**Interaction:**
- Click swatch to open native color picker
- Show hex value in mono font
- Quick palette row for one-click brand colors

---

### Scene 7: Filling Metadata

User tabs or scrolls to the right column:

**Title** (required) – Clear red asterisk indicator  
**Subtitle** (optional) – Shown below badge in UI  
**Description** – How to earn this achievement  
**Reward Coins** – Gamification tie-in with coin emoji

**Validation:**
- Title required before save
- Show inline error: "Title is required" in `text-destructive`
- Save button disabled until valid

---

### Scene 8: Publishing Controls

**Status toggle:**
- Draft → muted background, preview only
- Published → primary background, live in system

**Role restrictions:**
- Pills with × to remove
- "+ Add role" opens dropdown
- Available: Admin, Creator, Org Admin, Moderator

**Organization scope:**
- Same pill pattern
- Limits which orgs can award this badge

---

### Scene 9: Profile Frame Sync

A standout card with toggle:

```
┌─────────────────────────────────────────────────┐
│ 🔗 Profile Frame Sync              [ Toggle ]   │
│    Synced – Badge updates user profile frame    │
└─────────────────────────────────────────────────┘
```

When enabled, sub-options appear:
- Duration (days)
- Which layers to sync (checkboxes)

**Visual state:**
- Disabled: `border-border/60 bg-muted/20`
- Enabled: `border-accent/30 bg-accent/10`

---

### Scene 10: Save & Return

Two actions:
- **Cancel** – Discard changes, return to library
- **Save** – Persist to database, return to library with success toast

**Button styling:**
```tsx
<Button variant="ghost" onClick={onCancel}>Cancel</Button>
<Button variant="default" onClick={handleSave} disabled={!isValid}>
  {isCreating ? 'Create Achievement' : 'Save Changes'}
</Button>
```

---

## Layout Architecture & Tailwind Recommendations

### Main Grid Structure

```tsx
// AchievementEditorPanel.tsx
<div className="grid gap-8 lg:grid-cols-[1fr,400px]">
  {/* Left: Visual Builder */}
  <div className="space-y-6">
    <BadgePreviewEnhanced />
    <ThemeSelectorEnhanced />
    <ColorControlsEnhanced />
    <LayerSelectorEnhanced type="base" />
    <LayerSelectorEnhanced type="background" />
    <LayerSelectorEnhanced type="foreground" />
    <LayerSelectorEnhanced type="symbol" />
  </div>

  {/* Right: Metadata & Publishing */}
  <div className="space-y-6 lg:border-l lg:border-border/50 lg:pl-8">
    <MetadataFormEnhanced />
    <PublishingControls />
    <ActionButtons />
  </div>
</div>
```

### Responsive Behavior

| Breakpoint | Layout                        |
|------------|-------------------------------|
| `< lg`     | Single column, stacked        |
| `≥ lg`     | Two columns, side-by-side     |

```tsx
// Responsive wrapper
<div className="grid gap-8 lg:grid-cols-[1fr,400px]">
```

### Layer Selector Grid

```tsx
// LayerSelectorEnhanced.tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
  {/* None option first */}
  <button className={noneClasses} onClick={() => onSelect(null)}>
    <span className="text-muted-foreground">None</span>
  </button>
  
  {/* Asset thumbnails */}
  {assets.map(asset => (
    <button key={asset.id} className={assetClasses}>
      <img src={asset.sizes.sm} loading="lazy" />
    </button>
  ))}
</div>
```

### Theme Preset Grid

```tsx
// ThemeSelectorEnhanced.tsx
<div className="grid grid-cols-3 gap-3">
  {themes.map(theme => (
    <button className={themeButtonClasses}>
      <div className="flex gap-1.5">
        <div className="h-6 w-6 rounded-full" style={{ bg: theme.colors.base }} />
        <div className="h-6 w-6 rounded-full" style={{ bg: theme.colors.background }} />
        <div className="h-6 w-6 rounded-full" style={{ bg: theme.colors.foreground }} />
      </div>
      <span className="text-xs">{theme.name}</span>
    </button>
  ))}
</div>
```

### Color Controls Grid

```tsx
// ColorControlsEnhanced.tsx
<div className="grid grid-cols-2 gap-3">
  {['base', 'background', 'foreground', 'symbol'].map(layer => (
    <label className="flex items-center justify-between rounded-xl border px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div 
          className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-black/10"
          style={{ backgroundColor: colors[layer] }}
        >
          <input type="color" className="opacity-0 absolute inset-0" />
        </div>
        <span>{labels[layer]}</span>
      </div>
      <span className="font-mono text-xs">{colors[layer]}</span>
    </label>
  ))}
</div>
```

---

## Visual Polish: Typography, Spacing, States

### Typography Hierarchy

| Element              | Classes                                      |
|----------------------|----------------------------------------------|
| Section title        | `text-sm font-semibold text-foreground`      |
| Section description  | `text-xs text-muted-foreground`              |
| Form label           | `text-sm font-medium text-foreground`        |
| Required indicator   | `text-destructive` (red asterisk)            |
| Input text           | `text-sm` with proper placeholder colors     |
| Badge/tag            | `text-xs font-medium`                        |
| Hex values           | `text-xs font-mono text-muted-foreground`    |

### Spacing Scale

| Context                | Gap/Padding               |
|------------------------|---------------------------|
| Section spacing        | `space-y-6`               |
| Within section         | `space-y-4`               |
| Grid items             | `gap-3`                   |
| Card padding           | `p-4` or `px-4 py-3`      |
| Input padding          | `px-3 py-2`               |
| Thumbnail size         | `h-12 w-12` (48×48)       |
| Color swatch           | `h-6 w-6` or `h-8 w-8`    |

### Interactive States

#### Buttons & Thumbnails

```scss
// Base state
@apply border-border/60 bg-card text-foreground;

// Hover
@apply hover:border-primary/40 hover:scale-[1.02] hover:shadow-md;

// Focus
@apply focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2;

// Selected
@apply border-primary bg-primary/5 ring-2 ring-primary/20;

// Disabled
@apply opacity-50 cursor-not-allowed;
```

#### Form Inputs

```scss
// Default
@apply border-border/60 bg-background;

// Focus
@apply focus:border-primary focus:ring-2 focus:ring-primary/20;

// Error
@apply border-destructive focus:ring-destructive/20;
```

### Category Icon Colors

```tsx
const categoryColors = {
  base: 'text-purple-500 bg-purple-500/10',
  background: 'text-teal-500 bg-teal-500/10',
  foreground: 'text-amber-500 bg-amber-500/10',
  symbol: 'text-rose-500 bg-rose-500/10',
};
```

### Empty State Hints

```tsx
{!hasLayers && (
  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
    <LightBulbIcon className="h-3.5 w-3.5 text-amber-500" />
    Start by picking a base shape – this is your badge's foundation.
  </p>
)}
```

### Profile Frame Preview

When Profile Frame Sync is enabled, show a mini preview:

```tsx
{frame.enabled && (
  <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl">
    {/* Avatar with frame */}
    <div className="relative">
      <div className="h-16 w-16 rounded-full bg-muted" />
      <div 
        className="absolute inset-0 rounded-full"
        style={{ 
          boxShadow: `0 0 0 3px ${colors.base}`,
          // or render frame layers around avatar
        }}
      />
    </div>
    <div>
      <p className="text-sm font-medium">Frame Preview</p>
      <p className="text-xs text-muted-foreground">
        How this badge appears on user profiles
      </p>
    </div>
  </div>
)}
```

---

## Performance Guidance

### 1. Asset Size Strategy

```tsx
// Load sm for selectors (48×48 thumbnails)
// Load md for live preview (88×88)
// Load lg only for export/final render (140×140)

const sizeForContext = {
  selector: 'sm',    // Thumbnails in layer grid
  preview: 'md',     // Live badge preview
  export: 'lg',      // Final saved asset
};
```

### 2. Lazy Loading Thumbnails

```tsx
<img 
  src={asset.sizes.sm} 
  loading="lazy"
  className="h-12 w-12 object-contain"
  alt={asset.label}
/>
```

Or use Intersection Observer for more control:

```tsx
const { ref, inView } = useInView({ triggerOnce: true });

<div ref={ref} className="h-12 w-12">
  {inView && <img src={asset.sizes.sm} />}
</div>
```

### 3. Memoization

```tsx
// Memoize expensive computations
const resolvedLayers = useMemo(() => ({
  base: resolveAssetUrl(draft.icon.layers.base, 'md'),
  background: resolveAssetUrl(draft.icon.layers.background, 'md'),
  foreground: resolveAssetUrl(draft.icon.layers.foreground, 'md'),
  symbol: resolveAssetUrl(draft.icon.layers.symbol, 'md'),
}), [draft.icon.layers]);

// Memoize filtered assets
const baseAssets = useMemo(
  () => getAssetsByType('base'),
  [] // Static, computed once
);

// Memoize preview component
const BadgePreview = memo(function BadgePreview({ layers, colors, size }) {
  return (
    <div className="relative" style={sizeStyles[size]}>
      {layerOrder.map(type => (
        layers[type] && (
          <img
            key={type}
            src={layers[type]}
            className="absolute inset-0 h-full w-full"
            style={{ 
              maskImage: `url(${layers[type]})`,
              backgroundColor: colors[type],
            }}
          />
        )
      ))}
    </div>
  );
});
```

### 4. Debounced Color Updates

```tsx
const debouncedColorChange = useMemo(
  () => debounce((key: string, color: string) => {
    handleColorChange({ [key]: color });
  }, 100),
  [handleColorChange]
);
```

### 5. Asset URL Resolution

```tsx
// Centralized in assets.ts
export function resolveAssetUrl(
  assetId: string | undefined,
  size: AchievementAssetSize
): string | null {
  if (!assetId) return null;
  const asset = getAssetById(assetId);
  if (!asset) return null;
  return asset.sizes[size];
}
```

### 6. Skeleton Loading States

```tsx
function AssetThumbnailSkeleton() {
  return (
    <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
  );
}

// In layer selector
{isLoading ? (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <AssetThumbnailSkeleton key={i} />
    ))}
  </div>
) : (
  <LayerGrid assets={assets} />
)}
```

---

## Component Quick Reference

### File Locations

```
features/admin/achievements/
├── AchievementAdminPage.tsx      # Main page with library grid
├── AchievementLibraryGrid.tsx    # Grid of existing badges
├── assets.ts                     # Asset registry (41 items)
├── types.ts                      # TypeScript definitions
│
└── editor/
    ├── AchievementEditorPanel.tsx     # Two-column editor layout
    │
    └── components/
        ├── BadgePreviewEnhanced.tsx   # Live layered preview
        ├── ThemeSelectorEnhanced.tsx  # Theme presets + mode toggle
        ├── ColorControlsEnhanced.tsx  # 4 color pickers
        ├── LayerSelectorEnhanced.tsx  # Thumbnail grid for layers
        ├── MetadataFormEnhanced.tsx   # Title, description, coins
        └── PublishingControls.tsx     # Status, roles, orgs, frame sync
```

### Type Definitions

```typescript
// Core badge config
type AchievementIconConfig = {
  mode: 'theme' | 'custom';
  themeId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  layers: {
    base?: string;
    background?: string;
    foreground?: string;
    symbol?: string;
  };
  customColors?: Partial<Record<AchievementAssetType, string>>;
};

// Full achievement item
type AchievementItem = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  rewardCoins?: number;
  status?: 'draft' | 'published';
  version?: number;
  availableForOrgs?: string[];
  icon: AchievementIconConfig;
  profileFrameSync?: ProfileFrameSyncConfig;
  publishedRoles?: string[];
};
```

### Asset Counts

| Type       | Count | Examples               |
|------------|-------|------------------------|
| Base       | 7     | circle, hexagon, star  |
| Background | 9     | rays, sparkle, dots    |
| Foreground | 11    | ring, glow, burst      |
| Symbol     | 14    | trophy, bolt, target   |

---

## Summary

The Badge Builder follows a **"visual first, metadata second"** flow:

1. **Start visual** – See preview, pick shapes, apply colors
2. **Layer progressively** – Base → Background → Foreground → Symbol
3. **Theme or customize** – Quick presets or fine control
4. **Add meaning** – Title, description, rewards
5. **Control access** – Publishing status, role/org restrictions
6. **Sync optionally** – Profile frame integration

All components use the **Lekbanken design system** with consistent:
- Rounded corners (`rounded-xl`, `rounded-lg`)
- Border styling (`border-border/60`)
- Focus rings (`ring-2 ring-primary/20`)
- Muted backgrounds (`bg-muted/20`, `bg-card`)
- Category color coding (purple/teal/amber/rose)

Performance is maintained through lazy loading, memoization, and size-appropriate asset fetching.
