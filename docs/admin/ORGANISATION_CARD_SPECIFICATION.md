# 🏢 Organisationskort (Organisation Card) – Complete Specification

## Metadata

- Owner: System Admin Team
- Status: draft
- Date: 2026-01-04
- Last updated: 2026-03-21
- Last validated: -

> Draft specification for the organisation card as the primary system-admin tenant management view.

> **Primary admin view for tenant management in Lekbanken**

## Metadata

| Field | Value |
|-------|-------|
| Owner | System Admin Team |
| Status | Specification Ready |
| Created | 2026-01-03 |
| Related Code | `features/admin/organisations/` |
| Database Tables | `tenants`, `tenant_branding`, `tenant_domains`, `tenant_features`, `tenant_subscriptions`, `user_tenant_memberships`, `tenant_audit_logs`, `billing_accounts` |

---

## Executive Summary

The **Organisationskort** (Organization Card) is the central control panel for system administrators to manage individual tenants in Lekbanken's multi-tenant SaaS platform. It serves as:

- **Single Source of Truth** for all tenant configuration
- **Control Panel** for features, licenses, domains, and access
- **Support Hub** for troubleshooting, onboarding, and incident handling
- **Billing Gateway** linking to Stripe and subscription management

### Design Principles

1. **Desktop-first** – Optimized for admin workflows, not mobile
2. **Sectioned layout** – Clear visual hierarchy with collapsible sections
3. **Read-heavy, action-light** – Most data is read-only; actions are deliberate
4. **Audit-everything** – All mutations logged to `tenant_audit_logs`
5. **Scalable** – Prepared for Phase B/C features (self-service domains, AI features)

---

## Navigation & Access

### URL Structure
```
/admin/organisations                     → List view (existing)
/admin/organisations/[tenantId]          → Organisation Card (NEW)
/admin/organisations/[tenantId]/members  → Members sub-page
/admin/organisations/[tenantId]/features → Features sub-page
/admin/organisations/[tenantId]/domains  → Domains sub-page
/admin/organisations/[tenantId]/audit    → Full audit log
```

### Access Control
- **Required Role**: `system_admin` (global role)
- **RLS**: All queries use service role or system admin context
- **Audit**: All write operations logged with actor_user_id

---

## Page Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Breadcrumbs: Admin > Organisationer > {name}]                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ STICKY HEADER                                                ││
│  │ ┌──────┐ Organisationsnamn              [Status Badge]       ││
│  │ │ Logo │ slug • UUID (copy) • Created 2024-01-15            ││
│  │ └──────┘                                  [⚙️ Actions ▼]     ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  [Tabs: Översikt | Medlemmar | Funktioner | Domäner | Audit]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ 1. Grundinformation  │  │ 2. Kontakt & Ägarskap│             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ 3. Branding          │  │ 4. Språk & Region    │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 5. Fakturering & Prenumeration                   │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 6. Custom Domain                                  │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 7. Funktioner & Moduler (Summary)                │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 8. Medlemmar (Summary)                           │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 9. Säkerhet & Loggning                           │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │ 10. Admin Actions (Danger Zone)                  │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section Specifications

### 🧩 1. Grundinformation (Tenant Identity)

**Purpose:** Uniquely identify the organization and reduce support friction.

#### Fields

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Organisationsnamn | `tenants.name` | ✅ | Input |
| Slug | `tenants.slug` | ❌ (after creation) | Text + Badge "read-only" |
| Tenant UUID | `tenants.id` | ❌ | Text + Copy button |
| Status | `tenants.status` | ✅ | Select dropdown |
| Type | `tenants.type` | ✅ | Select dropdown |
| Skapad | `tenants.created_at` | ❌ | Formatted date |
| Skapad av | `tenants.created_by` → `users.email` | ❌ | Text |
| Senast uppdaterad | `tenants.updated_at` | ❌ | Relative time |

