'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BuildingOffice2Icon,
  ClipboardDocumentIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageLayout,
  AdminBreadcrumbs,
  AdminErrorState,
} from "@/components/admin/shared";
import { Button, Tabs, TabPanel } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { supabase } from "@/lib/supabase/client";
import { getOrganisationDetail } from "./organisationDetail.server";

import type {
  OrganisationDetail,
  TenantStatus,
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
  OrganisationLicensingSection,
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
  const t = useTranslations('admin.organizations.detail');
  const { success } = useToast();
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    success(label ? t('copiedWithLabel', { label }) : t('copied'));
  };
  
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={t('copied')}
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
  // Dynamic import to avoid circular dependency issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuth } = require('@/lib/supabase/auth');
  const { effectiveGlobalRole } = useAuth();
  const isSystemAdmin = effectiveGlobalRole === 'system_admin';
  
  const [organisation, setOrganisation] = useState<OrganisationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const validTabs = ["overview", "members", "features", "domains", "licenses", "audit"] as const;
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

  // Load organisation details using server action
  const loadOrganisation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { organisation: detail, error: fetchError } = await getOrganisationDetail(tenantId);
      
      if (fetchError) {
        setError(fetchError);
        return;
      }
      
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

          {/* Refresh button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadOrganisation}
              title="Uppdatera"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
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
            { id: 'licenses', label: 'Licenser' },
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
              brandingEnabled={organisation.brandingEnabled}
              isSystemAdmin={isSystemAdmin}
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

        {/* Licenses Tab */}
        <TabPanel id="licenses" activeTab={activeTab} className="space-y-6">
          <OrganisationLicensingSection tenantId={tenantId} />
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
