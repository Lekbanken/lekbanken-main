'use server'

import { createServerRlsClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { QuizAnswer } from '@/types/learning'

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
  tenantId: string | null
): Promise<StartCourseResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  // For global courses, we need to get the user's active tenant
  // since learning_user_progress requires a valid tenant_id
  let effectiveTenantId = tenantId
  if (!effectiveTenantId) {
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single()
    
    if (membership?.tenant_id) {
      effectiveTenantId = membership.tenant_id
    } else {
      return { success: false, error: 'No active tenant membership found' }
    }
  }

  // Ensure user progress record exists
  const { error: progressError } = await supabase
    .from('learning_user_progress')
    .upsert({
      user_id: user.id,
      tenant_id: effectiveTenantId,
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
      tenant_id: effectiveTenantId,
      course_id: courseId,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (attemptError) {
    console.error('Failed to create attempt:', attemptError)
    return { success: false, error: 'Failed to create attempt' }
  }

  // Note: attempts_count is incremented by database trigger or handled in progress update
  // No separate RPC call needed

  return { success: true, attemptId: attempt.id }
}

/**
 * Submit quiz answers and calculate score
 */
export async function submitQuizAnswers(
  courseId: string,
  tenantId: string | null,
  attemptId: string,
  answers: Array<{ questionId: string; selectedOptionIds: string[] }>
): Promise<SubmitQuizResult> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, score: 0, passed: false, error: 'Not authenticated' }
  }

  // For global courses, get the user's active tenant
  let effectiveTenantId = tenantId
  if (!effectiveTenantId) {
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .single()
    
    if (membership?.tenant_id) {
      effectiveTenantId = membership.tenant_id
    } else {
      return { success: false, score: 0, passed: false, error: 'No active tenant membership found' }
    }
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
  
  // First fetch existing best_score to compare
  const { data: existingProgress } = await supabase
    .from('learning_user_progress')
    .select('best_score')
    .eq('user_id', user.id)
    .eq('tenant_id', effectiveTenantId)
    .eq('course_id', courseId)
    .single()
  
  const currentBestScore = existingProgress?.best_score ?? 0
  const newBestScore = Math.max(score, currentBestScore)
  
  const { error: progressError } = await supabase
    .from('learning_user_progress')
    .update({
      status: progressStatus,
      last_score: score,
      best_score: newBestScore,
      last_attempt_at: new Date().toISOString(),
      completed_at: passed ? new Date().toISOString() : null,
    })
    .eq('user_id', user.id)
    .eq('tenant_id', effectiveTenantId)
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
        p_tenant_id: effectiveTenantId,
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

// ============================================
// TYPES FOR LEARNER COURSE LIST
// ============================================

export type LearnerCourseStatus = 'available' | 'in_progress' | 'completed' | 'failed' | 'locked';

export interface LearnerCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: LearnerCourseStatus;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  estimated_duration_minutes: number | null;
  pass_score: number | null;
  rewards: {
    dicecoin?: number;
    xp?: number;
    achievement_id?: string;
  };
  progress?: {
    best_score: number | null;
    last_score: number | null;
    attempts_count: number | null;
    completed_at: string | null;
  };
  lockedReason?: string;
}

export interface LearnerDashboardData {
  courses: LearnerCourse[];
  stats: {
    coursesCompleted: number;
    totalCourses: number;
    totalXpEarned: number;
    totalDicecoinEarned: number;
  };
}

/**
 * Get available courses for the current learner
 * Combines active courses with user progress data
 */
export async function getAvailableCoursesForLearner(
  tenantId?: string
): Promise<LearnerDashboardData> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { 
      courses: [], 
      stats: { coursesCompleted: 0, totalCourses: 0, totalXpEarned: 0, totalDicecoinEarned: 0 } 
    }
  }

  // Fetch active courses - global ones (tenant_id is null) and tenant-specific if provided
  let coursesQuery = supabase
    .from('learning_courses')
    .select('id, slug, title, description, difficulty, duration_minutes, pass_score, rewards_json, tenant_id')
    .eq('status', 'active')
    .order('title', { ascending: true })

  // If tenant is specified, get global + tenant courses
  // Otherwise, only get global courses
  if (tenantId) {
    coursesQuery = coursesQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
  } else {
    coursesQuery = coursesQuery.is('tenant_id', null)
  }

  const { data: courses, error: coursesError } = await coursesQuery

  if (coursesError || !courses) {
    console.error('Failed to fetch courses:', coursesError)
    return { 
      courses: [], 
      stats: { coursesCompleted: 0, totalCourses: 0, totalXpEarned: 0, totalDicecoinEarned: 0 } 
    }
  }

  // Fetch user progress for all courses
  let progressQuery = supabase
    .from('learning_user_progress')
    .select('course_id, status, best_score, last_score, attempts_count, completed_at')
    .eq('user_id', user.id)

  if (tenantId) {
    progressQuery = progressQuery.eq('tenant_id', tenantId)
  }

  const { data: progressList } = await progressQuery

  // Create a map for quick lookup
  type ProgressRecord = {
    course_id: string;
    status: string;
    best_score: number | null;
    last_score: number | null;
    attempts_count: number | null;
    completed_at: string | null;
  };
  const progressMap = new Map<string, ProgressRecord>()
  if (progressList) {
    for (const p of progressList) {
      progressMap.set(p.course_id, p as ProgressRecord)
    }
  }

  // Calculate stats
  let coursesCompleted = 0
  let totalXpEarned = 0
  let totalDicecoinEarned = 0

  // Map courses to learner format
  const learnerCourses: LearnerCourse[] = courses.map(course => {
    const progress = progressMap.get(course.id)
    const rewardsJson = (course.rewards_json as { dicecoin_amount?: number; xp_amount?: number; achievement_id?: string }) || {}
    
    // Map database field names to learner format
    const rewards = {
      dicecoin: rewardsJson.dicecoin_amount,
      xp: rewardsJson.xp_amount,
      achievement_id: rewardsJson.achievement_id,
    }
    
    // Determine status
    let status: LearnerCourseStatus = 'available'
    if (progress) {
      if (progress.status === 'completed') {
        status = 'completed'
        coursesCompleted++
        totalXpEarned += rewards.xp || 0
        totalDicecoinEarned += rewards.dicecoin || 0
      } else if (progress.status === 'failed') {
        status = 'failed'
      } else if (progress.status === 'in_progress') {
        status = 'in_progress'
      }
    }

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      status,
      difficulty: course.difficulty as LearnerCourse['difficulty'],
      estimated_duration_minutes: course.duration_minutes,
      pass_score: course.pass_score,
      rewards,
      progress: progress ? {
        best_score: progress.best_score,
        last_score: progress.last_score,
        attempts_count: progress.attempts_count,
        completed_at: progress.completed_at,
      } : undefined,
    }
  })

  return {
    courses: learnerCourses,
    stats: {
      coursesCompleted,
      totalCourses: courses.length,
      totalXpEarned,
      totalDicecoinEarned,
    },
  }
}