#### Status Values (from DB)
```typescript
type TenantStatus = 'active' | 'trial' | 'suspended' | 'archived' | 'demo';
```

#### Type Values (from DB)
```typescript
type TenantType = 'school' | 'sports' | 'workplace' | 'private' | 'demo' | 'organisation';
```

#### Business Rules
- UUID and slug are immutable after creation
- Status change triggers `tenant_audit_logs` entry
- Trial status shows `trial_ends_at` countdown

#### Component
```tsx
<OrganisationIdentitySection tenant={tenant} onUpdate={handleUpdate} />
```

---

### 👤 2. Kontakt & Ägarskap (Contact & Ownership)

**Purpose:** Clear responsibility chain for billing, support, and legal matters.

#### Fields

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Primär kontaktperson | `tenants.contact_name` | ✅ | Input |
| Kontakt-email | `tenants.contact_email` | ✅ | Input (email) |
| Telefonnummer | `tenants.contact_phone` | ✅ | Input (tel) |
| Intern anteckning | `tenants.metadata.admin_notes` | ✅ | Textarea |

#### Business Rules
- Contact person ≠ necessarily the billing owner
- Admin notes visible only to system_admin
- Email used for important notifications

#### Component
```tsx
<OrganisationContactSection tenant={tenant} onUpdate={handleUpdate} />
```

---

### 🎨 3. Branding & Visuella inställningar

**Purpose:** Tenant-specific identity within the app.

#### Fields (from `tenant_branding` table)

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Logo | `tenant_branding.logo_media_id` → `media` | ✅ | Image upload |
| Brand name override | `tenant_branding.brand_name_override` | ✅ | Input |
| Primär färg | `tenant_branding.primary_color` | ✅ | Color picker |
| Sekundär färg | `tenant_branding.secondary_color` | ✅ | Color picker |
| Accentfärg | `tenant_branding.accent_color` | ✅ | Color picker |
| Tema | `tenant_branding.theme` | ✅ | Select (light/dark/auto) |

#### Future Fields (Phase B)
- Favicon (light mode)
- Favicon (dark mode)
- Icon (square/round)
- Custom CSS overrides

#### Component
```tsx
<OrganisationBrandingSection 
  tenantId={tenant.id} 
  branding={branding} 
  onUpdate={handleBrandingUpdate} 
/>
```

---

### 🌍 4. Språk & Regionala inställningar

**Purpose:** Localization and correct user experience.

#### Fields

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Standardspråk | `tenants.default_language` | ✅ | Select (sv/no/en) |
| Huvudspråk | `tenants.main_language` | ✅ | Select (enum) |
| Datumformat | (derived from language) | ❌ | Text (info) |
| Tidszon | (future) | ❌ | Placeholder |

#### Component
```tsx
<OrganisationLocaleSection tenant={tenant} onUpdate={handleUpdate} />
```

---

### 💳 5. Fakturering & Prenumeration (Billing & Subscription)

**Purpose:** Economic control and transparency. Links to Stripe.

#### Fields

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Stripe Customer ID | `billing_accounts.provider_customer_id` | ❌ | Text + Copy |
| Subscription Status | `tenant_subscriptions.status` | ❌ | Badge |
| Plan | `billing_products.name` (via join) | ❌ | Text |
| Seats Purchased | `tenant_subscriptions.seats_purchased` | ❌ | Number |
| Seats Used | (count from memberships) | ❌ | Number + progress |
| Renewal Date | `tenant_subscriptions.renewal_date` | ❌ | Date |
| Start Date | `tenant_subscriptions.start_date` | ❌ | Date |

#### Actions
- **"Öppna i Stripe Dashboard"** → External link to Stripe customer page
- **"Hantera prenumeration"** → Link to `/admin/billing/subscriptions?tenant={id}`

#### Business Rules
- All billing changes happen in Stripe; admin view is read-only mirror
- Show warning if seats_used > seats_purchased

