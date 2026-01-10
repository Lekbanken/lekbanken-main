// -----------------------------------------------------------------------------
// Module Notes & Changelog - Documentation per module
// -----------------------------------------------------------------------------

export interface ModuleNotes {
  notes: string;
  changelog: { date: string; note: string }[];
  codeSnippet: string;
}

export const moduleNotes: Record<string, ModuleNotes> = {
  'repo-docs': {
    notes: `
- Renderar Markdown-filer frÃ¥n **docs/** (top-level) direkt i Sandbox UI
- Syfte: onboarding/utforskning med samma shell/nav som Ã¶vriga sandboxen
- Dev-only: visas inte i production
    `.trim(),
    changelog: [{ date: '2025-12-18', note: 'Added repo docs viewer (docs/*.md rendered in UI)' }],
    codeSnippet: `// Repo docs live here:
docs/*.md

// UI routes:
/sandbox/docs/repo
/sandbox/docs/repo/[slug]`,
  },
  wiki: {
    notes: `
- Renderar Markdown-filer frÃ¥n **sandbox/wiki** direkt i Sandbox UI
- Syfte: onboarding/utbildning (lÃ¤sbarhet + navigering), inte "source of truth"
- Dev-only: visas inte i production
    `.trim(),
    changelog: [{ date: '2025-12-18', note: 'Added sandbox wiki viewer (markdown rendering in UI)' }],
    codeSnippet: `// Wiki files live here:
sandbox/wiki/*.md

// UI routes:
/sandbox/docs/wiki
/sandbox/docs/wiki/[slug]`,
  },
  atlas: {
    notes: `
- Enterprise atlas for frames, data, and endpoints.
- Manual layer: review flags + notes.
- Auto layer: sync timestamp (stub for MVP).
    `.trim(),
    changelog: [{ date: '2026-01-10', note: 'Added sandbox atlas registry and graph UI' }],
    codeSnippet: `// UI route:
/sandbox/atlas

// Registry + types:
app/sandbox/atlas/registry.ts
app/sandbox/atlas/types.ts`,
  },
  typography: {
    notes: `
- Uses **Inter** as primary sans-serif, **Merriweather** as secondary serif
- Type scale based on Major Third (1.25) ratio
- Font loading via next/font for optimal performance
- Line height defaults: 1.2 for headings, 1.5 for body
    `.trim(),
    changelog: [
      { date: '2025-12-09', note: 'Added type scale controls and live preview' },
      { date: '2025-12-01', note: 'Initial typography module implementation' },
    ],
    codeSnippet: `import { HeadingRamp, BodyTextPreview } from '@/app/sandbox/components/previews';

// In your component:
<HeadingRamp />
<BodyTextPreview />`,
  },

  icons: {
    notes: `
- Fyra ikon-URL:er kan testas parallellt (ljust/mÃ¶rkt original + ljust/mÃ¶rkt test)
- Logo lockup stÃ¶der fyra layouts: icon-left, icon-top, icon-only, text-only
- Storlekar: sm (24px), md (32px), lg (48px), xl (64px)
- Justerbar letter spacing och case fÃ¶r wordmark
    `.trim(),
    changelog: [
      { date: '2025-12-12', note: 'La till ikon-URL-fÃ¤lt och flyttade logolayout hit frÃ¥n /logo' },
      { date: '2025-12-09', note: 'Added logo layout controls' },
    ],
    codeSnippet: `import { LogoLockup } from '@/app/sandbox/components/previews';

<LogoLockup 
  layout="icon-left"
  size="md"
  case="title"
/>`,
  },

  colors: {
    notes: `
- Accent color defined by hue value (0-360)
- Generates full palette (50-950) from single hue
- Supports light/dark color schemes
- Surface shades: white, zinc-50, zinc-100, zinc-900, zinc-950
    `.trim(),
    changelog: [
      { date: '2025-12-09', note: 'Added accent hue picker with presets' },
    ],
    codeSnippet: `import { generateAccentPalette } from '@/app/sandbox/tokens/colors';

const palette = generateAccentPalette(262); // Lekbanken purple
// Returns: { 50: 'hsl(...)', 100: 'hsl(...)', ... 950: 'hsl(...)' }`,
  },

  gamification: {
    notes: `
- **Lekvalutan** is the in-app currency (coin icon with "L")
- Achievement tiers: bronze, silver, gold, platinum, diamond
- Coin sizes match logo sizes: sm, md, lg, xl
- Progress bars use accent color
    `.trim(),
    changelog: [
      { date: '2025-12-09', note: 'Added coin balance and achievement badge previews' },
    ],
    codeSnippet: `import { CoinBalance, AchievementBadgePreview } from '@/app/sandbox/components/previews';

<CoinBalance amount={1250} size="md" />
<AchievementBadgePreview tier="gold" />`,
  },

  'gamification-hub': {
    notes: `
- Hub for gamification surfaces and test paths
- Uses mock data for previews and links to real routes
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added gamification sandbox hub and subpages' },
    ],
    codeSnippet: `// Hub route:
/sandbox/gamification`,
  },

  'gamification-dicecoin': {
    notes: `
- DiceCoin balance + transaction previews
- Admin award flow references
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added DiceCoin sandbox page' },
    ],
    codeSnippet: `// Route:
/sandbox/gamification/dicecoin`,
  },

  'gamification-achievements': {
    notes: `
- Achievement cards, progress, and pinning context
- Snapshot uses mock data, real routes need auth
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added achievements sandbox page' },
    ],
    codeSnippet: `// Route:
/sandbox/gamification/achievements`,
  },

  'gamification-badges': {
    notes: `
- Badge component preview + admin builder context
- Backed by award_builder_exports schema
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added badges sandbox page' },
    ],
    codeSnippet: `// Route:
/sandbox/gamification/badges`,
  },

  'gamification-rewards': {
    notes: `
- Shop + unlockable surfaces
- Links to app shop and admin marketplace
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added rewards sandbox page' },
    ],
    codeSnippet: `// Route:
/sandbox/gamification/rewards`,
  },

  'gamification-library-exports': {
    notes: `
- Award builder export schema snapshot
- Links to exports API + docs
    `.trim(),
    changelog: [
      { date: '2026-01-03', note: 'Added library exports sandbox page' },
    ],
    codeSnippet: `// Route:
/sandbox/gamification/library-exports`,
  },


  spacing: {
    notes: `
- Base spacing unit: 4px (default), configurable 2-8px
- Scale multipliers: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16
- Border radius presets: 0, 4, 8, 12, 16, full
- Used consistently across all components
    `.trim(),
    changelog: [
      { date: '2025-12-09', note: 'Added spacing scale and radius controls' },
    ],
    codeSnippet: `import { generateSpacingScale } from '@/app/sandbox/tokens/spacing';

const scale = generateSpacingScale(4);
// Returns: { '1': 4, '2': 8, '3': 12, '4': 16, ... }`,
  },

  // Marketing modules
  hero: {
    notes: `
- Full-width hero section with gradient background
- Stats bar below main content
- Responsive: stacked on mobile, side-by-side on desktop
- CTA buttons use primary accent color
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial hero section implementation' },
    ],
    codeSnippet: `import { HeroSection } from '@/components/marketing/hero';

<HeroSection 
  title="LÃ¤r genom lek"
  subtitle="Sveriges roligaste lÃ¤rplattform"
/>`,
  },

  pricing: {
    notes: `
- Three pricing tiers: Free, Pro, Team
- Monthly/yearly toggle with discount display
- Highlighted "popular" tier
- Feature comparison list per tier
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial pricing component' },
    ],
    codeSnippet: `import { PricingSection } from '@/components/marketing/pricing';

<PricingSection showYearlyDiscount />`,
  },

  testimonials: {
    notes: `
- Grid layout with avatar, quote, name, role
- Responsive: 1 column mobile, 2-3 columns desktop
- Optional star rating display
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial testimonials grid' },
    ],
    codeSnippet: `import { TestimonialsSection } from '@/components/marketing/testimonials';

<TestimonialsSection />`,
  },

  header: {
    notes: `
- Sticky header with logo and navigation
- Mobile: hamburger menu with slide-out drawer
- Desktop: horizontal nav with dropdowns
- Auth buttons on the right
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial header/navigation' },
    ],
    codeSnippet: `import { MarketingHeader } from '@/components/marketing/header';

<MarketingHeader />`,
  },

  // Primitives
  buttons: {
    notes: `
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: sm, default, lg, icon
- Badge variants: default, secondary, destructive, outline, success, warning
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial button and badge showcase' },
    ],
    codeSnippet: `import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

<Button variant="default" size="lg">Click me</Button>
<Badge variant="success">Active</Badge>`,
  },

  cards: {
    notes: `
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Composable structure for flexibility
- Shadow and border variants
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial card variants' },
    ],
    codeSnippet: `import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>`,
  },

  forms: {
    notes: `
- Input, Textarea, Select, Checkbox, Radio, Switch
- Label and error message patterns
- Form validation with react-hook-form + zod
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial form components' },
    ],
    codeSnippet: `import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="you@example.com" />`,
  },

  feedback: {
    notes: `
- Empty states with icon and message
- Loading spinners and skeletons
- Alert and toast notifications
- Error boundaries
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial feedback components' },
    ],
    codeSnippet: `import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

<Skeleton className="h-4 w-[200px]" />
<Alert><AlertDescription>Info message</AlertDescription></Alert>`,
  },

  interactive: {
    notes: `
- Dialog/Modal with overlay
- Dropdown menus
- Tabs and accordions
- Tooltips and popovers
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial interactive components' },
    ],
    codeSnippet: `import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>Modal content</DialogContent>
</Dialog>`,
  },

  // App & Admin (placeholders)
  'app-main': {
    notes: `
- App shell with sidebar navigation
- Dashboard with stats cards
- GameCard component for game listings
- Leaderboard with rankings
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial app sandbox' },
    ],
    codeSnippet: `// See /sandbox/app for full component demos`,
  },
  'app-game-detail': {
    notes: `
- Sandboxvy f\u00f6r lek-detalj
- Visar tre spell\u00e4gen sida vid sida
- Anv\u00e4nd f\u00f6r att testa badges, border och layout
    `.trim(),
    changelog: [
      { date: '2025-12-30', note: 'Added game detail comparison view for play modes' },
    ],
    codeSnippet: `// UI route:
/sandbox/app/game-detail`,
  },

  'admin-main': {
    notes: `
- Admin dashboard with metrics
- User management table
- Content moderation views
- Analytics charts
    `.trim(),
    changelog: [
      { date: '2025-12-01', note: 'Initial admin sandbox' },
    ],
    codeSnippet: `// See /sandbox/admin for full component demos`,
  },
};

// Helper to get notes for a module
export function getModuleNotes(moduleId: string): ModuleNotes {
  return moduleNotes[moduleId] ?? {
    notes: 'No documentation available yet.',
    changelog: [],
    codeSnippet: '// No code snippet available',
  };
}

