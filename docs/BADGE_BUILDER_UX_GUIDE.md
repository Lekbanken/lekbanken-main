# Badge Builder UX Guide
## Achievements Admin – Stacking Layers & Tinting System

> **Last Updated:** 2025-12-07  
> **Status:** Design Reference  
> **Scope:** Visual badge editor with stackable layers and blend-mode tinting  

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [UX Narrative: Badge Creation Flow](#ux-narrative-badge-creation-flow)
3. [Layer Selector Design](#layer-selector-design)
4. [Theme & Color UX](#theme--color-ux)
5. [Preview & Layout](#preview--layout)
6. [Accessibility & Keyboard Navigation](#accessibility--keyboard-navigation)
7. [Performance Guidance](#performance-guidance)
8. [Component Quick Reference](#component-quick-reference)

---

## Architecture Overview

### Layer Model

```typescript
type AchievementIconConfig = {
  mode: 'theme' | 'custom';
  themeId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  base: AchievementLayerStackItem | null;           // Single layer
  symbol: AchievementLayerStackItem | null;         // Single layer
  backgrounds: AchievementLayerStackItem[];         // Stackable (0..N)
  foregrounds: AchievementLayerStackItem[];         // Stackable (0..N)
  customColors?: Partial<Record<AchievementAssetType, string>>;
};

type AchievementLayerStackItem = {
  id: string;
  color?: string;       // Per-item custom color override
  opacity?: number;     // Per-item opacity (future)
  order?: number;       // Render order within stack
};
```

### Rendering Order

```
backgrounds[0] → backgrounds[1] → ... → base → foregrounds[0] → foregrounds[1] → ... → symbol
```

### Tinting Approach

Uses CSS blend modes to preserve PNG detail:
```tsx
// TintedLayerImage.tsx
<img style={{ filter: "grayscale(1) brightness(1.05)" }} />  // Neutralize original
<div style={{ backgroundColor: color, mixBlendMode: "multiply" }} />  // Apply tint
<div style={{ mixBlendMode: "screen", opacity: 0.12 }} />  // Subtle highlight
```

### Asset Storage

| Size | Dimension | Usage |
|------|-----------|-------|
| sm | 56px | Thumbnails in selectors |
| md | 88px | Live preview |
| lg | 140px | Final render, export |

Assets in Supabase bucket `custom_utmarkelser` or local fallback `/achievements/utmarkelser/{sm|md|lg}/`.

---

## UX Narrative: Badge Creation Flow

### Scene 1: Empty State → "Build Your First Badge"

When landing on `/admin/achievements` with no badges:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│        🏆  No achievements yet                           │
│                                                          │
│   Stack layers, apply tints, and reward your players.   │
│   Badges sync to profile frames and gamification.       │
│                                                          │
│            [ + Create First Achievement ]                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Tailwind Implementation:**
```tsx
<AdminEmptyState
  icon={TrophyIcon}
  title="No achievements yet"
  description="Stack layers, apply tints, and reward your players."
  action={{ label: "Create First Achievement", onClick: handleCreate }}
/>
```

---

### Scene 2: Two-Column Editor Layout

The editor uses a **sticky left preview** and **scrollable right controls**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STICKY PREVIEW (Left)                 │ SCROLLABLE CONTROLS (Right)    │
│ ─────────────────────────────         │ ───────────────────────────    │
│                                       │                                │
│  ┌───────────────────────┐           │  ┌──────────────────────────┐  │
│  │                       │           │  │ Theme & Colors            │  │
│  │    ✨ [Live Badge] ✨  │           │  │ [Theme ●] [Custom ○]     │  │
│  │                       │           │  │                          │  │
│  └───────────────────────┘           │  │ ┌────┬────┬────┐        │  │
│                                       │  │ │Gold│Silv│Emer│        │  │
│  Size: [SM] [MD●] [LG]               │  │ └────┴────┴────┘        │  │
│                                       │  │                          │  │
│  ─────────────────────────           │  │ Color Pickers (4)        │  │
│  Layer Summary:                       │  └──────────────────────────┘  │
│  ┌─────────────────────┐             │                                │
│  │ 🟣 Base: shield     │             │  ┌──────────────────────────┐  │
│  │ 🟢 BG: wings_2      │ ← Chips     │  │ Layer Selection           │  │
│  │ 🟢 BG: spikes_1     │   with      │  │                          │  │
│  │ 🟠 FG: crown_1      │   order     │  │ Base Shape (single)      │  │
│  │ 🟠 FG: stars_3      │             │  │ [◯][⬡][⬢][🛡]            │  │
│  │ 🔴 Sym: trophy      │             │  │                          │  │
│  └─────────────────────┘             │  │ Symbol (single)          │  │
│                                       │  │ [⚡][🏆][🎯][❤]          │  │
│                                       │  │                          │  │
│                                       │  │ Background Stack (0..N)  │  │
│                                       │  │ ┌─────────────────────┐  │  │
│                                       │  │ │ #1 Wings 2    [↑↓×] │  │  │
│                                       │  │ │ #2 Spikes 1   [↑↓×] │  │  │
│                                       │  │ └─────────────────────┘  │  │
│                                       │  │ [+ Add Background]       │  │
│                                       │  │ ┌──┬──┬──┬──┐           │  │
│                                       │  │ │🔲│🔲│🔲│🔲│ (toggles) │  │
│                                       │  │ └──┴──┴──┴──┘           │  │
│                                       │  │                          │  │
│                                       │  │ Foreground Stack (0..N)  │  │
│                                       │  │ (same pattern)           │  │
│                                       │  └──────────────────────────┘  │
│                                       │                                │
│                                       │  ┌──────────────────────────┐  │
│                                       │  │ Metadata                  │  │
│                                       │  │ Title*, Subtitle, Desc   │  │
│                                       │  │ Reward Coins 🪙           │  │
│                                       │  └──────────────────────────┘  │
│                                       │                                │
│                                       │  ┌──────────────────────────┐  │
│                                       │  │ Publishing & Sync         │  │
│                                       │  │ Status, Roles, Orgs      │  │
│                                       │  │ Profile Frame Sync ▢     │  │
│                                       │  └──────────────────────────┘  │
│                                       │                                │
│                                       │  [ Cancel ]    [ Save Badge ]  │
│                                       │                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Layout Classes:**
```tsx
<div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)]">
  {/* Left: Sticky Preview */}
  <div className="space-y-4 lg:sticky lg:top-20 self-start">
    <PreviewCard />
  </div>
  
  {/* Right: Scrollable Controls */}
  <div className="space-y-6">
    <ThemeColorsSection />
    <LayerSelectionSection />
    <MetadataSection />
    <PublishingSection />
    <ActionButtons />
  </div>
</div>
```

---

### Scene 3: Choosing Base & Symbol (Single Selection)

For **base** and **symbol**, use a simple thumbnail grid with radio-style selection:

```tsx
<LayerSelectorEnhanced
  title="Base Shape"
  description="Foundation of your badge"
  type="base"
  assets={getAssetsByType("base")}
  selectedId={draft.icon.base?.id || ""}
  onSelect={handleSingleLayerChange}
/>
```

**Visual States:**
| State | Classes |
|-------|---------|
| Unselected | `border-border/60 bg-muted/30` |
| Hover | `hover:border-primary/40 hover:shadow-md` |
| Selected | `border-primary bg-primary/5 shadow-sm` + checkmark badge |

**Micro-interaction:**
1. Hover → `scale-[1.02]` + soft shadow
2. Click → border animates to primary, checkmark fades in
3. Preview updates instantly with tinted render

---

### Scene 4: Building Background & Foreground Stacks

Stacks allow **multiple decorations** rendered in order. This is the key UX challenge.

#### Stack Management Pattern

```
┌─────────────────────────────────────────────────────────┐
│ Background Decorations                                  │
│ Wings, laurels, spikes (stackable)                      │
├─────────────────────────────────────────────────────────┤
│ Selected Stack:                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  [🖼] Wings 2        #1    [↑] [↓] [×]              │ │
│ │  [🖼] Spikes 3       #2    [↑] [↓] [×]              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ If empty: "Inga valda bakgrunder än."                   │
│                                                         │
│ Available:                                              │
│ ┌────┬────┬────┬────┐                                   │
│ │[🔲]│[🔲]│[✓]│[✓]│  ← Toggle to add/remove           │
│ │wing│wing│spik│spik│                                   │
│ └────┴────┴────┴────┘                                   │
└─────────────────────────────────────────────────────────┘
```

#### Component Implementation (MultiLayerSelector)

```tsx
// Stack list with reorder controls
<div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
  {selected.length === 0 ? (
    <p className="text-xs text-muted-foreground">
      Inga valda {title.toLowerCase()} än.
    </p>
  ) : (
    selected.map((item, idx) => (
      <div
        key={`${item.id}-${idx}`}
        className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <Image src={asset.sizes.sm} width={32} height={32} />
          <span className="text-sm font-medium">{asset.label}</span>
          <span className="text-xs text-muted-foreground">#{idx + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => move(idx, -1)}>
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button onClick={() => move(idx, 1)}>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button onClick={() => remove(item.id)}>
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    ))
  )}
</div>

// Asset grid with toggle selection
<div className="grid grid-cols-2 gap-2">
  {assets.map((asset) => {
    const isSelected = selectedSet.has(asset.id);
    return (
      <button
        onClick={() => toggleAsset(asset.id)}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/60 bg-muted/30 hover:border-primary/40"
        )}
      >
        <Image src={asset.sizes.sm} width={32} height={32} />
        <span className="text-sm font-medium truncate">{asset.label}</span>
        {isSelected && (
          <div className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-primary text-white">
            <CheckIcon className="h-2.5 w-2.5" />
          </div>
        )}
      </button>
    );
  })}
</div>
```

#### Alternative: Chip-Based Stack Visualization

For a more compact view, show selected items as **draggable chips**:

```tsx
<div className="flex flex-wrap gap-2">
  {selected.map((item, idx) => (
    <div
      key={item.id}
      draggable
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
    >
      <span className="font-medium text-muted-foreground">#{idx + 1}</span>
      <Image src={asset.sizes.sm} width={16} height={16} className="rounded" />
      <span>{asset.label}</span>
      <button onClick={() => remove(item.id)} className="hover:text-destructive">
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  ))}
</div>
```

---

### Scene 5: Theme vs Custom Mode

A **segmented toggle** switches between preset themes and custom colors:

```tsx
<div className="flex rounded-lg border border-border/50 bg-muted/40 p-1 text-xs font-medium">
  {(["theme", "custom"] as const).map((opt) => (
    <button
      key={opt}
      onClick={() => onModeChange(opt)}
      className={cn(
        "rounded-md px-2 py-1 transition",
        mode === opt
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {opt === "theme" ? "Theme" : "Custom"}
    </button>
  ))}
</div>
```

**Theme Mode:**
- Show preset cards (Gold, Silver, Emerald, etc.)
- Clicking applies all 4 layer colors at once
- Color pickers show current values but indicate they're theme-controlled

**Custom Mode:**
- Badge shows "Custom" indicator
- All 4 color pickers become fully interactive
- Per-item color overrides possible for stack items

**Visual Indicator:**
```tsx
{draft.icon.mode === "custom" && (
  <Badge variant="warning" size="sm" className="gap-1">
    <SparklesIcon className="h-3 w-3" />
    Custom
  </Badge>
)}
```

---

### Scene 6: Color Controls with Tinting

Colors apply via CSS blend modes, preserving PNG detail:

```
┌─────────────────┬─────────────────┐
│  🟣 Base        │  🟢 Background  │
│  Primary shape  │  Back layers    │
│  [████████]     │  [████████]     │
│  #8661ff        │  #00c7b0        │
├─────────────────┼─────────────────┤
│  🟠 Foreground  │  🔴 Symbol      │
│  Front layers   │  Center icon    │
│  [████████]     │  [████████]     │
│  #ffd166        │  #ffffff        │
└─────────────────┴─────────────────┘

Quick Palette: ○ ○ ○ ○ ○ ○
```

**Per-Stack-Item Color Hints:**

When in custom mode, show color swatches next to stack items:

```tsx
<div className="flex items-center gap-2">
  <Image src={asset.sizes.sm} width={32} height={32} />
  <span>{asset.label}</span>
  {draft.icon.mode === "custom" && (
    <div
      className="h-4 w-4 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: item.color || getEffectiveColor(type, draft.icon, theme) }}
      title="Click to customize color"
    />
  )}
</div>
```

---

### Scene 7: Layer Summary in Preview Panel

The sticky preview shows a **compact layer summary** with order indicators:

```tsx
const summaryChips = [
  draft.icon.base?.id && { label: `Base: ${draft.icon.base.id}`, variant: "outline" },
  draft.icon.backgrounds?.length && { label: `BG ×${draft.icon.backgrounds.length}`, variant: "secondary" },
  draft.icon.foregrounds?.length && { label: `FG ×${draft.icon.foregrounds.length}`, variant: "primary" },
  draft.icon.symbol?.id && { label: `Sym: ${draft.icon.symbol.id}`, variant: "accent" },
].filter(Boolean);

<div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-border/30">
  {summaryChips.map((chip) => (
    <Badge key={chip.label} variant={chip.variant} size="sm">
      {chip.label}
    </Badge>
  ))}
</div>
```

**Alternative: Mini Layer Stack Visualization**

A vertical "timeline" view showing render order:

```tsx
<div className="flex flex-col gap-1 text-xs">
  {draft.icon.backgrounds?.map((bg, i) => (
    <div key={bg.id} className="flex items-center gap-2 text-teal-600">
      <span className="w-4 text-right">{i + 1}</span>
      <div className="h-4 w-4 rounded bg-teal-500/20" />
      <span>BG: {bg.id}</span>
    </div>
  ))}
  {draft.icon.base && (
    <div className="flex items-center gap-2 text-purple-600 font-medium">
      <span className="w-4 text-right">●</span>
      <div className="h-4 w-4 rounded bg-purple-500/20" />
      <span>Base: {draft.icon.base.id}</span>
    </div>
  )}
  {draft.icon.foregrounds?.map((fg, i) => (
    <div key={fg.id} className="flex items-center gap-2 text-amber-600">
      <span className="w-4 text-right">{i + 1}</span>
      <div className="h-4 w-4 rounded bg-amber-500/20" />
      <span>FG: {fg.id}</span>
    </div>
  ))}
  {draft.icon.symbol && (
    <div className="flex items-center gap-2 text-rose-600 font-medium">
      <span className="w-4 text-right">★</span>
      <div className="h-4 w-4 rounded bg-rose-500/20" />
      <span>Sym: {draft.icon.symbol.id}</span>
    </div>
  )}
</div>
```

---

### Scene 8: Onboarding Flow

**Recommended progression:**

1. **Choose base** → Foundation shape (required visual anchor)
2. **Add background stack** → Wings, spikes, laurels (0..N)
3. **Add foreground stack** → Crowns, stars, ribbons (0..N)
4. **Pick symbol** → Central icon (trophy, heart, etc.)
5. **Apply theme or customize** → Color palette
6. **Fill metadata** → Title, description, reward
7. **Publish** → Status, roles, orgs, frame sync

**Empty State Hints:**

```tsx
{!draft.icon.base && (
  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
    <LightBulbIcon className="h-3.5 w-3.5 text-amber-500" />
    Start by picking a base shape – this is your badge's foundation.
  </p>
)}

{draft.icon.base && draft.icon.backgrounds?.length === 0 && (
  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
    <LightBulbIcon className="h-3.5 w-3.5 text-amber-500" />
    Add background decorations like wings or spikes for visual depth.
  </p>
)}
```

---

## Layer Selector Design

### Single-Layer Selectors (Base & Symbol)

Use thumbnail grids with **radio-style** selection (only one active):

```tsx
<div className="grid grid-cols-2 gap-2">
  {assets.map((asset) => {
    const isSelected = selectedId === asset.id;
    return (
      <button
        onClick={() => onSelect(type, asset.id)}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition-all",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-md hover:scale-[1.02]"
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-muted">
          <Image src={asset.sizes.sm} alt={asset.label} width={32} height={32} />
        </span>
        <span className="text-sm font-medium truncate">{asset.label}</span>
        {isSelected && (
          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
          </div>
        )}
      </button>
    );
  })}
</div>
```

### Multi-Layer Selectors (Background & Foreground Stacks)

Two-part UI: **selected stack list** + **available assets grid**

#### Stack List Component

```tsx
<div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
  {selected.length === 0 ? (
    <p className="text-xs text-muted-foreground italic">
      Inga valda {title.toLowerCase()} än.
    </p>
  ) : (
    selected.map((item, idx) => (
      <div
        key={`${item.id}-${idx}`}
        className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 
                   transition-colors hover:border-border"
      >
        <div className="flex items-center gap-2">
          <Image src={assetMap.get(item.id)?.sizes.sm} width={32} height={32} className="rounded" />
          <span className="text-sm font-medium">{assetMap.get(item.id)?.label}</span>
          <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => move(idx, -1)}
            disabled={idx === 0}
            className="rounded-md border border-border/60 p-1 hover:border-primary/40 
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move up"
          >
            <ChevronUpIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => move(idx, 1)}
            disabled={idx === selected.length - 1}
            className="rounded-md border border-border/60 p-1 hover:border-primary/40 
                       disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Move down"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => remove(item.id)}
            className="rounded-md border border-border/60 p-1 hover:border-destructive/50 hover:text-destructive"
            aria-label="Remove"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    ))
  )}
</div>
```

#### Available Assets Grid (Toggle Selection)

```tsx
<div className="grid grid-cols-2 gap-2">
  {assets.map((asset) => {
    const isSelected = selectedSet.has(asset.id);
    return (
      <button
        onClick={() => toggleAsset(asset.id)}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all duration-200",
          isSelected
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-border/60 bg-muted/30 hover:border-primary/40 hover:shadow-md"
        )}
        aria-pressed={isSelected}
      >
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-muted">
          <Image src={asset.sizes.sm} width={32} height={32} />
        </span>
        <span className={cn("text-sm font-medium truncate", isSelected && "text-primary")}>
          {asset.label}
        </span>
        {isSelected && (
          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
          </div>
        )}
      </button>
    );
  })}
</div>
```

### Category Color Coding

| Layer Type | Border Accent | Background Hint | Text Color |
|------------|---------------|-----------------|------------|
| Base | `border-purple-500/40` | `bg-purple-500/5` | `text-purple-600` |
| Background | `border-teal-500/40` | `bg-teal-500/5` | `text-teal-600` |
| Foreground | `border-amber-500/40` | `bg-amber-500/5` | `text-amber-600` |
| Symbol | `border-rose-500/40` | `bg-rose-500/5` | `text-rose-600` |

---

## Theme & Color UX

### Theme vs Custom Toggle

```tsx
<div className="flex items-center justify-between">
  <h3 className="text-sm font-semibold flex items-center gap-2">
    <SwatchIcon className="h-4 w-4 text-primary" />
    Theme & Colors
  </h3>
  <div className="flex rounded-lg border border-border/50 bg-muted/40 p-1">
    {(["theme", "custom"] as const).map((opt) => (
      <button
        key={opt}
        onClick={() => onModeChange(opt)}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
          mode === opt
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={mode === opt}
      >
        {opt === "theme" ? "Theme" : "Custom"}
      </button>
    ))}
  </div>
</div>
```

### Theme Preset Cards

```tsx
<div className="grid grid-cols-3 gap-3">
  {themes.map((theme) => {
    const isActive = theme.id === value;
    return (
      <button
        key={theme.id}
        onClick={() => onChange(theme.id)}
        className={cn(
          "group relative flex flex-col items-center gap-2.5 rounded-xl p-3 transition-all",
          "border-2 hover:scale-[1.02] hover:shadow-md",
          isActive
            ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
            : "border-border/60 bg-card hover:border-primary/40"
        )}
      >
        {/* Color swatch trio */}
        <div className="flex gap-1.5">
          {["base", "background", "foreground"].map((key) => (
            <div
              key={key}
              className="h-6 w-6 rounded-full shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
              style={{ backgroundColor: theme.colors[key].color }}
            />
          ))}
        </div>
        
        <span className={cn(
          "text-xs font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}>
          {theme.name}
        </span>

        {isActive && (
          <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white shadow-sm">
            <CheckIcon className="h-3 w-3" strokeWidth={3} />
          </div>
        )}
      </button>
    );
  })}
</div>
```

### Color Controls with Blend Mode Awareness

Since tinting uses `mix-blend-mode: multiply`, colors apply differently than flat fills:

```tsx
<div className="grid grid-cols-2 gap-3">
  {(["base", "background", "foreground", "symbol"] as const).map((key) => (
    <label
      key={key}
      className="group relative flex items-center justify-between rounded-xl border border-border/60 
                 bg-muted/20 px-3 py-2.5 transition-all hover:border-primary/40 cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        <div
          className="relative h-8 w-8 rounded-lg shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-105"
          style={{ backgroundColor: value[key] }}
        >
          <input
            type="color"
            value={value[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
        <div>
          <span className="text-sm font-medium">{labels[key].label}</span>
          <p className="text-xs text-muted-foreground">{labels[key].description}</p>
        </div>
      </div>
      <span className="text-xs font-mono text-muted-foreground uppercase">
        {value[key]}
      </span>
    </label>
  ))}
</div>

{/* Blend mode hint */}
<p className="text-xs text-muted-foreground mt-2">
  Colors use multiply blending to preserve PNG detail and shadows.
</p>
```

### Custom Mode Indicator

When custom colors are active, show a clear indicator:

```tsx
{hasCustomColors && (
  <Badge variant="warning" size="sm" className="gap-1">
    <SparklesIcon className="h-3 w-3" />
    Custom colors active
  </Badge>
)}
```

---

## Preview & Layout

### Sticky Preview Panel

```tsx
<div className="space-y-4 lg:sticky lg:top-20 self-start">
  <section className="rounded-2xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-6">
    {/* Header with size toggle */}
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <SwatchIcon className="h-4 w-4 text-primary" />
        Badge Preview
      </h3>
      <div className="flex rounded-lg border border-border/40 bg-muted/30 p-1">
        {(["sm", "md", "lg"] as const).map((size) => (
          <button
            key={size}
            onClick={() => setPreviewSize(size)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              previewSize === size
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {size.toUpperCase()}
          </button>
        ))}
      </div>
    </div>

    {/* Preview with glow */}
    <div className="flex items-center justify-center py-8">
      <BadgePreviewEnhanced icon={draft.icon} theme={currentTheme} size={previewSize} showGlow />
    </div>

    {/* Layer summary chips */}
    <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-border/30">
      {summaryChips.map((chip) => (
        <Badge key={chip.label} variant={chip.variant} size="sm">
          {chip.label}
        </Badge>
      ))}
    </div>
  </section>
</div>
```

### Glow Effect

```tsx
{showGlow && (
  <div
    className="absolute inset-0 rounded-full opacity-30 blur-xl pointer-events-none"
    style={{ background: `radial-gradient(circle, ${baseTint}60, transparent 70%)` }}
  />
)}
```

### Mini Layer Stack View (Alternative)

For power users who want to see exact render order:

```tsx
<details className="mt-4">
  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
    View layer order →
  </summary>
  <div className="mt-2 space-y-1 text-xs font-mono">
    {draft.icon.backgrounds?.map((bg, i) => (
      <div key={bg.id} className="flex items-center gap-2 text-teal-600">
        <span className="w-6 text-right opacity-60">bg.{i}</span>
        <span>{bg.id}</span>
      </div>
    ))}
    {draft.icon.base && (
      <div className="flex items-center gap-2 text-purple-600 font-semibold">
        <span className="w-6 text-right">base</span>
        <span>{draft.icon.base.id}</span>
      </div>
    )}
    {draft.icon.foregrounds?.map((fg, i) => (
      <div key={fg.id} className="flex items-center gap-2 text-amber-600">
        <span className="w-6 text-right opacity-60">fg.{i}</span>
        <span>{fg.id}</span>
      </div>
    ))}
    {draft.icon.symbol && (
      <div className="flex items-center gap-2 text-rose-600 font-semibold">
        <span className="w-6 text-right">sym</span>
        <span>{draft.icon.symbol.id}</span>
      </div>
    )}
  </div>
</details>
```

---

## Accessibility & Keyboard Navigation

### Focus Management

All interactive elements must have visible focus states:

```scss
// Button/thumbnail focus
@apply focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2;

// Input focus
@apply focus:border-primary focus:ring-2 focus:ring-primary/20;
```

### ARIA Attributes

```tsx
// Toggle buttons
<button aria-pressed={isSelected} aria-label={`Select ${asset.label}`}>

// Reorder controls
<button aria-label="Move up" disabled={idx === 0}>
<button aria-label="Move down" disabled={idx === selected.length - 1}>
<button aria-label={`Remove ${asset.label}`}>

// Stack list
<div role="list" aria-label="Selected background layers">
  <div role="listitem">...</div>
</div>
```

### Keyboard Patterns

| Action | Key |
|--------|-----|
| Navigate thumbnails | Arrow keys |
| Select/toggle | Enter or Space |
| Move item up | Alt + ↑ |
| Move item down | Alt + ↓ |
| Remove item | Delete or Backspace |
| Close dropdown | Escape |

```tsx
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowUp' && e.altKey) {
    e.preventDefault();
    move(idx, -1);
  } else if (e.key === 'ArrowDown' && e.altKey) {
    e.preventDefault();
    move(idx, 1);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    remove(item.id);
  }
};
```

### Color Contrast with Blend Modes

Blend modes can reduce contrast. Ensure:

1. **Labels and text** remain on solid backgrounds, not blended
2. **Focus rings** use `ring-offset` to create separation
3. **Status badges** use opaque backgrounds
4. **Order numbers** (#1, #2) have sufficient contrast against thumbnails

```tsx
// High-contrast order indicator
<span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center 
                 rounded-full bg-foreground text-background text-[10px] font-bold shadow-sm">
  {idx + 1}
</span>
```

### Screen Reader Announcements

```tsx
// Live region for stack changes
<div aria-live="polite" className="sr-only">
  {announcement}
</div>

// Announce changes
setAnnouncement(`${asset.label} added to ${type} stack as item ${selected.length + 1}`);
setAnnouncement(`${asset.label} removed from ${type} stack`);
setAnnouncement(`${asset.label} moved to position ${newIndex + 1}`);
```

---

## Typography & Spacing Reference

### Typography Hierarchy

| Element | Classes |
|---------|---------|
| Section heading | `text-sm font-semibold text-foreground` |
| Section description | `text-xs text-muted-foreground` |
| Form label | `text-sm font-medium text-foreground` |
| Required indicator | `text-destructive` (red *) |
| Input text | `text-sm` |
| Badge/chip | `text-xs font-medium` |
| Hex values | `text-xs font-mono text-muted-foreground` |
| Order numbers | `text-xs font-mono text-muted-foreground` |
| Hint text | `text-xs text-muted-foreground italic` |

### Spacing Scale

| Context | Value |
|---------|-------|
| Section gap | `space-y-6` |
| Within section | `space-y-4` or `space-y-3` |
| Grid gaps | `gap-2` or `gap-3` |
| Card padding | `p-5` or `p-6` |
| Input padding | `px-3 py-2` |
| Button padding | `px-3 py-2.5` |
| Thumbnail size | 32×32 (sm grid), 48×48 (lg grid) |
| Color swatch | 24×24 (theme), 32×32 (picker) |

---

## Performance Guidance

### 1. Asset Size Strategy

```tsx
const sizeForContext = {
  selector: 'sm',    // 56px thumbnails in layer grids
  preview: 'md',     // 88px live badge preview
  export: 'lg',      // 140px final saved asset
};

// In MultiLayerSelector
<Image src={asset.sizes.sm} width={32} height={32} />

// In BadgePreviewEnhanced
const normalizedSize = normalizeSize(size); // defaults to 'md'
<TintedLayerImage src={resolveAssetUrl(id, normalizedSize)} size={config.image} />
```

### 2. Lazy Loading Thumbnails

```tsx
// Native lazy loading
<Image src={asset.sizes.sm} loading="lazy" alt={asset.label} />

// Or with next/image (auto-optimized)
import Image from "next/image";
<Image src={asset.sizes.sm} width={32} height={32} unoptimized />
```

### 3. Memoization for Stacks

```tsx
// Memoize stack rendering
const renderedBackgrounds = useMemo(
  () => (icon.backgrounds ?? []).map((item) => ({
    ...item,
    url: resolveAssetUrl(item.id, size),
    tint: getEffectiveColor("background", icon, theme, item),
  })),
  [icon.backgrounds, icon.mode, icon.customColors, theme, size]
);

// Memoize asset lookups
const assetMap = useMemo(
  () => new Map(assets.map((a) => [a.id, a])),
  [assets]
);

// Memoize preview component
const BadgePreview = memo(function BadgePreview({ icon, theme, size }) {
  // ...
});
```

### 4. Debounced Color Updates

```tsx
const debouncedColorChange = useMemo(
  () => debounce((key: string, color: string) => {
    handleColorChange({ [key]: color });
  }, 50), // Fast for responsive feel
  [handleColorChange]
);
```

### 5. Stack Order Normalization

```tsx
// Ensure consistent order on any stack change
export function ensureLayerOrder(items: AchievementLayerStackItem[] = []): AchievementLayerStackItem[] {
  return [...items]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item, idx) => ({ ...item, order: idx }));
}

// Apply on every stack mutation
const handleStackChange = (key, next) => {
  setDraft((prev) => ({
    ...prev,
    icon: { ...prev.icon, [key]: ensureLayerOrder(next) },
  }));
};
```

### 6. Skeleton Loading States

```tsx
function AssetGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border/40 p-2.5">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
```

### 7. Blend Mode Performance

CSS blend modes can be GPU-intensive with many layers. Mitigations:

```tsx
// Limit visible layers in preview
const MAX_PREVIEW_LAYERS = 10;
const limitedBackgrounds = icon.backgrounds?.slice(0, MAX_PREVIEW_LAYERS);

// Use will-change for smoother animations
<div style={{ willChange: 'transform' }} className="...">

// Reduce blur radius for glow
<div className="blur-lg" /> // Instead of blur-xl
```

---

## Component Quick Reference

### File Locations

```
features/admin/achievements/
├── AchievementAdminPage.tsx      # Main page with library grid
├── AchievementLibraryGrid.tsx    # Grid of existing badges
├── assets.ts                     # Asset registry (47 items)
├── types.ts                      # TypeScript definitions
├── data.ts                       # Mock data and theme presets
├── icon-utils.ts                 # normalizeIconConfig, getEffectiveColor
│
└── editor/
    ├── AchievementEditorPanel.tsx     # Two-column editor layout
    │
    └── components/
        ├── BadgePreviewEnhanced.tsx   # Live layered preview with stacks
        ├── TintedLayerImage.tsx       # Single tinted layer (blend modes)
        ├── ThemeSelectorEnhanced.tsx  # Theme presets + mode toggle
        ├── ColorControlsEnhanced.tsx  # 4 color pickers with blend hints
        ├── LayerSelectorEnhanced.tsx  # Single-selection (base, symbol)
        ├── MultiLayerSelector.tsx     # Stack selection (backgrounds, foregrounds)
        ├── MetadataFormEnhanced.tsx   # Title, description, coins
        └── PublishingControls.tsx     # Status, roles, orgs, frame sync
```

### Type Definitions

```typescript
// Stack item (new)
type AchievementLayerStackItem = {
  id: string;
  color?: string;       // Per-item color override
  opacity?: number;     // Per-item opacity (future)
  order?: number;       // Render order within stack
};

// Core badge config (updated)
type AchievementIconConfig = {
  mode: 'theme' | 'custom';
  themeId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  base: AchievementLayerStackItem | null;       // Single
  symbol: AchievementLayerStackItem | null;     // Single
  backgrounds: AchievementLayerStackItem[];     // Stack (0..N)
  foregrounds: AchievementLayerStackItem[];     // Stack (0..N)
  customColors?: Partial<Record<AchievementAssetType, string>>;
  layers?: { ... };                              // Legacy compat
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

| Type       | Count | Examples |
|------------|-------|----------|
| Base       | 7     | circle, diamond, hexagon, shield, laurel_ring |
| Background | 9     | spikes (5), wings (4) |
| Foreground | 11    | king_crown (2), queen_crown (2), ribbon (2), stars (5) |
| Symbol     | 20    | arrow_up, book, checkmark, crown, dice, flash, heart, trophy |

### Render Order

```
1. backgrounds[0]  ← Furthest back
2. backgrounds[1]
3. ...
4. base            ← Foundation
5. foregrounds[0]
6. foregrounds[1]
7. ...
8. symbol          ← Top layer
```

---

## Summary

The Badge Builder with stacking support follows a **"layer, stack, tint"** workflow:

1. **Choose base** → Single foundational shape
2. **Build background stack** → Wings, spikes, laurels (0..N, ordered)
3. **Build foreground stack** → Crowns, stars, ribbons (0..N, ordered)
4. **Pick symbol** → Single central icon
5. **Apply theme or customize** → Color palette with blend-mode tinting
6. **Review in preview** → Sticky panel with layer summary
7. **Add metadata** → Title, description, rewards
8. **Publish** → Status, roles, orgs, frame sync

### Key UX Patterns

| Pattern | Implementation |
|---------|----------------|
| Single selection | Radio-style thumbnail grid with checkmark |
| Multi-selection | Toggle grid + ordered stack list with reorder controls |
| Reordering | Up/down buttons with Alt+Arrow keyboard shortcuts |
| Color tinting | CSS blend modes (multiply + screen) preserving PNG detail |
| Mode switching | Segmented toggle with clear "Custom" indicator |
| Layer summary | Chips in preview panel + optional timeline view |
| Empty states | Italic hints with lightbulb icon |

### Design Tokens

| Token | Value |
|-------|-------|
| Border (default) | `border-border/60` |
| Border (selected) | `border-primary` |
| Background (card) | `bg-card` or `bg-muted/20` |
| Background (selected) | `bg-primary/5` |
| Focus ring | `ring-2 ring-primary/50 ring-offset-2` |
| Section padding | `p-5` or `p-6` |
| Grid gap | `gap-2` |

Performance is maintained through lazy loading, memoization, size-appropriate asset fetching, and stack order normalization.