#### Component
```tsx
<OrganisationBillingSection 
  tenantId={tenant.id}
  billingAccount={billingAccount}
  subscription={subscription}
/>
```

---

### 🌐 6. Egen URL / Custom Domain

**Purpose:** Manage tenant's domain connection (from Phase A implementation).

#### Fields (from `tenant_domains` table)

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Hostname | `tenant_domains.hostname` | ✅ | Input |
| Status | `tenant_domains.status` | ✅ | Select (pending/active/suspended) |
| Kind | `tenant_domains.kind` | ✅ | Select (subdomain/custom) |
| Is Primary | (derived) | ✅ | Radio |
| Verified At | `tenant_domains.verified_at` | ❌ | Date/null |

#### Inline How-To Guide
```
┌──────────────────────────────────────────────────────────────┐
│ 📖 Så här kopplar du en egen domän                           │
├──────────────────────────────────────────────────────────────┤
│ 1. Lägg en DNS CNAME-post: example.com → cname.vercel-dns.com│
│ 2. Lägg domänen i tabellen nedan                             │
│ 3. Vänta på verifiering (automatisk inom 24h)                │
│ 4. Status ändras till "active" när klar                      │
└──────────────────────────────────────────────────────────────┘
```

#### Actions
- **"Lägg till domän"** → Dialog to add new domain
- **"Ta bort"** → Confirm dialog, removes domain
- **"Verifiera nu"** → Manual DNS check trigger

#### Component
```tsx
<OrganisationDomainsSection 
  tenantId={tenant.id}
  domains={domains}
  onAdd={handleAddDomain}
  onUpdate={handleUpdateDomain}
  onRemove={handleRemoveDomain}
/>
```

---

### 🧠 7. Funktioner & Moduler (Feature Flags)

**Purpose:** Fine-grained control over functionality per tenant.

#### Fields (from `tenant_features` table)

| Field | Source | Editable | UI Element |
|-------|--------|----------|------------|
| Feature Key | `tenant_features.feature_key` | ❌ | Text |
| Enabled | `tenant_features.enabled` | ✅ | Toggle switch |
| Value | `tenant_features.value` (JSON) | ✅ | JSON editor |

#### Predefined Feature Keys
```typescript
const FEATURE_KEYS = [
  'games',
  'planner', 
  'coach_diagrams',
  'badges',
  'ai_features',
  'library',
  'conversation_cards',
  'experimental',
] as const;
```

#### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Funktioner & Moduler                            [Visa alla] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┬─────────┬─────────────┐ │
│ │ Spel (games)                    │ [🔘 ON] │ ⚙️ Config   │ │
│ ├─────────────────────────────────┼─────────┼─────────────┤ │
│ │ Planering (planner)             │ [🔘 ON] │             │ │
│ ├─────────────────────────────────┼─────────┼─────────────┤ │
│ │ Coach Diagram                   │ [○ OFF] │             │ │
│ ├─────────────────────────────────┼─────────┼─────────────┤ │
│ │ Märken (badges)                 │ [🔘 ON] │             │ │
│ ├─────────────────────────────────┼─────────┼─────────────┤ │
│ │ AI-funktioner                   │ [○ OFF] │ 🧪 Beta     │ │
│ ├─────────────────────────────────┼─────────┼─────────────┤ │
│ │ Experimentella funktioner       │ [○ OFF] │ ⚠️ Unstable │ │
│ └─────────────────────────────────┴─────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Component
```tsx
<OrganisationFeaturesSection 
  tenantId={tenant.id}
  features={features}
  onToggle={handleFeatureToggle}
/>
```

---

### 👥 8. Medlemmar & Licenser (Members Overview)

**Purpose:** Quick overview of users; full management on sub-page.

#### Summary View Fields

| Field | Source | UI Element |
|-------|--------|------------|
| Total medlemmar | `count(user_tenant_memberships)` | Stat card |
| Owners | `count(role='owner')` | Stat card |
| Admins | `count(role='admin')` | Stat card |
| Members | `count(role='member')` | Stat card |
| Pending invites | `count(tenant_invitations.status='pending')` | Stat card |

