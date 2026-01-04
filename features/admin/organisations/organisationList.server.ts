import "server-only";

import { createServerRlsClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { AdminOrganisationListItem, OrganisationListStatus } from "./types";

type TenantListRow = Database["public"]["Tables"]["tenants"]["Row"] & {
  tenant_domains?: Database["public"]["Tables"]["tenant_domains"]["Row"][] | null;
  tenant_subscriptions?: Array<
    Database["public"]["Tables"]["tenant_subscriptions"]["Row"] & {
      billing_product?: { name: string | null } | null;
    }
  > | null;
  billing_accounts?: Database["public"]["Tables"]["billing_accounts"]["Row"][] | null;
  user_tenant_memberships?: { count: number | null }[] | null;
};

const knownStatus = new Set<OrganisationListStatus>([
  "active",
  "trial",
  "suspended",
  "archived",
  "demo",
  "inactive",
]);

function normalizeStatus(value: string | null, isDemo: boolean | null): OrganisationListStatus {
  if (isDemo) return "demo";
  if (value && knownStatus.has(value as OrganisationListStatus)) {
    return value as OrganisationListStatus;
  }
  return "active";
}

function pickCustomDomain(domains: TenantListRow["tenant_domains"]) {
  if (!domains || domains.length === 0) return null;
  const customDomains = domains.filter((domain) => domain.kind === "custom");
  const target = customDomains.find((domain) => domain.status === "active")
    ?? customDomains.find((domain) => domain.status === "pending")
    ?? customDomains[0];

  if (!target) return null;

  return {
    hostname: target.hostname,
    status: target.status,
  };
}

export async function getAdminOrganisationList(): Promise<{
  organisations: AdminOrganisationListItem[];
  error: string | null;
}> {
  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from("tenants")
    .select(
      `
      id,
      name,
      slug,
      status,
      demo_flag,
      contact_name,
      contact_email,
      contact_phone,
      created_at,
      updated_at,
      default_language,
      main_language,
      logo_url,
      subscription_status,
      subscription_tier,
      tenant_domains (id, hostname, status, kind),
      tenant_subscriptions (
        status,
        stripe_subscription_id,
        billing_product:billing_products (name)
      ),
      billing_accounts (provider_customer_id),
      user_tenant_memberships (count)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { organisations: [], error: error.message };
  }

  const organisations = (data ?? []).map((tenant) => {
    const typed = tenant as TenantListRow;
    const subscription = typed.tenant_subscriptions?.[0] ?? null;
    const billingAccount = typed.billing_accounts?.[0] ?? null;
    const billingStatus = subscription?.status ?? typed.subscription_status ?? null;
    const billingPlan = subscription?.billing_product?.name ?? typed.subscription_tier ?? null;
    const billingConnected = Boolean(
      subscription?.stripe_subscription_id || billingAccount?.provider_customer_id
    );
    const billingCustomerId = billingAccount?.provider_customer_id ?? null;
    const billingSubscriptionId = subscription?.stripe_subscription_id ?? null;
    const domain = pickCustomDomain(typed.tenant_domains ?? null);
    const language = typed.default_language ?? typed.main_language ?? null;

    const organisation: AdminOrganisationListItem = {
      id: typed.id,
      name: typed.name,
      slug: typed.slug,
      status: normalizeStatus(typed.status, typed.demo_flag),
      contactName: typed.contact_name,
      contactEmail: typed.contact_email,
      contactPhone: typed.contact_phone,
      membersCount: typed.user_tenant_memberships?.[0]?.count ?? null,
      createdAt: typed.created_at,
      updatedAt: typed.updated_at,
      language,
      branding: {
        logoUrl: typed.logo_url,
      },
      billing: {
        status: billingStatus,
        plan: billingPlan,
        connected: billingConnected,
        customerId: billingCustomerId,
        subscriptionId: billingSubscriptionId,
      },
      domain,
    };

    return organisation;
  });

  return { organisations, error: null };
}
