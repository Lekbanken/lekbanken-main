// @ts-nocheck
// TODO: Regenerate Supabase types after applying learning domain migration
// Run: npx supabase gen types typescript --local > types/supabase.ts
'use server'

import { createServerRlsClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { QuizAnswer, LearningCourseAttempt } from '@/types/learning'

export type SubmitQuizResult = {
  success: boolean
  score: number
  passed: boolean
  rewards?: {
    dicecoin: number
    xp: number
    achievement?: string
    levelUp: boolean
  }
  error?: string
  attemptId?: string
}

export type StartCourseResult = {
  success: boolean
  attemptId?: string
  error?: string
}

/**
 * Start a new course attempt
 */
export async function startCourseAttempt(
  courseId: string,
  tenantId: string
): Promise<StartCourseResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Ensure user progress record exists
  const { error: progressError } = await supabase
    .from('learning_user_progress')
    .upsert({
      user_id: user.id,
      tenant_id: tenantId,
      course_id: courseId,
      status: 'in_progress',
      attempts_count: 0,
    }, {
      onConflict: 'user_id,tenant_id,course_id',
      ignoreDuplicates: false,
    })

  if (progressError) {
    console.error('Failed to create progress record:', progressError)
    return { success: false, error: 'Failed to start course' }
  }

  // Create attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from('learning_course_attempts')
    .insert({
      user_id: user.id,
      tenant_id: tenantId,
      course_id: courseId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (attemptError) {
    console.error('Failed to create attempt:', attemptError)
    return { success: false, error: 'Failed to create attempt' }
  }

  // Increment attempts count
  await supabase.rpc('increment', {
    row_id: user.id,
    table_name: 'learning_user_progress',
    column_name: 'attempts_count',
  }).catch(() => {
    // Fallback if RPC doesn't exist
  })

  return { success: true, attemptId: attempt.id }
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuizAnswers(
  courseId: string,
  tenantId: string,
  attemptId: string,
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>
): Promise<SubmitQuizResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, score: 0, passed: false, error: 'Not authenticated' }
  }

  // Fetch course with quiz
  const { data: course, error: courseError } = await supabase
    .from('learning_courses')
    .select('id, quiz_json, pass_score, rewards_json')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return { success: false, score: 0, passed: false, error: 'Course not found' }
  }

  const quizQuestions = course.quiz_json as Array<{
    id: string
    question: string
    options: Array<{ id: string; text: string; is_correct: boolean }>
  }>

  if (!quizQuestions || quizQuestions.length === 0) {
    return { success: false, score: 0, passed: false, error: 'No quiz questions' }
  }

  // Calculate score
  let correctCount = 0
  const gradedAnswers: QuizAnswer[] = answers.map(answer => {
    const question = quizQuestions.find(q => q.id === answer.questionId)
    if (!question) {
      return { question_id: answer.questionId, selected_option_ids: answer.selectedOptionIds, is_correct: false }
    }

    const correctOptionIds = question.options
      .filter(o => o.is_correct)
      .map(o => o.id)
      .sort()

    const selectedSorted = [...answer.selectedOptionIds].sort()
    const isCorrect = JSON.stringify(correctOptionIds) === JSON.stringify(selectedSorted)

    if (isCorrect) correctCount++

    return {
      question_id: answer.questionId,
      selected_option_ids: answer.selectedOptionIds,
      is_correct: isCorrect,
    }
  })

  const score = Math.round((correctCount / quizQuestions.length) * 100)
  const passed = score >= (course.pass_score || 80)

  // Update attempt
  const { error: updateAttemptError } = await supabase
    .from('learning_course_attempts')
    .update({
      submitted_at: new Date().toISOString(),
      score,
      passed,
      answers_json: gradedAnswers,
    })
    .eq('id', attemptId)

  if (updateAttemptError) {
    console.error('Failed to update attempt:', updateAttemptError)
  }

  // Update user progress
  const progressStatus = passed ? 'completed' : 'failed'
  const { error: progressError } = await supabase
    .from('learning_user_progress')
    .update({
      status: progressStatus,
      last_score: score,
      best_score: supabase.rpc('greatest', { a: score, b: 0 }), // Will be handled by trigger
      last_attempt_at: new Date().toISOString(),
      completed_at: passed ? new Date().toISOString() : null,
    })
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)

  if (progressError) {
    console.error('Failed to update progress:', progressError)
  }

  // Grant rewards if passed
  let rewards: SubmitQuizResult['rewards'] = undefined
  if (passed) {
    const { data: rewardResult, error: rewardError } = await supabase
      .rpc('learning_grant_course_rewards_v1', {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_course_id: courseId,
        p_attempt_id: attemptId,
      })

    if (rewardError) {
      console.error('Failed to grant rewards:', rewardError)
    } else if (rewardResult && rewardResult.length > 0) {
      const r = rewardResult[0]
      rewards = {
        dicecoin: r.dicecoin_granted || 0,
        xp: r.xp_granted || 0,
        achievement: r.achievement_unlocked || undefined,
        levelUp: r.level_up || false,
      }
    }
  }

  revalidatePath('/app/learning')
  revalidatePath('/sandbox/learning')

  return {
    success: true,
    score,
    passed,
    rewards,
    attemptId,
  }
}

/**
 * Get user's progress for a specific course
 */
export async function getCourseProgress(
  courseId: string,
  tenantId: string
) {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  const { data: progress } = await supabase
    .from('learning_user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .single()

  return progress
}

/**
 * Get all course progress for current user in a tenant
 */
export async function getAllCourseProgress(tenantId: string) {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return []
  }

  const { data: progress } = await supabase
    .from('learning_user_progress')
    .select('*, course:learning_courses(*)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)

  return progress || []
}

/**
 * Check if prerequisites are met for a course
 */
export async function checkPrerequisites(
  courseId: string,
  pathId: string,
  tenantId: string
): Promise<{ met: boolean; missing: string[] }> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { met: false, missing: ['Not authenticated'] }
  }

  const { data: result } = await supabase
    .rpc('learning_prerequisites_met', {
      p_user_id: user.id,
      p_tenant_id: tenantId,
      p_path_id: pathId,
      p_course_id: courseId,
    })

  if (result === true) {
    return { met: true, missing: [] }
  }

  // Get missing prerequisites
  const { data: edges } = await supabase
    .from('learning_path_edges')
    .select('from_course_id, from_course:learning_courses!from_course_id(title)')
    .eq('path_id', pathId)
    .eq('to_course_id', courseId)

  const { data: completedCourses } = await supabase
    .from('learning_user_progress')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const completedIds = new Set(completedCourses?.map(c => c.course_id) || [])
  const missing = edges
    ?.filter(e => !completedIds.has(e.from_course_id))
    .map(e => (e.from_course as { title: string })?.title || e.from_course_id) || []

  return { met: false, missing }
}