#### Quick List (top 5)
```
┌─────────────────────────────────────────────────────────────┐
│ Medlemmar                                    [Visa alla →]  │
├─────────────────────────────────────────────────────────────┤
│ 👤 Anna Svensson    anna@example.com    Owner    ✅ Active  │
│ 👤 Erik Johansson   erik@example.com    Admin    ✅ Active  │
│ 👤 Lisa Nilsson     lisa@example.com    Member   ✅ Active  │
│ 👤 Oscar Berg       oscar@example.com   Member   ⏳ Invited │
│ +12 fler medlemmar                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Full Page Actions (`/admin/organisations/[id]/members`)
- Invite user
- Change role
- Assign/remove license
- Deactivate member
- Remove from organization

#### Component
```tsx
<OrganisationMembersSummary 
  tenantId={tenant.id}
  members={membersSummary}
  onViewAll={() => router.push(`/admin/organisations/${id}/members`)}
/>
```

---

### 🛡️ 9. Säkerhet & Loggning (Security & Audit)

**Purpose:** Traceability and compliance.

#### Fields

| Field | Source | UI Element |
|-------|--------|------------|
| Senaste inloggning | (from auth logs) | Relative time |
| Senaste ändring | `tenants.updated_at` | Relative time |
| Senast uppdaterad av | `tenants.updated_by` | User name/email |

#### Recent Audit Events (last 5)
```
┌─────────────────────────────────────────────────────────────┐
│ Senaste aktivitet                           [Full logg →]   │
├─────────────────────────────────────────────────────────────┤
│ 🔄 status_changed: active → suspended    2h ago    @admin   │
│ ➕ member_added: lisa@example.com         1d ago    @owner   │
│ ⚙️ feature_toggled: ai_features=true      3d ago    @admin   │
│ 🎨 branding_updated                       1w ago    @owner   │
│ 📧 contact_updated                        2w ago    @admin   │
└─────────────────────────────────────────────────────────────┘
```

#### Component
```tsx
<OrganisationAuditSection 
  tenantId={tenant.id}
  recentEvents={auditEvents}
  onViewFullLog={() => router.push(`/admin/organisations/${id}/audit`)}
/>
```

---

### 🧯 10. Admin Actions (Danger Zone)

**Purpose:** Clear, safe system actions with proper confirmation.

#### Actions

| Action | Effect | Confirmation | Reversible |
|--------|--------|--------------|------------|
| Suspend | `status → 'suspended'` | Single confirm | ✅ Yes |
| Reactivate | `status → 'active'` | Single confirm | ✅ Yes |
| Archive | `status → 'archived'` | Double confirm | ⚠️ Partial |
| Delete | Hard delete all data | Triple confirm + type slug | ❌ No |

#### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Danger Zone                                              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Suspend organisation                                     │ │
│ │ Temporarily disable access for all members.              │ │
│ │                                       [Suspend]          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Archive organisation                                     │ │
│ │ Mark as archived. Members lose access but data remains.  │ │
│ │                                       [Archive]          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 Delete organisation permanently                       │ │
│ │ This action cannot be undone. All data will be deleted. │ │
│ │ Type "demo-org" to confirm:  [____________]              │ │
│ │                                       [Delete Forever]   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Component
```tsx
<OrganisationDangerZone 
  tenant={tenant}
  onSuspend={handleSuspend}
  onReactivate={handleReactivate}
  onArchive={handleArchive}
  onDelete={handleDelete}
