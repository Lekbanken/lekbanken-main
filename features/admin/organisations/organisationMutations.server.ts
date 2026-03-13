"use server";

import { createServerRlsClient } from "@/lib/supabase/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import type { TenantStatus, OrganisationCreatePayload } from "./types";
import type { Database } from "@/types/supabase";

type LanguageCode = Database["public"]["Enums"]["language_code_enum"];

// ============================================================================
// Result types
// ============================================================================

type MutationResult = { error: string | null };

type CreateTenantResult = {
  data: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
    updated_at: string;
    default_language: string | null;
    main_language: string | null;
    logo_url: string | null;
  } | null;
  error: string | null;
};

// ============================================================================
// Tenant CRUD
// ============================================================================

export async function createTenant(
  payload: OrganisationCreatePayload
): Promise<CreateTenantResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { data: null, error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const slug =
      payload.slug?.trim() ||
      payload.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    const { data, error: insertError } = await supabase
      .from("tenants")
      .insert({
        name: payload.name,
        status: payload.status,
        type: "organisation",
        slug: slug || null,
        contact_name: payload.contactName ?? null,
        contact_email: payload.contactEmail ?? null,
        contact_phone: payload.contactPhone ?? null,
      })
      .select(
        "id, name, slug, status, contact_name, contact_email, contact_phone, created_at, updated_at, default_language, main_language, logo_url"
      )
      .single();

    if (insertError) {
      console.error("[createTenant] Insert error:", insertError);
      return { data: null, error: insertError.message };
    }

    if (!data) {
      return { data: null, error: "Supabase returned no data for tenant insert" };
    }

    // Add initial owner in background
    void supabase.rpc("add_initial_tenant_owner", { target_tenant: data.id });

    return { data, error: null };
  } catch (err) {
    console.error("[createTenant] Unexpected error:", err);
    return {
      data: null,
      error: err instanceof Error ? err.message : "Okänt fel",
    };
  }
}

