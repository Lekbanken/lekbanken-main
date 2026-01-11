# Internationalization (i18n) Guide

Lekbanken uses **next-intl** for internationalization with a cookie-based locale strategy (no URL prefixes).

## Supported Locales

| Code | Language | Flag |
|------|----------|------|
| `sv` | Svenska  | 🇸🇪  |
| `en` | English  | 🇬🇧  |
| `no` | Norsk    | 🇳🇴  |

Default locale: `sv`

## Architecture Overview

```
lib/i18n/
├── config.ts           # Locale definitions, constants, helpers
├── request.ts          # Server-side locale resolution (next-intl)
├── navigation.ts       # Locale-aware navigation utilities
├── formatters.ts       # Date/number formatting hooks
├── useLocaleSwitcher.ts # Client-side locale switching
└── index.ts            # Re-exports

messages/
├── sv.json             # Swedish translations
├── en.json             # English translations
└── no.json             # Norwegian translations
```

## Locale Resolution Priority

1. **Cookie** (`lb-locale`) - User's explicit preference
2. **Accept-Language header** - Browser preference
3. **Default** - `sv` (Swedish)

## Tenant Language Integration

Use `useTenantLocale()` to respect tenant's main_language setting:

```tsx
import { useTenantLocale } from '@/lib/i18n';

function TenantAwareComponent() {
  const { 
    locale,           // Current effective locale
    tenantLocale,     // Tenant's main_language as locale
    userLocale,       // User's preference from next-intl
    isUsingTenantDefault  // True if falling back to tenant language
  } = useTenantLocale();
  
  // Use locale for formatting, etc.
}
```

## Usage Examples

### Client Components

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { useFormatters } from '@/lib/i18n';

export function MyComponent() {
  const t = useTranslations('common');
  const { dateShort, currency } = useFormatters();

  return (
    <div>
      <h1>{t('actions.save')}</h1>
      <p>{t('messages.welcome', { name: 'Johan' })}</p>
      <time>{dateShort(new Date())}</time>
      <span>{currency(299)}</span>
    </div>
  );
}
```

### Server Components

```tsx
import { getTranslations } from 'next-intl/server';
import { createServerFormatters } from '@/lib/i18n';
import { getLocale } from 'next-intl/server';

export async function MyServerComponent() {
  const t = await getTranslations('admin');
  const locale = await getLocale();
  const fmt = createServerFormatters(locale);

  return (
    <div>
      <h1>{t('nav.dashboard')}</h1>
      <time>{fmt.dateMedium(new Date())}</time>
    </div>
  );
}
```

### Language Switcher

```tsx
import { LanguageSwitcher } from '@/components/ui/language-switcher';

// In your header/navigation:
<LanguageSwitcher />

// With label:
<LanguageSwitcher showLabel />

// Custom styling:
<LanguageSwitcher variant="outline" size="sm" />
```

### Programmatic Locale Switching

```tsx
'use client';

import { useLocaleSwitcher } from '@/lib/i18n';

export function CustomSwitcher() {
  const { locale, switchLocale, isPending } = useLocaleSwitcher();

  return (
    <button 
      onClick={() => switchLocale('no')}
      disabled={isPending}
    >
      Switch to Norwegian
    </button>
  );
}
```

## Message File Structure

Messages are namespaced for better organization:

```json
{
  "common": {
    "actions": { "save": "Spara", "cancel": "Avbryt", ... },
    "status": { "loading": "Laddar...", ... },
    "labels": { "name": "Namn", ... },
    "messages": { "welcome": "Välkommen, {name}!", ... }
  },
  "admin": {
    "nav": { "dashboard": "Översikt", ... },
    "users": { "title": "Användare", ... }
  },
  "app": { ... },
  "auth": { ... },
  "errors": { ... },
  "marketing": { ... }
}
```

## Adding New Translations

1. Add keys to all three message files (`sv.json`, `en.json`, `no.json`)
2. Use the same namespace structure
3. Keep keys consistent across all locales

```json
// messages/sv.json
{
  "myFeature": {
    "title": "Min funktion",
    "description": "En beskrivning här"
  }
}

// messages/en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "A description here"
  }
}

// messages/no.json
{
  "myFeature": {
    "title": "Min funksjon",
    "description": "En beskrivelse her"
  }
}
```

## Date & Number Formatting

### Format Utilities (Non-React Contexts)

For utilities and non-React code, use the centralized format functions:

```tsx
import {
  formatDate,           // "2024-01-15"
  formatDateLong,       // "15 jan 2024"
  formatDateTime,       // "2024-01-15 14:30"
  formatDateTimeLong,   // "15 jan 2024 14:30"
  formatRelativeTime,   // "2 dagar sedan"
  formatNumber,         // "1 234"
  formatCurrency,       // "299 kr"
  formatCurrencyWithDecimals, // "299,00 kr"
  formatPercent,        // "75%"
  formatDuration,       // "1h 30m"
} from '@/lib/i18n/format-utils';

// All functions accept an optional locale parameter
formatDate('2024-01-15', 'en'); // "1/15/2024"
```

### useFormatters Hook (React Components)

The `useFormatters()` hook provides locale-aware formatting:

```tsx
const { 
  dateShort,   // "15 jan 2024"
  dateMedium,  // "15 januari 2024"
  dateFull,    // "måndag 15 januari 2024"
  time,        // "14:30"
  dateTime,    // "15 jan 2024 14:30"
  relative,    // "2 dagar sedan"
  number,      // "1 234,56"
  currency,    // "299,00 kr"
  percent,     // "75 %"
  locale,      // "sv"
} = useFormatters();
```

For server components, use `createServerFormatters(locale)`.

## Migration Strategy

### Extracting Hardcoded Strings

When migrating existing components:

1. Identify hardcoded Swedish strings
2. Add translation keys to all message files
3. Replace hardcoded strings with `t()` calls
4. Test in all three locales

**Before:**
```tsx
<Button>Spara ändringar</Button>
```

**After:**
```tsx
const t = useTranslations('common');
<Button>{t('actions.saveChanges')}</Button>
```

### Replacing Intl Formatters

Replace hardcoded `sv-SE` in Intl calls:

**Before:**
```tsx
new Intl.DateTimeFormat('sv-SE').format(date)
```

**After:**
```tsx
const { dateShort } = useFormatters();
dateShort(date)
```

## Configuration Files

### next.config.ts

```ts
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
export default withNextIntl(nextConfig);
```

### proxy.ts

Locale resolution is integrated into the Next.js 16 proxy (previously middleware).

## TypeScript Support

All locale types are fully typed:

```ts
import type { Locale } from '@/lib/i18n';

const locale: Locale = 'sv'; // ✓
const locale: Locale = 'de'; // ✗ Type error
```

## Testing

When testing components with translations:

```tsx
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/sv.json';

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="sv" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
}
```

## Related Documentation

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Planner Locales](../lib/planner/locales.json) - Planner-specific translations