/>
```

---

## Data Fetching Strategy

### Primary Query
```typescript
// Server component or initial load
async function getOrganisationDetails(tenantId: string) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select(`
      *,
      created_by_user:users!tenants_created_by_fkey(email, full_name),
      tenant_branding(*),
      tenant_domains(*),
      tenant_features(*),
      tenant_subscriptions(
        *,
        billing_product:billing_products(name, description)
      ),
      user_tenant_memberships(count),
      tenant_audit_logs(
        id, event_type, payload, created_at,
        actor:users(email, full_name)
      )
    `)
    .eq('id', tenantId)
    .single();
  
  return tenant;
}
```

### Billing Account Query (Separate)
```typescript
async function getBillingAccount(tenantId: string) {
  const { data } = await supabase
    .from('billing_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', 'stripe')
    .single();
  
  return data;
}
```

---

## State Management

```typescript
// Recommended: React Query for server state
const { data: organisation, refetch } = useQuery({
  queryKey: ['organisation', tenantId],
  queryFn: () => getOrganisationDetails(tenantId),
});

// Mutations with optimistic updates
const updateMutation = useMutation({
  mutationFn: updateOrganisation,
  onSuccess: () => {
    queryClient.invalidateQueries(['organisation', tenantId]);
    toast.success('Organisation uppdaterad');
  },
});
```

---

## File Structure

```
features/admin/organisations/
├── OrganisationAdminPage.tsx          # List view (existing)
├── OrganisationDetailPage.tsx         # Card view (NEW)
├── types.ts                           # Extended types
├── hooks/
│   ├── useOrganisation.ts             # Main data hook
│   ├── useOrganisationMutations.ts    # Update mutations
│   └── useAuditLog.ts                 # Audit logging hook
├── components/
│   ├── OrganisationTable.tsx          # (existing)
│   ├── OrganisationEditDialog.tsx     # (existing)
│   ├── OrganisationCreateDialog.tsx   # (existing)
│   ├── card/                          # NEW: Card sections
│   │   ├── OrganisationHeader.tsx
│   │   ├── OrganisationIdentitySection.tsx
│   │   ├── OrganisationContactSection.tsx
│   │   ├── OrganisationBrandingSection.tsx
│   │   ├── OrganisationLocaleSection.tsx
│   │   ├── OrganisationBillingSection.tsx
│   │   ├── OrganisationDomainsSection.tsx
│   │   ├── OrganisationFeaturesSection.tsx
│   │   ├── OrganisationMembersSummary.tsx
│   │   ├── OrganisationAuditSection.tsx
│   │   └── OrganisationDangerZone.tsx
│   └── shared/
│       ├── CopyButton.tsx
│       ├── StatusBadge.tsx
│       └── SectionCard.tsx
└── utils/
    ├── formatters.ts
    └── validators.ts
```

---

## Extended Types

```typescript
// features/admin/organisations/types.ts

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'archived' | 'demo';
export type TenantType = 'school' | 'sports' | 'workplace' | 'private' | 'demo' | 'organisation';

export type OrganisationDetail = {
  // Core identity
  id: string;
  name: string;
  slug: string | null;
  status: TenantStatus;
  type: TenantType;
  createdAt: string;
  createdBy: { email: string; fullName: string | null } | null;
  updatedAt: string;
  updatedBy: { email: string; fullName: string | null } | null;
  
  // Contact
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  adminNotes: string | null;
  
  // Locale
  defaultLanguage: string | null;
  mainLanguage: string;
  defaultTheme: string | null;
  
  // Trial
  trialEndsAt: string | null;
  
  // Related data
  branding: TenantBranding | null;
  domains: TenantDomain[];
  features: TenantFeature[];
  subscription: TenantSubscription | null;
  billingAccount: BillingAccount | null;
  memberCount: number;
  recentAuditEvents: AuditEvent[];
};

export type TenantBranding = {
  id: string;
  logoMediaId: string | null;
  logoUrl?: string;
  brandNameOverride: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  theme: 'light' | 'dark' | 'auto' | null;
};

export type TenantDomain = {
  id: string;
  hostname: string;
  kind: 'subdomain' | 'custom';
  status: 'pending' | 'active' | 'suspended';
  verifiedAt: string | null;
  createdAt: string;
};

