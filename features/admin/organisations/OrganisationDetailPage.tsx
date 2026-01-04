'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BuildingOffice2Icon,
  ClipboardDocumentIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageLayout,
  AdminBreadcrumbs,
  AdminErrorState,
} from "@/components/admin/shared";
import { Button, Tabs, TabPanel } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

import type {
  OrganisationDetail,
  TenantStatus,
  TenantBranding,
  TenantDomain,
  TenantFeature,
  TenantSubscription,
  AuditEvent,
  MemberSummary,
} from "./types";
import { tenantStatusLabels, tenantStatusColors, tenantTypeLabels } from "./types";

// Section components
import {
  OrganisationIdentitySection,
  OrganisationContactSection,
  OrganisationBrandingSection,
  OrganisationLocaleSection,
  OrganisationBillingSection,
  OrganisationDomainsSection,
  OrganisationFeaturesSection,
  OrganisationMembersSummary,
  OrganisationMembersList,
  OrganisationAuditSection,
  OrganisationAuditFull,
  OrganisationDangerZone,
} from "./components/card";

type OrganisationDetailPageProps = {
  tenantId: string;
};

// Loading skeleton component
function OrganisationDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 bg-muted rounded-xl" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  );
}

// Copy button component
function CopyButton({ value, label }: { value: string; label?: string }) {
  const { success } = useToast();
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    success(label ? `${label} kopierad` : "Kopierad till urklipp");
  };
  
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Kopiera"
    >
      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
    </button>
  );
}

