"use server";

import { createServerRlsClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
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

/**
 * Server action to fetch organisation details for admin view.
 * Uses RLS context from server-side session.
 */
export async function getOrganisationDetail(tenantId: string): Promise<{
  organisation: OrganisationDetail | null;
  error: string | null;
}> {
  // Validate system admin access
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { organisation: null, error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    // Main tenant query
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

    if (tenantError) {
      console.error("Failed to load tenant:", tenantError);
      return { organisation: null, error: tenantError.message };
    }
    if (!tenant) {
      return { organisation: null, error: "Organisation hittades inte" };
    }

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
    const branding: TenantBranding | null = brandingData
      ? {
          id: brandingData.id,
          logoMediaId: brandingData.logo_media_id,
          brandNameOverride: brandingData.brand_name_override,
          primaryColor: brandingData.primary_color,
          secondaryColor: brandingData.secondary_color,
          accentColor: brandingData.accent_color,
          theme: brandingData.theme as TenantBranding["theme"],
        }
      : null;

    const domains: TenantDomain[] = (tenant.tenant_domains || []).map(
      (d: Database["public"]["Tables"]["tenant_domains"]["Row"]) => ({
        id: d.id,
        hostname: d.hostname,
        kind: d.kind as TenantDomain["kind"],
        status: d.status as TenantDomain["status"],
        verifiedAt: d.verified_at,
        createdAt: d.created_at,
      })
    );

    const features: TenantFeature[] = (tenant.tenant_features || []).map(
      (f: Database["public"]["Tables"]["tenant_features"]["Row"]) => ({
        id: f.id,
        featureKey: f.feature_key,
        enabled: f.enabled,
        value: f.value as Record<string, unknown> | null,
      })
    );

    const subscriptionRow = tenant.tenant_subscriptions?.[0];
    const subscription: TenantSubscription | null = subscriptionRow
      ? {
          id: subscriptionRow.id,
          status: subscriptionRow.status as TenantSubscription["status"],
          seatsPurchased: subscriptionRow.seats_purchased,
          startDate: subscriptionRow.start_date,
          renewalDate: subscriptionRow.renewal_date,
          cancelledAt: subscriptionRow.cancelled_at,
          stripeSubscriptionId: subscriptionRow.stripe_subscription_id,
          product: subscriptionRow.billing_product
            ? {
                name: (
                  subscriptionRow.billing_product as unknown as { name: string }
                ).name,
                description: null,
              }
            : null,
        }
      : null;

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
      type: tenant.type as OrganisationDetail["type"],
      description: tenant.description,
      createdAt: tenant.created_at,
      createdBy: null,
      updatedAt: tenant.updated_at,
      updatedBy: null,
      contactName: tenant.contact_name,
      contactEmail: tenant.contact_email,
      contactPhone: tenant.contact_phone,
      adminNotes: (metadata?.admin_notes as string | null) ?? null,
      defaultLanguage: tenant.default_language,
      mainLanguage: tenant.main_language,
      defaultTheme: tenant.default_theme,
      trialEndsAt: tenant.trial_ends_at,
      brandingEnabled: tenant.tenant_branding_enabled ?? false,
      branding,
      domains,
      features,
      subscription,
      billingAccount: null, // Loaded separately if needed
      memberSummary,
      recentAuditEvents,
    };

    return { organisation: detail, error: null };
  } catch (err) {
    console.error("Failed to load organisation:", err);
    return {
      organisation: null,
      error: err instanceof Error ? err.message : "Ett fel uppstod vid laddning",
    };
  }
}
