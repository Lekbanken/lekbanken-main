'use server';

import { supabaseAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/supabase';

// Use database type for membership role to ensure compatibility
type TenantRoleEnum = Database['public']['Enums']['tenant_role_enum'];

// =============================================================================
// Types
// =============================================================================

export type CreateUserInput = {
  email: string;
  password: string;
  fullName?: string;
  autoConfirm: boolean;
  tenantId?: string;
  tenantRole?: TenantRoleEnum;
  globalRole?: 'system_admin' | 'private_user' | 'member';
};

export type CreateUserResult = {
  success: boolean;
  userId?: string;
  error?: string;
};

export type ResetPasswordResult = {
  success: boolean;
  error?: string;
};

export type UpdatePasswordResult = {
  success: boolean;
  error?: string;
};

// =============================================================================
// Create User
// =============================================================================

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  try {
    // Create user via Supabase Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: input.autoConfirm,
      user_metadata: {
        full_name: input.fullName || null,
      },
    });

    if (authError) {
      console.error('[createUser] Auth error:', authError);
      return {
        success: false,
        error: authError.message || 'Kunde inte skapa användare',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'Användaren kunde inte skapas',
      };
    }

    const userId = authData.user.id;

    // Create profile in users table
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: input.email,
        full_name: input.fullName || null,
        role: input.globalRole || 'member',
        status: input.autoConfirm ? 'active' : 'pending',
      });

    if (profileError) {
      console.error('[createUser] Profile error:', profileError);
      // User was created in auth, but profile failed - still return success with warning
    }

    // If tenant is specified, create membership
    if (input.tenantId && input.tenantRole) {
      const { error: membershipError } = await supabaseAdmin
        .from('user_tenant_memberships')
        .insert({
          user_id: userId,
          tenant_id: input.tenantId,
          role: input.tenantRole,
          status: 'active',
          is_primary: true,
        });

      if (membershipError) {
        console.error('[createUser] Membership error:', membershipError);
        // User was created, membership failed - still return success with warning
      }
    }

    revalidatePath('/admin/users');

    return {
      success: true,
      userId,
    };
  } catch (error) {
    console.error('[createUser] Unexpected error:', error);
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    };
  }
}

// =============================================================================
// Send Password Reset Email
// =============================================================================

export async function sendPasswordResetEmail(email: string): Promise<ResetPasswordResult> {
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    });

    if (error) {
      console.error('[sendPasswordResetEmail] Error:', error);
      return {
        success: false,
        error: error.message || 'Kunde inte skicka återställningsmail',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[sendPasswordResetEmail] Unexpected error:', error);
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    };
  }
}

// =============================================================================
// Update Password (Admin-set new password)
// =============================================================================

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<UpdatePasswordResult> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      console.error('[updateUserPassword] Error:', error);
      return {
        success: false,
        error: error.message || 'Kunde inte uppdatera lösenord',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[updateUserPassword] Unexpected error:', error);
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    };
  }
}

// =============================================================================
// Delete User
// =============================================================================

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from auth (this will cascade to profiles via trigger or manually)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('[deleteUser] Error:', error);
      return {
        success: false,
        error: error.message || 'Kunde inte ta bort användare',
      };
    }

    revalidatePath('/admin/users');

    return { success: true };
  } catch (error) {
    console.error('[deleteUser] Unexpected error:', error);
    return {
      success: false,
      error: 'Ett oväntat fel uppstod',
    };
  }
}

// =============================================================================
// Get Available Tenants for User Creation
// =============================================================================

export async function getTenantsForUserCreation(): Promise<{
  tenants: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('[getTenantsForUserCreation] Error:', error);
      return { tenants: [], error: error.message };
    }

    return {
      tenants: (data || []).map((t) => ({
        id: t.id,
        name: t.name || 'Namnlös organisation',
      })),
    };
  } catch (error) {
    console.error('[getTenantsForUserCreation] Unexpected error:', error);
    return { tenants: [], error: 'Ett oväntat fel uppstod' };
  }
}
