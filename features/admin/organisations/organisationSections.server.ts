"use server";

import { createServerRlsClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";

// ============================================================================
// Types
// ============================================================================

export type ProductRow = {
  id: string;
  name: string | null;
  product_key: string | null;
};

export type EntitlementRow = {
  id: string;
  status: string;
  source: string;
  quantity_seats: number;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  product: ProductRow | null;
};

export type MemberRow = {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string | null;
  isPrimary: boolean;
  createdAt: string;
};

export type AuditEventRow = {
  id: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: null;
};

// ============================================================================
// Licensing: load products + entitlements
// ============================================================================

export async function loadLicensingData(tenantId: string): Promise<{
  products: ProductRow[];
  entitlements: EntitlementRow[];
  error: string | null;
}> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { products: [], entitlements: [], error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const [productsRes, entitlementsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, product_key")
        .order("created_at", { ascending: false }),
      supabase
        .from("tenant_product_entitlements")
        .select(
          "id, status, source, quantity_seats, valid_from, valid_to, created_at, product:products(id, name, product_key)"
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (productsRes.error) {
      console.error("[loadLicensingData] Products error:", productsRes.error);
      return { products: [], entitlements: [], error: productsRes.error.message };
    }
    if (entitlementsRes.error) {
      console.error("[loadLicensingData] Entitlements error:", entitlementsRes.error);
      return { products: [], entitlements: [], error: entitlementsRes.error.message };
    }

    const products = ((productsRes.data ?? []) as ProductRow[]).filter(
      (r) => typeof r?.id === "string"
    );
    const entitlements = ((entitlementsRes.data ?? []) as EntitlementRow[]).filter(
      (r) => typeof r?.id === "string"
    );

    return { products, entitlements, error: null };
  } catch (err) {
    console.error("[loadLicensingData] Unexpected error:", err);
    return {
      products: [],
      entitlements: [],
      error: err instanceof Error ? err.message : "Okänt fel",
    };
  }
}

// ============================================================================
// Members: load tenant members
// ============================================================================

export async function loadMembersData(tenantId: string): Promise<{
  members: MemberRow[];
  error: string | null;
}> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { members: [], error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { data, error } = await supabase
      .from("user_tenant_memberships")
      .select(
        `
        id,
        user_id,
        role,
        status,
        is_primary,
        created_at,
        users:user_id (
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[loadMembersData] Query error:", error);
      return { members: [], error: error.message };
    }

    const members: MemberRow[] = (data || []).map((m) => {
      const user = m.users as unknown as {
        email: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
      return {
        id: m.id,
        userId: m.user_id,
        email: user?.email || "Okänd",
        fullName: user?.full_name || null,
        avatarUrl: user?.avatar_url || null,
        role: m.role,
        status: m.status,
        isPrimary: m.is_primary,
        createdAt: m.created_at,
      };
    });

    return { members, error: null };
  } catch (err) {
    console.error("[loadMembersData] Unexpected error:", err);
    return {
      members: [],
      error: err instanceof Error ? err.message : "Okänt fel",
    };
  }
}

// ============================================================================
// Audit: load paginated audit events
// ============================================================================

export async function loadAuditData(
  tenantId: string,
  page: number = 0,
  pageSize: number = 20,
  eventTypeFilter?: string
): Promise<{
  events: AuditEventRow[];
  totalCount: number;
  error: string | null;
}> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { events: [], totalCount: 0, error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    let query = supabase
      .from("tenant_audit_logs")
      .select("id, event_type, payload, created_at, actor_user_id", {
        count: "exact",
      })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (eventTypeFilter && eventTypeFilter !== "all") {
      query = query.eq("event_type", eventTypeFilter);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[loadAuditData] Query error:", error);
      return { events: [], totalCount: 0, error: error.message };
    }

    const events: AuditEventRow[] = (data || []).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      payload: e.payload as Record<string, unknown> | null,
      createdAt: e.created_at,
      actor: null,
    }));

    return { events, totalCount: count ?? 0, error: null };
  } catch (err) {
    console.error("[loadAuditData] Unexpected error:", err);
    return {
      events: [],
      totalCount: 0,
      error: err instanceof Error ? err.message : "Okänt fel",
    };
  }
}
