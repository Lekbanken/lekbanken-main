# Marketing / Public Site Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Purpose

Marketing / Public Site Domain ansvarar för den publika ytan (landningssidor) och de "public-first" flöden som leder in i appen: routing, copy/sektioner, CTA:er och auth-entrypoints.

Den här domänen äger **inte** appens kärn-data eller admin-flöden. Den ska vara en tunn komposition av UI-komponenter och navigation.

## Key responsibilities

- Publika landningssidor och informationssidor
- Pricing/features-sidor
- Public auth entrypoints (login/signup/reset) med redirect-stöd
- Gemensam marketing layout (header/footer)

## Non-goals

- Ingen egen datamodell eller domänlogik som blir "source of truth"
- Ingen betalningslogik (ligger i Billing/Licensing)
- Ingen tenant/admin-konfiguration

## Route map (Next.js App Router)

Marketing är primärt implementerat i Next.js route group:

- `app/(marketing)/layout.tsx` + `app/(marketing)/layout-client.tsx`
  - Wrapper för marketing routes med gemensam navigation.
- `app/(marketing)/page.tsx`
  - Landningssida som renderar marketing-sektioner.
  - Hanterar `?redirect=` (se "Redirect contract").
- `app/(marketing)/features/page.tsx`
  - Statisk features-sida.
- `app/(marketing)/pricing/page.tsx`
  - Statisk pricing-sida.

Auth (public entrypoints) ligger under marketing-gruppen:

- `app/(marketing)/auth/login/page.tsx`
- `app/(marketing)/auth/signup/page.tsx`
- `app/(marketing)/auth/reset-password/page.tsx`

Legal ligger utanför marketing-gruppen men är fortfarande "public":

- `app/legal/privacy/*`
- `app/legal/terms/*`

## UI composition

Marketing-landningssidan är en komposition av komponenter i `components/marketing/*`, t.ex.

- `Hero`, `FeatureGrid`, `StepsTimeline`, `StepsSpotlight`, `Testimonials`, `PricingSection`, `LoginCta`
- `Header`, `Footer`

Princip:
- Komponenterna ska vara presentational och hålla minimal logik.
- Navigation/redirect-beteende hör hemma i route/page-nivå.

## Redirect contract (landing → auth/app)

`app/(marketing)/page.tsx` stödjer `?redirect=<path>`.

Regel:
- Om användaren är autentiserad: gå direkt till `redirect`.
- Annars: gå till `/auth/login?redirect=<redirect>`.

Detta minimerar "flash" och säkerställer att deep links kan landa på marketing men ändå ta användaren rätt.

## Boundaries & dependencies

- Auth state: `useAuth()` används för att avgöra om redirect ska gå till app eller login.
- App navigation: redirect pekar typiskt på `/app/*` (app shell) men marketing ska inte anta mer än att en path kan navigeras till.

Relaterade domäner:
- Accounts/Auth: autentisering, sessions, redirect efter login
- Billing & Licensing: prissättning/produkter (marketing visar info men äger inte regler)
- Platform: routing, middleware, headers/SEO (om tillämpligt)

## Current state (reality check)

- Marketing yta finns och är aktiv: landing + features + pricing.
- Public auth entrypoints finns under `(marketing)/auth/*`.
- Legal-sidor finns under `app/legal/*`.

## Future extensions (optional)

- SEO metadata (per route)
- Guides/articles (om det behövs)
- Funnel-mätning/analytics (om ROI finns)