export async function deleteTenant(tenantId: string): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { data, error: deleteError } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenantId)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      if (deleteError.code === "23503") {
        return {
          error:
            "Organisationen kan inte tas bort eftersom den har kopplad data (medlemmar, innehåll, etc). Arkivera den istället, eller ta bort kopplad data först.",
        };
      }
      console.error("[deleteTenant] Delete error:", deleteError);
      return { error: deleteError.message };
    }

    if (!data) {
      return {
        error:
          "Organisationen kunde inte tas bort. Kontrollera att du har rätt behörighet (system_admin).",
      };
    }

    return { error: null };
  } catch (err) {
    console.error("[deleteTenant] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Status changes
// ============================================================================

export async function updateTenantStatus(
  tenantId: string,
  newStatus: TenantStatus,
  previousStatus?: TenantStatus
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", tenantId);

    if (updateError) {
      console.error("[updateTenantStatus] Update error:", updateError);
      return { error: updateError.message };
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "status_changed",
      payload: { from: previousStatus ?? null, to: newStatus },
    });

    return { error: null };
  } catch (err) {
    console.error("[updateTenantStatus] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Tenant details update
// ============================================================================

export async function updateTenantDetails(
  tenantId: string,
  updates: {
    name?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    defaultLanguage?: string | null;
    defaultTheme?: string | null;
  }
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.contactName !== undefined && {
          contact_name: updates.contactName,
        }),
        ...(updates.contactEmail !== undefined && {
          contact_email: updates.contactEmail,
        }),
        ...(updates.contactPhone !== undefined && {
          contact_phone: updates.contactPhone,
        }),
        ...(updates.defaultLanguage !== undefined && {
          default_language: updates.defaultLanguage,
        }),
        ...(updates.defaultTheme !== undefined && {
          default_theme: updates.defaultTheme,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateError) {
      console.error("[updateTenantDetails] Update error:", updateError);
      return { error: updateError.message };
    }

    return { error: null };
  } catch (err) {
    console.error("[updateTenantDetails] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Locale
// ============================================================================

export async function updateTenantLocale(
  tenantId: string,
  locale: {
    mainLanguage: string;
    defaultLanguage: string;
    defaultTheme: string;
  }
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        main_language: locale.mainLanguage as LanguageCode,
        default_language: locale.defaultLanguage,
        default_theme: locale.defaultTheme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);

    if (updateError) {
      console.error("[updateTenantLocale] Update error:", updateError);
      return { error: updateError.message };
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "locale_updated",
      payload: locale,
    });

    return { error: null };
  } catch (err) {
    console.error("[updateTenantLocale] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Branding — save colors/theme
// ============================================================================

export async function saveTenantBranding(
  tenantId: string,
  existingBrandingId: string | null,
  branding: {
    brandNameOverride: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    theme: "light" | "dark" | "auto";
  }
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const brandingData = {
      brand_name_override: branding.brandNameOverride,
      primary_color: branding.primaryColor,
      secondary_color: branding.secondaryColor,
      accent_color: branding.accentColor,
      theme: branding.theme,
      updated_at: new Date().toISOString(),
    };

    if (existingBrandingId) {
      const { error: updateError } = await supabase
        .from("tenant_branding")
        .update(brandingData)
        .eq("id", existingBrandingId);

      if (updateError) {
        console.error("[saveTenantBranding] Update error:", updateError);
        return { error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase
        .from("tenant_branding")
        .insert({
          tenant_id: tenantId,
          ...brandingData,
        });

      if (insertError) {
        console.error("[saveTenantBranding] Insert error:", insertError);
        return { error: insertError.message };
      }
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "branding_updated",
      payload: branding,
    });

    return { error: null };
  } catch (err) {
    console.error("[saveTenantBranding] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Branding — logo upload
// ============================================================================

export async function uploadTenantLogo(
  tenantId: string,
  existingBrandingId: string | null,
  formData: FormData
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { error: "Ingen fil bifogad" };
    }

    if (!file.type.startsWith("image/")) {
      return { error: "Endast bildfiler är tillåtna" };
    }

    if (file.size > 2 * 1024 * 1024) {
      return { error: "Bilden får inte vara större än 2MB" };
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${tenantId}/logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("tenant-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      console.error("[uploadTenantLogo] Upload error:", uploadError);
      return { error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("tenant-assets").getPublicUrl(fileName);

    if (existingBrandingId) {
      const { error: updateError } = await supabase
        .from("tenant_branding")
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBrandingId);

      if (updateError) {
        console.error("[uploadTenantLogo] Update error:", updateError);
        return { error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase
        .from("tenant_branding")
        .insert({
          tenant_id: tenantId,
          logo_url: publicUrl,
        });

      if (insertError) {
        console.error("[uploadTenantLogo] Insert error:", insertError);
        return { error: insertError.message };
      }
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "branding_logo_updated",
      payload: { fileName },
    });

    return { error: null };
  } catch (err) {
    console.error("[uploadTenantLogo] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Features — toggle
// ============================================================================

export async function toggleTenantFeature(
  tenantId: string,
  featureKey: string,
  enabled: boolean,
  existingFeatureId?: string
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    if (existingFeatureId) {
      const { error } = await supabase
        .from("tenant_features")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", existingFeatureId);

      if (error) {
        console.error("[toggleTenantFeature] Update error:", error);
        return { error: error.message };
      }
    } else {
      const { error } = await supabase
        .from("tenant_features")
        .insert({
          tenant_id: tenantId,
          feature_key: featureKey,
          enabled,
        });

      if (error) {
        console.error("[toggleTenantFeature] Insert error:", error);
        return { error: error.message };
      }
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "feature_toggled",
      payload: { feature_key: featureKey, enabled },
    });

    return { error: null };
  } catch (err) {
    console.error("[toggleTenantFeature] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

// ============================================================================
// Domains
// ============================================================================

export async function addTenantDomain(
  tenantId: string,
  hostname: string,
  kind: "subdomain" | "custom"
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error } = await supabase.from("tenant_domains").insert({
      tenant_id: tenantId,
      hostname: hostname.toLowerCase().trim(),
      kind,
      status: "pending",
    });

    if (error) {
      console.error("[addTenantDomain] Insert error:", error);
      return { error: error.message };
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "domain_added",
      payload: { hostname },
    });

    return { error: null };
  } catch (err) {
    console.error("[addTenantDomain] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

export async function removeTenantDomain(
  tenantId: string,
  domainId: string,
  hostname: string
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const { error } = await supabase
      .from("tenant_domains")
      .delete()
      .eq("id", domainId);

    if (error) {
      console.error("[removeTenantDomain] Delete error:", error);
      return { error: error.message };
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "domain_removed",
      payload: { hostname },
    });

    return { error: null };
  } catch (err) {
    console.error("[removeTenantDomain] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}

export async function updateTenantDomainStatus(
  tenantId: string,
  domainId: string,
  newStatus: "pending" | "active" | "suspended",
  hostname: string,
  previousStatus: string,
  needsVerifiedAt: boolean
): Promise<MutationResult> {
  try {
    await requireSystemAdmin("/admin/organisations");
  } catch {
    return { error: "Ingen behörighet" };
  }

  const supabase = await createServerRlsClient();

  try {
    const updates: Record<string, unknown> = { status: newStatus };
    if (needsVerifiedAt) {
      updates.verified_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tenant_domains")
      .update(updates)
      .eq("id", domainId);

    if (error) {
      console.error("[updateTenantDomainStatus] Update error:", error);
      return { error: error.message };
    }

    await supabase.from("tenant_audit_logs").insert({
      tenant_id: tenantId,
      event_type: "domain_status_changed",
      payload: { hostname, from: previousStatus, to: newStatus },
    });

    return { error: null };
  } catch (err) {
    console.error("[updateTenantDomainStatus] Unexpected error:", err);
    return { error: err instanceof Error ? err.message : "Okänt fel" };
  }
}
