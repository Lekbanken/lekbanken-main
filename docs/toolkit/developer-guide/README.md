# Developer Guide

This guide is for developers integrating with or extending the Legendary Escape Room Toolkit.

## Table of Contents

1. [Architecture](./architecture.md)
2. [Database Schema](./database-schema.md)
3. [API Integration](./api-integration.md)
4. [Webhooks](./webhooks.md)
5. [Customization](./customization.md)
6. [Contributing](./contributing.md)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16+, React 19, TypeScript |
| Styling | Tailwind CSS, Catalyst UI |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Hosting | Vercel (recommended) |

---

## Project Structure

```
lekbanken-main/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Public marketing pages
│   ├── admin/             # Admin dashboard
│   ├── api/               # API routes
│   ├── app/               # Main application
│   ├── auth/              # Authentication pages
│   └── play/              # Participant play views
├── components/            # React components
│   ├── admin/            # Admin-specific
│   ├── play/             # Play-specific
│   └── ui/               # Reusable UI components
├── features/              # Feature modules
│   ├── admin/            # Admin features
│   └── play/             # Play runtime
├── lib/                   # Shared libraries
│   ├── accessibility/    # A11y utilities
│   ├── features/         # Feature flags
│   ├── services/         # Business logic
│   └── supabase/         # Database client
├── types/                 # TypeScript types
├── docs/                  # Documentation
└── tests/                 # Test suites
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/lekbanken.git
cd lekbanken-main

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# Run development server
npm run dev
```

### Database Setup

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push schema migrations
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --local > types/supabase.ts
```

---

## Key Concepts

### Feature Flags

Feature flags control feature availability per tenant:

```typescript
import { isFeatureEnabled, getQuotaLimit } from '@/lib/features/tenant-features';

// Check if feature is enabled
if (isFeatureEnabled(tenant, 'advanced_triggers')) {
  // Show advanced trigger UI
}

// Check quota
const limit = getQuotaLimit(tenant, 'max_games');
if (currentGames < limit) {
  // Allow creating more games
}
```

### Trigger Engine

The trigger engine evaluates conditions and executes actions:

```typescript
import { evaluateTrigger, executeAction } from '@/features/play/hooks/useTriggerEngine';

// Evaluate trigger condition
const shouldFire = evaluateTrigger(trigger.condition, sessionState);

// Execute trigger action
if (shouldFire) {
  await executeAction(trigger.action, sessionContext);
}
```

### Realtime Updates

Use Supabase Realtime for live updates:

```typescript
import { useSupabase } from '@/lib/supabase/client';

const supabase = useSupabase();

// Subscribe to session changes
const channel = supabase
  .channel('session:' + sessionId)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'participant_sessions',
    filter: `id=eq.${sessionId}`,
  }, (payload) => {
    // Handle update
  })
  .subscribe();
```

---

## API Overview

The toolkit provides both internal and public APIs:

### Internal API (Admin)

- `/api/admin/games` - Game management
- `/api/admin/sessions` - Session management
- `/api/admin/analytics` - Analytics data

### Public API (v1)

- `/api/public/v1/games` - List games
- `/api/public/v1/sessions` - List sessions
- `/api/public/v1/sessions/[id]` - Session details

See [API Reference](../api-reference/README.md) for full documentation.

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Yes |
| `TEST_USER_EMAIL` | E2E test user email | No |
| `TEST_USER_PASSWORD` | E2E test user password | No |

---

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
# Run Playwright tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test session-lifecycle.spec.ts
```

### Type Checking

```bash
npx tsc --noEmit
```

---

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Support

- [GitHub Issues](https://github.com/your-org/lekbanken/issues)
- [API Reference](../api-reference/README.md)
- [Troubleshooting](../troubleshooting/README.md)
