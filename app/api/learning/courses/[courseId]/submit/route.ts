import { type NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tenantId, answers } = body as {
    tenantId: string
    answers: Array<{ questionId: string; selectedOptionIds: string[] }>
  }

  if (!tenantId || !answers) {
    return NextResponse.json({ error: 'Missing tenantId or answers' }, { status: 400 })
  }

  // Fetch course with quiz
  const { data: course, error: courseError } = await supabase
    .from('learning_courses')
    .select('id, quiz_json, pass_score, rewards_json, title')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const quizQuestions = course.quiz_json as Array<{
    id: string
    question: string
    options: Array<{ id: string; text: string; is_correct: boolean }>
  }>

  if (!quizQuestions || quizQuestions.length === 0) {
    return NextResponse.json({ error: 'No quiz questions in course' }, { status: 400 })
  }

  // Calculate score
  let correctCount = 0
  const gradedAnswers = answers.map(answer => {
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

  // Create or update attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('learning_course_attempts')
    .insert({
      user_id: user.id,
      tenant_id: tenantId,
      course_id: courseId,
      started_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      score,
      passed,
      answers_json: gradedAnswers,
    })
    .select('id')
    .single()

  if (attemptError) {
    console.error('Failed to create attempt:', attemptError)
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
  }

  // Upsert user progress
  const progressStatus = passed ? 'completed' : 'failed'
  const { error: progressError } = await supabase
    .from('learning_user_progress')
    .upsert({
      user_id: user.id,
      tenant_id: tenantId,
      course_id: courseId,
      status: progressStatus,
      last_score: score,
      attempts_count: 1,
      last_attempt_at: new Date().toISOString(),
      completed_at: passed ? new Date().toISOString() : null,
    }, {
      onConflict: 'user_id,tenant_id,course_id',
    })

  if (progressError) {
    console.error('Failed to update progress:', progressError)
  }

  // Grant rewards if passed
  let rewards: { dicecoin: number; xp: number; achievement?: string; levelUp: boolean } | undefined
  if (passed) {
    const { data: rewardResult, error: rewardError } = await supabase
      .rpc('learning_grant_course_rewards_v1', {
        p_user_id: user.id,
        p_tenant_id: tenantId,
        p_course_id: courseId,
        p_attempt_id: attempt.id,
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

  return NextResponse.json({
    success: true,
    score,
    passed,
    rewards,
    attemptId: attempt.id,
    courseTitle: course.title,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params
  const supabase = await createServerRlsClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  // Get user's progress for this course
  const { data: progress } = await supabase
    .from('learning_user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .single()

  // Get attempts
  const { data: attempts } = await supabase
    .from('learning_course_attempts')
    .select('*')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    progress,
    attempts: attempts || [],
  })
}
