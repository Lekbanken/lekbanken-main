"use server";

import { createServerRlsClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import type { Database } from "@/types/supabase";

type TenantRole = Database["public"]["Tables"]["user_tenant_memberships"]["Insert"]["role"];

// ============================================================================
// Types
// ============================================================================

export type ProductRow = {
  id: string;
  name: string | null;
  product_key: string;
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

// ============================================================================
// Licensing: grant entitlement
// ============================================================================

export async function grantEntitlement(input: {
  tenantId: string;
  productId: string;
  seats: number;
  validTo: string | null;
  reason: string;
}): Promise<{ error: string | null }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const quantity = Number.isFinite(input.seats)
      ? Math.max(1, Math.floor(input.seats))
      : 1;

    const { error: insertError } = await supabase
      .from("tenant_product_entitlements")
      .insert({
        tenant_id: input.tenantId,
        product_id: input.productId,
        status: "active",
        source: "admin_grant",
        quantity_seats: quantity,
        valid_from: new Date().toISOString(),
        valid_to: input.validTo ? new Date(input.validTo).toISOString() : null,
        metadata: input.reason ? { reason: input.reason } : {},
        created_by: user?.id ?? null,
      });

    if (insertError) {
      console.error("[grantEntitlement] Insert error:", insertError);
      return { error: insertError.message };
    }

    return { error: null };
  } catch (err) {
    console.error("[grantEntitlement] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Licensing: revoke entitlement
// ============================================================================

export async function revokeEntitlement(
  entitlementId: string
): Promise<{ error: string | null }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error: updateError } = await supabase
      .from("tenant_product_entitlements")
      .update({ status: "revoked", valid_to: new Date().toISOString() })
      .eq("id", entitlementId);

    if (updateError) {
      console.error("[revokeEntitlement] Update error:", updateError);
      return { error: updateError.message };
    }

    return { error: null };
  } catch (err) {
    console.error("[revokeEntitlement] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Members: search users by email
// ============================================================================

export type UserSearchRow = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export async function searchUsers(
  emailQuery: string
): Promise<{ users: UserSearchRow[]; error: string | null }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { users: [], error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .ilike("email", `%${emailQuery.trim()}%`)
      .limit(10);

    if (error) {
      console.error("[searchUsers] Query error:", error);
      return { users: [], error: error.message };
    }

    const users: UserSearchRow[] = (data || []).map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
    }));

    return { users, error: null };
  } catch (err) {
    console.error("[searchUsers] Unexpected error:", err);
    return { users: [], error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Members: add member to tenant
// ============================================================================

export async function addMemberToTenant(input: {
  tenantId: string;
  userId: string;
  role: string;
  email: string;
  fullName: string | null;
}): Promise<{ error: string | null; duplicate?: boolean }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error } = await supabase.from("user_tenant_memberships").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      role: input.role as NonNullable<TenantRole>,
      is_primary: false,
    });

    if (error) {
      if (error.code === "23505") {
        return { error: "duplicate", duplicate: true };
      }
      console.error("[addMemberToTenant] Insert error:", error);
      return { error: error.message };
    }

    // Log audit
    await supabase.from("tenant_audit_logs").insert({
      tenant_id: input.tenantId,
      event_type: "member_added",
      payload: {
        userId: input.userId,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        addedDirectly: true,
      },
    });

    return { error: null };
  } catch (err) {
    console.error("[addMemberToTenant] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Members: change role
// ============================================================================

export async function changeMemberRole(input: {
  tenantId: string;
  memberId: string;
  newRole: string;
  userId?: string;
  email?: string;
  oldRole?: string;
}): Promise<{ error: string | null }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error } = await supabase
      .from("user_tenant_memberships")
      .update({ role: input.newRole as NonNullable<TenantRole>, updated_at: new Date().toISOString() })
      .eq("id", input.memberId);

    if (error) {
      console.error("[changeMemberRole] Update error:", error);
      return { error: error.message };
    }

    // Log audit
    await supabase.from("tenant_audit_logs").insert({
      tenant_id: input.tenantId,
      event_type: "member_role_changed",
      payload: {
        memberId: input.memberId,
        userId: input.userId,
        email: input.email,
        from: input.oldRole,
        to: input.newRole,
      },
    });

    return { error: null };
  } catch (err) {
    console.error("[changeMemberRole] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Members: remove member
// ============================================================================

export async function removeMember(input: {
  tenantId: string;
  memberId: string;
  userId: string;
  email: string;
  role: string;
}): Promise<{ error: string | null }> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error } = await supabase
      .from("user_tenant_memberships")
      .delete()
      .eq("id", input.memberId);

    if (error) {
      console.error("[removeMember] Delete error:", error);
      return { error: error.message };
    }

    // Log audit
    await supabase.from("tenant_audit_logs").insert({
      tenant_id: input.tenantId,
      event_type: "member_removed",
      payload: {
        memberId: input.memberId,
        userId: input.userId,
        email: input.email,
        role: input.role,
      },
    });

    return { error: null };
  } catch (err) {
    console.error("[removeMember] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}
