"use server";

/**
 * Tenant anonymization server actions.
 *
 * Three operations:
 *   anonymizeTenant  — scrub PII, create vault backup, revoke access
 *   restoreTenant    — decrypt vault, restore PII, set status to archived
 *   purgeTenantNow   — hard delete (CASCADE takes everything)
 *
 * All require system_admin. Uses service-role client for vault writes.
 */

import { createServerRlsClient, getAuthUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import { encryptVaultPayload, decryptVaultPayload } from "@/lib/crypto/vault";

// ============================================================================
// Types
// ============================================================================

export type AnonymizeResult = {
  success: boolean;
  error?: string;
};

/**
 * PII fields we scrub from tenants and back up to the vault.
 */
type TenantPiiSnapshot = {
  name: string | null;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

// ============================================================================
// anonymizeTenant
// ============================================================================

export async function anonymizeTenant(
  tenantId: string,
  reason?: string,
): Promise<AnonymizeResult> {
  await requireSystemAdmin();
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Ej inloggad" };

  const supabase = await createServerRlsClient();

  // 1. Read current tenant (lock via service role for atomicity)
  const { data: tenant, error: fetchErr } = await supabase
    .from("tenants")
    .select("id, name, slug, description, logo_url, contact_name, contact_email, contact_phone, status")
    .eq("id", tenantId)
    .maybeSingle();

  if (fetchErr || !tenant) {
    return { success: false, error: fetchErr?.message ?? "Organisation hittades inte" };
  }

  if (tenant.status === "anonymized") {
    return { success: false, error: "Organisationen är redan anonymiserad" };
  }

  // 2. Collect PII snapshot
  const piiSnapshot: TenantPiiSnapshot = {
    name: tenant.name,
    slug: tenant.slug,
    description: tenant.description,
    logo_url: tenant.logo_url,
    contact_name: tenant.contact_name,
    contact_email: tenant.contact_email,
    contact_phone: tenant.contact_phone,
  };

  // 3. Encrypt and store in vault (service role — bypasses RLS)
  const serviceClient = createServiceRoleClient();
  const encryptedPayload = encryptVaultPayload(piiSnapshot as Record<string, unknown>, tenantId);
  const purgeAfter = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

  const { error: vaultErr } = await serviceClient
    .from("tenant_restore_vault")
    .upsert(
      {
        tenant_id: tenantId,
        encrypted_payload: encryptedPayload,
        purge_after: purgeAfter,
        created_by: user.id,
        kms_version: "v1",
      },
      { onConflict: "tenant_id" },
    );

  if (vaultErr) {
    console.error("[anonymizeTenant] Vault write failed:", vaultErr);
    return { success: false, error: "Kunde inte skapa backup — avbröt anonymisering" };
  }

  // 4. Scrub PII in tenants table
  const shortId = tenantId.slice(0, 8);
  const randomSuffix = Math.random().toString(36).slice(2, 8);

  const { error: updateErr } = await supabase
    .from("tenants")
    .update({
      name: "Borttagen organisation",
      slug: `deleted-${shortId}-${randomSuffix}`,
      description: null,
      logo_url: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      status: "anonymized",
      anonymized_at: new Date().toISOString(),
      purge_after: purgeAfter,
      anonymized_by: user.id,
      anonymization_reason: reason ?? null,
      anonymization_version: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (updateErr) {
    console.error("[anonymizeTenant] Tenant update failed:", updateErr);
    return { success: false, error: "Kunde inte anonymisera — " + updateErr.message };
  }

  // 5. Delete memberships (revokes all access immediately)
  await serviceClient
    .from("user_tenant_memberships")
    .delete()
    .eq("tenant_id", tenantId);

  // 6. Delete invitations
  await serviceClient
    .from("tenant_invitations")
    .delete()
    .eq("tenant_id", tenantId);

  // 7. Scrub PII from related tables (SET NULL FK — rows survive tenant delete)
  // Quotes: contact_name, contact_email, company_name (NOT NULL columns)
  await serviceClient
    .from("quotes")
    .update({
      contact_name: "[anonymized]",
      contact_email: "[anonymized]",
      company_name: "[anonymized]",
    })
    .eq("tenant_id", tenantId);

  // Purchase intents: email, tenant_name (nullable)
  await serviceClient
    .from("purchase_intents")
    .update({
      email: null,
      tenant_name: null,
    })
    .eq("tenant_id", tenantId);

  // Gift purchases: purchaser_email (NOT NULL), rest nullable
  await serviceClient
    .from("gift_purchases")
    .update({
      purchaser_email: "[anonymized]",
      recipient_email: null,
      recipient_name: null,
      gift_message: null,
    })
    .eq("redeemed_tenant_id", tenantId);

  // 8. Audit log (tenant-scoped — will be lost on purge)
  await supabase.from("tenant_audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: user.id,
    event_type: "tenant.anonymized",
    payload: {
      reason: reason ?? null,
      purge_after: purgeAfter,
    },
  });

  // 9. System audit log (no FK — survives tenant deletion for compliance)
  await serviceClient.from("system_audit_logs").insert({
    event_type: "TENANT_ANONYMIZED",
    actor_user_id: user.id,
    tenant_id: tenantId,
    metadata: {
      reason: reason ?? null,
      purge_after: purgeAfter,
      anonymization_version: 1,
    },
  });

  return { success: true };
}

// ============================================================================
// restoreTenant
// ============================================================================

export async function restoreTenant(tenantId: string): Promise<AnonymizeResult> {
  await requireSystemAdmin();
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Ej inloggad" };

  const supabase = await createServerRlsClient();

  // 1. Verify tenant is anonymized
  const { data: tenant, error: fetchErr } = await supabase
    .from("tenants")
    .select("id, status, purge_after")
    .eq("id", tenantId)
    .maybeSingle();

  if (fetchErr || !tenant) {
    return { success: false, error: fetchErr?.message ?? "Organisation hittades inte" };
  }

  if (tenant.status !== "anonymized") {
    return { success: false, error: "Organisationen är inte anonymiserad" };
  }

  // 2. Read vault (service role)
  const serviceClient = createServiceRoleClient();
  const { data: vault, error: vaultErr } = await serviceClient
    .from("tenant_restore_vault")
    .select("encrypted_payload")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (vaultErr || !vault) {
    return {
      success: false,
      error: "Kunde inte hitta backup-data. Manuell återställning krävs.",
    };
  }

  // 3. Decrypt PII
  let pii: TenantPiiSnapshot;
  try {
    pii = decryptVaultPayload(vault.encrypted_payload, tenantId) as TenantPiiSnapshot;
  } catch (err) {
    console.error("[restoreTenant] Decryption failed:", err);
    return { success: false, error: "Kunde inte dekryptera backup-data" };
  }

  // 4. Restore PII — status → archived (safe default)
  const { error: updateErr } = await supabase
    .from("tenants")
    .update({
      name: pii.name ?? "Återställd organisation",
      slug: pii.slug,
      description: pii.description,
      logo_url: pii.logo_url,
      contact_name: pii.contact_name,
      contact_email: pii.contact_email,
      contact_phone: pii.contact_phone,
      status: "archived",
      anonymized_at: null,
      purge_after: null,
      anonymized_by: null,
      anonymization_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenantId);

  if (updateErr) {
    console.error("[restoreTenant] Restore failed:", updateErr);
    return { success: false, error: "Kunde inte återställa — " + updateErr.message };
  }

  // 5. Delete vault entry
  await serviceClient
    .from("tenant_restore_vault")
    .delete()
    .eq("tenant_id", tenantId);

  // 6. Audit log (tenant-scoped — will be lost if tenant is later purged)
  await supabase.from("tenant_audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: user.id,
    event_type: "tenant.restored",
    payload: { restored_from: "anonymized", new_status: "archived" },
  });

  // 7. System audit log (no FK — survives tenant deletion for compliance)
  await serviceClient.from("system_audit_logs").insert({
    event_type: "TENANT_RESTORED",
    actor_user_id: user.id,
    tenant_id: tenantId,
    metadata: { restored_from: "anonymized", new_status: "archived" },
  });

  return { success: true };
}

// ============================================================================
// purgeTenantNow
// ============================================================================

export async function purgeTenantNow(tenantId: string): Promise<AnonymizeResult> {
  await requireSystemAdmin();
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Ej inloggad" };

  const supabase = await createServerRlsClient();

  // 1. Verify tenant exists
  const { data: tenant, error: fetchErr } = await supabase
    .from("tenants")
    .select("id, status, name")
    .eq("id", tenantId)
    .maybeSingle();

  if (fetchErr || !tenant) {
    return { success: false, error: fetchErr?.message ?? "Organisation hittades inte" };
  }

  if (tenant.status === "anonymized") {
    // Only anonymized tenants should be purged via this flow
  }

  // 2. Write system audit log BEFORE delete (cascade will destroy tenant_audit_logs)
  const serviceClient = createServiceRoleClient();
  await serviceClient.from("system_audit_logs").insert({
    event_type: "TENANT_PURGED",
    actor_user_id: user.id,
    tenant_id: tenantId,
    metadata: {
      tenant_status: tenant.status,
      trigger: "manual",
    },
  });

  // 3. Hard delete (CASCADE handles all related data + vault)
  const { data, error: deleteErr } = await supabase
    .from("tenants")
    .delete()
    .eq("id", tenantId)
    .select("id")
    .maybeSingle();

  if (deleteErr) {
    if (deleteErr.code === "23503") {
      return {
        success: false,
        error: "Kan inte ta bort — det finns fortfarande kopplad data som blockerar radering.",
      };
    }
    return { success: false, error: deleteErr.message };
  }

  if (!data) {
    return { success: false, error: "Radering misslyckades — kontrollera behörighet (system_admin)." };
  }

  return { success: true };
}
