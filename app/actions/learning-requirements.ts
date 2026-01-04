// TODO: Regenerate Supabase types after applying learning domain migration
'use server'

import { createServerRlsClient } from '@/lib/supabase/server'

export type RequirementCheckResult = {
  satisfied: boolean
  total: number
  completed: number
  remaining: number
  unsatisfiedCourses: Array<{
    courseId: string
    courseTitle: string
    courseSlug: string
  }>
}

export type GatingTarget = {
  kind: 'game' | 'activity' | 'role' | 'feature'
  id: string
  name?: string
}

/**
 * Check if a user has completed all required training for a target
 */
export async function checkRequirements(
  target: GatingTarget,
  tenantId: string
): Promise<RequirementCheckResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return {
      satisfied: false,
      total: 0,
      completed: 0,
      remaining: 0,
      unsatisfiedCourses: [],
    }
  }

  const { data: result, error } = await supabase
    .rpc('learning_get_requirement_summary', {
      p_user_id: user.id,
      p_tenant_id: tenantId,
      p_target_kind: target.kind,
      p_target_id: target.id,
    })

  if (error) {
    console.error('Failed to check requirements:', error)
    return {
      satisfied: true, // Fail open for now
      total: 0,
      completed: 0,
      remaining: 0,
      unsatisfiedCourses: [],
    }
  }

  return {
    satisfied: result?.satisfied ?? true,
    total: result?.total ?? 0,
    completed: result?.completed ?? 0,
    remaining: result?.remaining ?? 0,
    unsatisfiedCourses: result?.unsatisfiedCourses ?? [],
  }
}

/**
 * Get all requirements for a specific target
 */
export async function getRequirementsForTarget(
  target: GatingTarget,
  tenantId: string
) {
  const supabase = await createServerRlsClient()
  
  const { data: requirements } = await supabase
    .from('learning_requirements')
    .select(`
      id,
      requirement_type,
      target_ref,
      is_active,
      required_course:learning_courses(
        id,
        title,
        slug,
        description,
        difficulty,
        duration_minutes
      )
    `)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .eq('target_ref->>kind', target.kind)
    .eq('target_ref->>id', target.id)
    .eq('is_active', true)

  return requirements || []
}

/**
 * Create a new requirement (admin only)
 */
export async function createRequirement(
  tenantId: string | null,
  requirementType: 'role_unlock' | 'activity_unlock' | 'game_unlock' | 'feature_unlock',
  target: GatingTarget,
  requiredCourseId: string
) {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check if user is admin
  const { data: isAdmin } = await supabase
    .rpc('is_system_admin')

  if (!isAdmin) {
    // Check if tenant admin
    const { data: hasTenantRole } = await supabase
      .rpc('has_tenant_role', {
        _tenant_id: tenantId,
        _role: 'admin',
      })
    
    if (!hasTenantRole) {
      return { success: false, error: 'Not authorized' }
    }
  }

  const { data: requirement, error } = await supabase
    .from('learning_requirements')
    .insert({
      tenant_id: tenantId,
      requirement_type: requirementType,
      target_ref: {
        kind: target.kind,
        id: target.id,
        name: target.name,
      },
      required_course_id: requiredCourseId,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create requirement:', error)
    return { success: false, error: 'Failed to create requirement' }
  }

  return { success: true, requirementId: requirement.id }
}

/**
 * Delete a requirement (admin only)
 */
export async function deleteRequirement(requirementId: string) {
  const supabase = await createServerRlsClient()
  
  const { error } = await supabase
    .from('learning_requirements')
    .delete()
    .eq('id', requirementId)

  if (error) {
    console.error('Failed to delete requirement:', error)
    return { success: false, error: 'Failed to delete requirement' }
  }

  return { success: true }
}

/**
 * Toggle requirement active status
 */
export async function toggleRequirementActive(
  requirementId: string,
  isActive: boolean
) {
  const supabase = await createServerRlsClient()
  
  const { error } = await supabase
    .from('learning_requirements')
    .update({ is_active: isActive })
    .eq('id', requirementId)

  if (error) {
    console.error('Failed to toggle requirement:', error)
    return { success: false, error: 'Failed to update requirement' }
  }

  return { success: true }
}
