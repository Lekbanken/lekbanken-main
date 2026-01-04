import "server-only";

import { createServerRlsClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type {
  AdminUserListItem,
  AdminUserMembershipPreview,
  AdminUserMembershipStatus,
  AdminUserStatus,
} from "./types";

type MembershipRow = Database["public"]["Tables"]["user_tenant_memberships"]["Row"] & {
  tenants?: Pick<Database["public"]["Tables"]["tenants"]["Row"], "id" | "name" | "status"> | null;
};

type UserListRow = Database["public"]["Tables"]["users"]["Row"] & {
  user_tenant_memberships?: MembershipRow[] | null;
};

type SessionRow = Pick<
  Database["public"]["Tables"]["user_sessions"]["Row"],
  "user_id" | "last_seen_at" | "last_login_at"
>;

const membershipStatusSet = new Set<AdminUserMembershipStatus>([
  "active",
  "invited",
  "pending",
  "inactive",
  "suspended",
  "disabled",
]);

function normalizeMembershipStatus(value: string | null): AdminUserMembershipStatus {
  if (!value) return "active";
  const normalized = value.toLowerCase();
  if (membershipStatusSet.has(normalized as AdminUserMembershipStatus)) {
    return normalized as AdminUserMembershipStatus;
  }
  return "active";
}

function normalizeUserStatus(memberships: AdminUserMembershipPreview[]): AdminUserStatus {
  if (memberships.length === 0) return "inactive";

  const statuses = memberships.map((membership) =>
    (membership.status ?? "active").toString().toLowerCase()
  );

  const hasDisabled = statuses.some((status) =>
    ["disabled", "suspended", "banned"].includes(status)
  );
  const hasActive = statuses.includes("active");
  const hasInvited = statuses.includes("invited");
  const hasPending = statuses.includes("pending");
  const hasInactiveOnly = statuses.every((status) => status === "inactive");

  if (hasDisabled) return "disabled";
  if (hasActive) return "active";
  if (hasInvited) return "invited";
  if (hasPending) return "pending";
  if (hasInactiveOnly) return "inactive";
  return "active";
}

function pickLatestDate(current: string | null, next: string | null) {
  if (!current) return next;
  if (!next) return current;
  const currentTime = new Date(current).getTime();
  const nextTime = new Date(next).getTime();
  if (Number.isNaN(currentTime)) return next;
  if (Number.isNaN(nextTime)) return current;
  return nextTime > currentTime ? next : current;
}

export async function getAdminUserList(): Promise<{
  users: AdminUserListItem[];
  error: string | null;
}> {
  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      email,
      full_name,
      avatar_url,
      created_at,
      updated_at,
      global_role,
      role,
      email_verified,
      user_tenant_memberships (
        id,
        role,
        status,
        is_primary,
        created_at,
        tenant_id,
        tenants ( id, name, status )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { users: [], error: error.message };
  }

  const rows = (data ?? []) as UserListRow[];
  const userIds = rows.map((user) => user.id);
  const sessionByUser = new Map<string, { lastSeenAt: string | null; lastLoginAt: string | null }>();
  let sessionErrorMessage: string | null = null;

  if (userIds.length > 0) {
    const { data: sessions, error: sessionError } = await supabase
      .from("user_sessions")
      .select("user_id, last_seen_at, last_login_at")
      .in("user_id", userIds);

    if (sessionError) {
      sessionErrorMessage = sessionError.message;
    } else {
      (sessions ?? []).forEach((session) => {
        const row = session as SessionRow;
        const existing = sessionByUser.get(row.user_id) ?? {
          lastSeenAt: null,
          lastLoginAt: null,
        };

        sessionByUser.set(row.user_id, {
          lastSeenAt: pickLatestDate(existing.lastSeenAt, row.last_seen_at),
          lastLoginAt: pickLatestDate(existing.lastLoginAt, row.last_login_at),
        });
      });
    }
  }

  const users = rows.map((user) => {
    const memberships = (user.user_tenant_memberships ?? []).map((membership) => {
      const preview: AdminUserMembershipPreview = {
        tenantId: membership.tenant_id,
        tenantName: membership.tenants?.name ?? null,
        tenantStatus: membership.tenants?.status ?? null,
        role: membership.role ?? "member",
        status: normalizeMembershipStatus(membership.status),
        isPrimary: Boolean(membership.is_primary),
        createdAt: membership.created_at,
      };
      return preview;
    });

    const primaryMembership =
      memberships.find((membership) => membership.isPrimary) ?? memberships[0] ?? null;

    const session = sessionByUser.get(user.id);
    const status = normalizeUserStatus(memberships);
    const globalRole = user.global_role ?? user.role ?? null;

    const listItem: AdminUserListItem = {
      id: user.id,
      email: user.email,
      name: user.full_name ?? null,
      avatarUrl: user.avatar_url ?? null,
      status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastSeenAt: session?.lastSeenAt ?? null,
      lastLoginAt: session?.lastLoginAt ?? null,
      emailVerified: user.email_verified ?? null,
      globalRole,
      memberships,
      membershipsCount: memberships.length,
      primaryMembership,
    };

    return listItem;
  });

  return {
    users,
    error: sessionErrorMessage,
  };
}