// Status badge with appropriate colors
function StatusBadge({ status }: { status: TenantStatus }) {
  const colorMap: Record<typeof tenantStatusColors[TenantStatus], string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[tenantStatusColors[status]]}`}>
      {tenantStatusLabels[status]}
    </span>
  );
}

export function OrganisationDetailPage({ tenantId }: OrganisationDetailPageProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  
  const [organisation, setOrganisation] = useState<OrganisationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const validTabs = ["overview", "members", "features", "domains", "audit"] as const;
  const initialTab = validTabs.includes(requestedTab as typeof validTabs[number])
    ? (requestedTab as typeof validTabs[number])
    : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (requestedTab && validTabs.includes(requestedTab as typeof validTabs[number])) {
      setActiveTab(requestedTab as typeof validTabs[number]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab]);

  // Load organisation details
  const loadOrganisation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Main tenant query
      // Note: Using explicit typing due to complex joins
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select(`
          *,
          tenant_domains(*),
          tenant_features(*),
          tenant_subscriptions(
            *,
            billing_product:billing_products(name)
          )
        `)
        .eq("id", tenantId)
        .single();
      
      if (tenantError) throw tenantError;
      if (!tenant) throw new Error("Organisation hittades inte");

      // Fetch branding separately (1:1 relationship)
      const { data: brandingData } = await supabase
        .from("tenant_branding")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      // Get member counts
      const { count: totalMembers } = await supabase
        .from("user_tenant_memberships")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      const { count: ownerCount } = await supabase
        .from("user_tenant_memberships")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "owner");

      const { count: adminCount } = await supabase
        .from("user_tenant_memberships")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "admin");

      const { count: pendingInvites } = await supabase
        .from("tenant_invitations")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "pending");

      // Get recent audit events
      const { data: auditEvents } = await supabase
        .from("tenant_audit_logs")
        .select(`
          id,
          event_type,
          payload,
          created_at,
          actor_user_id
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Map to OrganisationDetail
      const branding: TenantBranding | null = brandingData ? {
        id: brandingData.id,
        logoMediaId: brandingData.logo_media_id,
        brandNameOverride: brandingData.brand_name_override,
        primaryColor: brandingData.primary_color,
        secondaryColor: brandingData.secondary_color,
        accentColor: brandingData.accent_color,
        theme: brandingData.theme as TenantBranding['theme'],
      } : null;

      const domains: TenantDomain[] = (tenant.tenant_domains || []).map((d: Database["public"]["Tables"]["tenant_domains"]["Row"]) => ({
        id: d.id,
        hostname: d.hostname,
        kind: d.kind as TenantDomain['kind'],
        status: d.status as TenantDomain['status'],
        verifiedAt: d.verified_at,
        createdAt: d.created_at,
      }));

      const features: TenantFeature[] = (tenant.tenant_features || []).map((f: Database["public"]["Tables"]["tenant_features"]["Row"]) => ({
        id: f.id,
        featureKey: f.feature_key,
        enabled: f.enabled,
        value: f.value as Record<string, unknown> | null,
      }));

      const subscriptionRow = tenant.tenant_subscriptions?.[0];
      const subscription: TenantSubscription | null = subscriptionRow ? {
        id: subscriptionRow.id,
        status: subscriptionRow.status as TenantSubscription['status'],
        seatsPurchased: subscriptionRow.seats_purchased,
        startDate: subscriptionRow.start_date,
        renewalDate: subscriptionRow.renewal_date,
        cancelledAt: subscriptionRow.cancelled_at,
        stripeSubscriptionId: subscriptionRow.stripe_subscription_id,
        product: subscriptionRow.billing_product ? {
          name: (subscriptionRow.billing_product as unknown as { name: string }).name,
          description: null, // billing_products doesn't have description column
        } : null,
      } : null;

      const memberSummary: MemberSummary = {
        total: totalMembers ?? 0,
        owners: ownerCount ?? 0,
        admins: adminCount ?? 0,
        members: (totalMembers ?? 0) - (ownerCount ?? 0) - (adminCount ?? 0),
        pendingInvites: pendingInvites ?? 0,
      };

      const recentAuditEvents: AuditEvent[] = (auditEvents || []).map((e) => ({
        id: e.id,
        eventType: e.event_type,
        payload: e.payload as Record<string, unknown> | null,
        createdAt: e.created_at,
        actor: null, // Would need to join users table
      }));

      const metadata = tenant.metadata as Record<string, unknown> | null;

      const detail: OrganisationDetail = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status as TenantStatus,
        type: tenant.type as OrganisationDetail['type'],
        description: tenant.description,
        createdAt: tenant.created_at,
        createdBy: null, // Would need to join users
        updatedAt: tenant.updated_at,
        updatedBy: null, // Would need to join users
        contactName: tenant.contact_name,
        contactEmail: tenant.contact_email,
        contactPhone: tenant.contact_phone,
        adminNotes: metadata?.admin_notes as string | null ?? null,
        defaultLanguage: tenant.default_language,
        mainLanguage: tenant.main_language,
        defaultTheme: tenant.default_theme,
        trialEndsAt: tenant.trial_ends_at,
        branding,
        domains,
        features,
        subscription,
        billingAccount: null, // Loaded separately if needed
        memberSummary,
        recentAuditEvents,
      };

      setOrganisation(detail);
    } catch (err) {
      console.error("Failed to load organisation:", err);
      setError(err instanceof Error ? err.message : "Ett fel uppstod vid laddning");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadOrganisation();
  }, [loadOrganisation]);

  // Handle status change
  const handleStatusChange = async (newStatus: TenantStatus) => {
    if (!organisation) return;
    
    try {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", tenantId);
      
      if (updateError) throw updateError;
      
      // Log audit event
      await supabase.from("tenant_audit_logs").insert({
        tenant_id: tenantId,
        event_type: "status_changed",
        payload: { from: organisation.status, to: newStatus },
      });
      
      success(`Status ändrad till ${tenantStatusLabels[newStatus]}`);
      loadOrganisation();
    } catch (err) {
      toastError("Kunde inte ändra status");
      console.error(err);
    }
  };

  // Handle organisation update
  const handleUpdate = async (updates: Partial<OrganisationDetail>) => {
    if (!organisation) return;
    
    try {
      const { error: updateError } = await supabase
        .from("tenants")
        .update({
          name: updates.name ?? organisation.name,
          contact_name: updates.contactName,
          contact_email: updates.contactEmail,
          contact_phone: updates.contactPhone,
          default_language: updates.defaultLanguage,
          default_theme: updates.defaultTheme,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenantId);
      
      if (updateError) throw updateError;
      
      success("Organisation uppdaterad");
      loadOrganisation();
    } catch (err) {
      toastError("Kunde inte uppdatera organisation");
      console.error(err);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      const { error: deleteError } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);
      
      if (deleteError) throw deleteError;
      
      success("Organisation raderad");
      router.push("/admin/organisations");
    } catch (err) {
      toastError("Kunde inte radera organisation");
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Organisationer', href: '/admin/organisations' },
          { label: 'Laddar...' },
        ]} />
        <OrganisationDetailSkeleton />
      </AdminPageLayout>
    );
  }

  if (error || !organisation) {
    return (
      <AdminPageLayout>
        <AdminBreadcrumbs items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Organisationer', href: '/admin/organisations' },
          { label: 'Fel' },
        ]} />
        <AdminErrorState
          title="Kunde inte ladda organisation"
          description={error ?? "Organisation hittades inte"}
          onRetry={loadOrganisation}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      {/* Breadcrumbs */}
      <AdminBreadcrumbs items={[
        { label: 'Admin', href: '/admin' },
        { label: 'Organisationer', href: '/admin/organisations' },
        { label: organisation.name },
      ]} />

      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 bg-background/95 backdrop-blur border-b border-border/40 mb-6">
        <div className="flex items-start gap-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/organisations')}
            className="shrink-0"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>

          {/* Logo placeholder + info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
              <BuildingOffice2Icon className="h-6 w-6 text-primary" />
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold truncate">{organisation.name}</h1>
                <StatusBadge status={organisation.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                {organisation.slug && (
                  <>
                    <span className="font-mono">{organisation.slug}</span>
                    <span>•</span>
                  </>
                )}
                <span className="font-mono text-xs">{organisation.id}</span>
                <CopyButton value={organisation.id} label="UUID" />
                <span>•</span>
                <span>{tenantTypeLabels[organisation.type]}</span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="text-lg font-semibold">{organisation.memberSummary.total}</div>
              <div className="text-muted-foreground text-xs">Medlemmar</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{organisation.features.filter(f => f.enabled).length}</div>
              <div className="text-muted-foreground text-xs">Funktioner</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{organisation.domains.length}</div>
              <div className="text-muted-foreground text-xs">Domäner</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOrganisation}
              title="Uppdatera"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab('overview')}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Redigera
                </DropdownMenuItem>
                {organisation.slug && (
                  <DropdownMenuItem
                    onClick={() => window.open(`https://${organisation.slug}.lekbanken.no/app`, '_blank')}
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-2" />
                    Öppna app
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusChange(organisation.status === 'suspended' ? 'active' : 'suspended')}
                  className={organisation.status === 'suspended' ? 'text-emerald-600' : 'text-amber-600'}
                >
                  {organisation.status === 'suspended' ? 'Återaktivera' : 'Stäng av'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Radera
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <Tabs
          tabs={[
            { id: 'overview', label: 'Översikt' },
            { id: 'members', label: 'Medlemmar' },
            { id: 'features', label: 'Funktioner' },
            { id: 'domains', label: 'Domäner' },
            { id: 'audit', label: 'Aktivitet' },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as typeof validTabs[number])}
          variant="underline"
        />

        {/* Overview Tab */}
        <TabPanel id="overview" activeTab={activeTab} className="space-y-6">
          {/* Identity & Contact in 2-column grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <OrganisationIdentitySection
              organisation={organisation}
              onUpdate={handleUpdate}
              onStatusChange={handleStatusChange}
            />
            <OrganisationContactSection
              organisation={organisation}
              onUpdate={handleUpdate}
            />
          </div>

          {/* Branding & Locale in 2-column grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <OrganisationBrandingSection
              tenantId={tenantId}
              branding={organisation.branding}
              organisationName={organisation.name}
              onRefresh={loadOrganisation}
            />
            <OrganisationLocaleSection
              tenantId={tenantId}
              organisation={organisation}
              onRefresh={loadOrganisation}
            />
          </div>

          {/* Billing section */}
          <OrganisationBillingSection
            tenantId={tenantId}
            subscription={organisation.subscription}
            billingAccount={organisation.billingAccount}
            trialEndsAt={organisation.trialEndsAt}
          />

          {/* Domains summary */}
          <OrganisationDomainsSection
            tenantId={tenantId}
            domains={organisation.domains}
            slug={organisation.slug}
            onRefresh={loadOrganisation}
          />

          {/* Features summary */}
          <OrganisationFeaturesSection
            tenantId={tenantId}
            features={organisation.features}
            onRefresh={loadOrganisation}
          />

          {/* Members summary */}
          <OrganisationMembersSummary
            tenantId={tenantId}
            summary={organisation.memberSummary}
          />

          {/* Recent audit events */}
          <OrganisationAuditSection
            tenantId={tenantId}
            events={organisation.recentAuditEvents}
          />

          {/* Danger Zone */}
          <OrganisationDangerZone
            organisation={organisation}
            onSuspend={() => handleStatusChange('suspended')}
            onReactivate={() => handleStatusChange('active')}
            onArchive={() => handleStatusChange('archived')}
            onDelete={handleDelete}
          />
        </TabPanel>

        {/* Members Tab */}
        <TabPanel id="members" activeTab={activeTab}>
          <OrganisationMembersList
            tenantId={tenantId}
            summary={organisation.memberSummary}
            onRefresh={loadOrganisation}
          />
        </TabPanel>

        {/* Features Tab */}
        <TabPanel id="features" activeTab={activeTab}>
          <OrganisationFeaturesSection
            tenantId={tenantId}
            features={organisation.features}
            onRefresh={loadOrganisation}
            expanded
          />
        </TabPanel>

        {/* Domains Tab */}
        <TabPanel id="domains" activeTab={activeTab}>
          <OrganisationDomainsSection
            tenantId={tenantId}
            domains={organisation.domains}
            slug={organisation.slug}
            onRefresh={loadOrganisation}
            expanded
          />
        </TabPanel>

        {/* Audit Tab */}
        <TabPanel id="audit" activeTab={activeTab}>
          <OrganisationAuditFull tenantId={tenantId} />
        </TabPanel>
      </div>
    </AdminPageLayout>
  );
}