export type TenantFeature = {
  id: string;
  featureKey: string;
  enabled: boolean;
  value: Record<string, unknown> | null;
};

export type TenantSubscription = {
  id: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';
  seatsPurchased: number;
  startDate: string;
  renewalDate: string | null;
  cancelledAt: string | null;
  stripeSubscriptionId: string | null;
  product: {
    name: string;
    description: string | null;
  };
};

export type BillingAccount = {
  id: string;
  provider: 'stripe';
  providerCustomerId: string;
  metadata: Record<string, unknown>;
};

export type AuditEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: { email: string; fullName: string | null } | null;
};
```

---

## UX Considerations & Edge Cases

### Empty States
| Section | Empty State Message |
|---------|---------------------|
| Branding | "Ingen branding konfigurerad. Organisationen använder standardinställningar." |
| Domains | "Ingen egen domän konfigurerad. Organisationen nås via {slug}.lekbanken.no" |
| Features | "Alla standardfunktioner är aktiverade." |
| Subscription | "Ingen aktiv prenumeration. Lägg till via Stripe." |
| Audit | "Ingen aktivitet registrerad ännu." |

### Loading States
- Use skeleton loaders matching section layout
- Show section headers immediately, content loads progressively

### Error States
- Per-section error handling with retry button
- Full-page error only for critical failures (tenant not found)

### Validation
- Email format validation on contact email
- Color format validation (hex) on branding colors
- Hostname format validation on domains

### Accessibility
- All form fields have proper labels
- Focus management on section expand/collapse
- Screen reader announcements for status changes
- Keyboard navigation for all actions

---

## Future Roadmap (Phase B/C)

### Phase B: Self-Service Domains
- [ ] Tenant admin can add custom domains
- [ ] DNS verification flow with TXT record
- [ ] Automatic Vercel API integration
- [ ] Domain health monitoring

### Phase C: Advanced Features
- [ ] SSO/SAML configuration section
- [ ] Data export functionality
- [ ] Usage analytics per tenant
- [ ] Custom email templates
- [ ] Webhook configuration

---

## Why This Works for Lekbanken

1. **Unified Control Center**: Support, billing, onboarding, and incidents all start from the Organisation Card, reducing context-switching.

2. **Matches Technical Reality**: Every section maps directly to existing database tables (`tenants`, `tenant_*`), ensuring consistency between UI and data model.

3. **Scalable Architecture**: The sectioned, component-based design allows adding new features (SSO, webhooks) without redesigning the entire page.

4. **Audit-First Design**: Built-in logging for all changes ensures compliance and enables incident investigation.

5. **Progressive Disclosure**: Summary views with "show more" links prevent information overload while keeping everything accessible.

6. **Design System Compliance**: Uses existing `AdminPageLayout`, `AdminCard`, and other shared components from `components/admin/shared/`.

7. **Role-Based Security**: Clear system_admin-only access with RBAC integration already in place.

---

## Implementation Priority

| Priority | Section | Effort | Dependencies |
|----------|---------|--------|--------------|
| P0 | Page scaffold + Header | 2h | None |
| P0 | Identity section | 2h | None |
| P0 | Contact section | 1h | None |
| P1 | Domains section | 3h | Phase A complete ✅ |
| P1 | Features section | 3h | None |
| P1 | Members summary | 2h | None |
| P2 | Billing section | 4h | Stripe integration |
| P2 | Branding section | 4h | Media upload |
| P2 | Audit section | 2h | None |
| P3 | Danger Zone | 3h | Confirm dialogs |
| P3 | Locale section | 1h | None |

**Total Estimated Effort**: ~27 hours

---

## Next Steps

1. Create `OrganisationDetailPage.tsx` scaffold
2. Implement sticky header component
3. Build section components incrementally
4. Add route `/admin/organisations/[tenantId]/page.tsx`
5. Wire up data fetching with React Query
6. Add audit logging for all mutations
7. Write E2E tests for critical flows