// ============================================
// TYPES FOR COURSE RUNNER
// ============================================

export interface CourseContentBlock {
  type: 'text' | 'image' | 'video';
  content: string;
  title?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    is_correct?: boolean; // Only visible in admin, not exposed to learner
  }>;
}

export interface CourseRunnerData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  estimated_duration_minutes: number | null;
  pass_score: number | null;
  content_blocks: CourseContentBlock[];
  quiz_questions: QuizQuestion[];
  rewards: {
    dicecoin?: number;
    xp?: number;
    achievement_id?: string;
  };
  userProgress?: {
    status: string;
    best_score: number | null;
    attempts_count: number | null;
  };
}

/**
 * Get course details for the course runner
 */
export async function getCourseBySlug(
  slug: string,
  tenantId?: string
): Promise<CourseRunnerData | null> {
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }

  // Fetch course by slug
  let courseQuery = supabase
    .from('learning_courses')
    .select('id, slug, title, description, duration_minutes, pass_score, content_json, quiz_json, rewards_json, tenant_id')
    .eq('slug', slug)
    .eq('status', 'active')

  // If tenant is specified, get global + tenant courses
  if (tenantId) {
    courseQuery = courseQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
  } else {
    courseQuery = courseQuery.is('tenant_id', null)
  }

  const { data: course, error: courseError } = await courseQuery.single()

  if (courseError || !course) {
    console.error('Course not found:', courseError)
    return null
  }

  // Fetch user progress for this course
  let progressQuery = supabase
    .from('learning_user_progress')
    .select('status, best_score, attempts_count')
    .eq('user_id', user.id)
    .eq('course_id', course.id)

  if (tenantId) {
    progressQuery = progressQuery.eq('tenant_id', tenantId)
  }

  const { data: progress } = await progressQuery.maybeSingle()

  // Parse and map content JSON from admin format to runner format
  // Admin uses: { id, title, body_markdown, order }
  // Runner expects: { type, content, title }
  type AdminContentSection = { id: string; title?: string; body_markdown?: string; order?: number };
  const rawContent = (course.content_json as AdminContentSection[]) || []
  const contentBlocks: CourseContentBlock[] = rawContent.map(section => ({
    type: 'text',
    content: section.body_markdown || '',
    title: section.title,
  }))

  // Parse quiz JSON - options have is_correct but we don't expose it
  type AdminQuizQuestion = { 
    id: string; 
    question: string; 
    options: Array<{ id: string; text: string; is_correct?: boolean }>; 
    order?: number;
  };
  const rawQuiz = (course.quiz_json as AdminQuizQuestion[]) || []
  const quizQuestions: QuizQuestion[] = rawQuiz.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options.map(opt => ({
      id: opt.id,
      text: opt.text,
      // Don't expose is_correct to client
    }))
  }))

  // Parse rewards JSON - admin uses dicecoin_amount/xp_amount, we normalize to dicecoin/xp
  type AdminRewards = { dicecoin_amount?: number; xp_amount?: number; achievement_id?: string };
  const rawRewards = (course.rewards_json as AdminRewards) || {}
  const rewards = {
    dicecoin: rawRewards.dicecoin_amount,
    xp: rawRewards.xp_amount,
    achievement_id: rawRewards.achievement_id,
  }

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    estimated_duration_minutes: course.duration_minutes,
    pass_score: course.pass_score,
    content_blocks: contentBlocks,
    quiz_questions: quizQuestions,
    rewards: {
      dicecoin: rewards.dicecoin,
      xp: rewards.xp,
      achievement_id: rewards.achievement_id,
    },
    userProgress: progress ? {
      status: progress.status,
      best_score: progress.best_score,
      attempts_count: progress.attempts_count,
    } : undefined,
  }
}
