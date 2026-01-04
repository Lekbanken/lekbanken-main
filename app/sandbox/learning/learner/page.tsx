'use client'

import { useState } from 'react'
import { SandboxShell as SandboxShellV2 } from '../../components/shell/SandboxShellV2'
import { 
  LockClosedIcon, 
  LockOpenIcon, 
  CheckCircleIcon,
  PlayIcon,
  ChevronRightIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'

// Simplified mock types for sandbox (avoids strict typing for prototyping)
type MockCourse = {
  id: string
  tenant_id: string | null
  slug: string
  title: string
  description: string
  status: 'draft' | 'active' | 'archived'
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags: string[]
  content_json: Array<{ id: string; title: string; body: string }>
  quiz_json: Array<{ id: string; question: string; options: Array<{ id: string; text: string; isCorrect: boolean }> }>
  pass_score: number
  rewards_json: { dicecoin?: number; xp?: number; achievement_id?: string }
  duration_minutes: number
  version: number
  created_at: string
  updated_at: string
}

type MockProgress = {
  user_id: string
  tenant_id: string
  course_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  best_score: number | null
  attempts_count: number
  rewards_granted_at: string | null
  created_at: string
  updated_at: string
}

// Mock courses for the learner view
const mockCourses: MockCourse[] = [
  {
    id: 'course-1',
    tenant_id: null,
    slug: 'intro-lekledare',
    title: 'Introduktion till Lekledare',
    description: 'Grundläggande kunskap för alla nya lekledare. Lär dig dina huvudsakliga uppgifter och ansvar.',
    status: 'active',
    difficulty: 'beginner',
    tags: ['grundkurs', 'obligatorisk'],
    content_json: [
      { id: 's1', title: 'Välkommen', body: 'Välkommen till din resa som lekledare! I denna kurs kommer du att lära dig grunderna för att bli en framgångsrik lekledare.' },
      { id: 's2', title: 'Ditt ansvar', body: 'Som lekledare har du ansvar för säkerhet, engagemang och att skapa en positiv upplevelse för alla deltagare.' },
      { id: 's3', title: 'Nästa steg', body: 'När du är klar med denna kurs kan du fortsätta med säkerhetsutbildningen.' },
    ],
    quiz_json: [
      { 
        id: 'q1', 
        question: 'Vad är viktigast för en lekledare?', 
        options: [
          { id: 'o1', text: 'Säkerhet', isCorrect: true },
          { id: 'o2', text: 'Hastighet', isCorrect: false },
          { id: 'o3', text: 'Att vinna', isCorrect: false },
        ]
      },
      { 
        id: 'q2', 
        question: 'Hur bör du behandla alla deltagare?', 
        options: [
          { id: 'o1', text: 'Med respekt och inkludering', isCorrect: true },
          { id: 'o2', text: 'Strikt och auktoritärt', isCorrect: false },
        ]
      }
    ],
    pass_score: 80,
    rewards_json: { dicecoin: 100, xp: 50 },
    duration_minutes: 15,
    version: 1,
    created_at: '2025-01-01T10:00:00Z',
    updated_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'course-2',
    tenant_id: null,
    slug: 'sakerhet-grundkurs',
    title: 'Säkerhet Grundkurs',
    description: 'Lär dig grundläggande säkerhetsrutiner och riskbedömning.',
    status: 'active',
    difficulty: 'beginner',
    tags: ['säkerhet', 'obligatorisk'],
    content_json: [
      { id: 's1', title: 'Riskbedömning', body: 'Innan varje aktivitet ska du göra en snabb riskbedömning.' },
    ],
    quiz_json: [
      { 
        id: 'q1', 
        question: 'När ska du göra riskbedömning?', 
        options: [
          { id: 'o1', text: 'Före varje aktivitet', isCorrect: true },
          { id: 'o2', text: 'En gång per månad', isCorrect: false },
        ]
      }
    ],
    pass_score: 100,
    rewards_json: { dicecoin: 150, xp: 75 },
    duration_minutes: 20,
    version: 1,
    created_at: '2025-01-02T10:00:00Z',
    updated_at: '2025-01-02T10:00:00Z',
  },
  {
    id: 'course-3',
    tenant_id: null,
    slug: 'avancerad-ledarskap',
    title: 'Avancerat Ledarskap',
    description: 'Fördjupning i ledarskapsmetoder för erfarna lekledare.',
    status: 'active',
    difficulty: 'advanced',
    tags: ['ledarskap', 'fördjupning'],
    content_json: [],
    quiz_json: [],
    pass_score: 70,
    rewards_json: { dicecoin: 300, xp: 150 },
    duration_minutes: 45,
    version: 1,
    created_at: '2025-01-03T10:00:00Z',
    updated_at: '2025-01-03T10:00:00Z',
  },
]

// Mock user progress - course 1 is completed, course 2 is available, course 3 is locked
const mockProgress: Record<string, MockProgress> = {
  'course-1': {
    user_id: 'user-1',
    tenant_id: 'tenant-1',
    course_id: 'course-1',
    status: 'completed',
    best_score: 100,
    attempts_count: 1,
    rewards_granted_at: '2025-01-05T14:00:00Z',
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T14:00:00Z',
  },
}

// Prerequisite rules (course-2 requires course-1, course-3 requires course-2)
const prerequisites: Record<string, string[]> = {
  'course-2': ['course-1'],
  'course-3': ['course-2'],
}

type CourseViewState = 'list' | 'running' | 'quiz' | 'result'

export default function LearnerSandboxPage() {
  const [viewState, setViewState] = useState<CourseViewState>('list')
  const [activeCourse, setActiveCourse] = useState<MockCourse | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [progress, setProgress] = useState<Record<string, MockProgress>>(mockProgress)

  const getCourseStatus = (courseId: string): 'locked' | 'available' | 'in_progress' | 'completed' => {
    const courseProgress = progress[courseId]
    if (courseProgress?.status === 'completed') return 'completed'
    if (courseProgress?.status === 'in_progress') return 'in_progress'
    
    const requiredCourses = prerequisites[courseId] || []
    const allPrereqsMet = requiredCourses.every(reqId => progress[reqId]?.status === 'completed')
    
    return allPrereqsMet ? 'available' : 'locked'
  }

  const startCourse = (course: MockCourse) => {
    setActiveCourse(course)
    setCurrentSection(0)
    setCurrentQuestion(0)
    setAnswers({})
    setQuizResult(null)
    setViewState('running')
  }

  const handleNextSection = () => {
    if (!activeCourse) return
    if (currentSection < activeCourse.content_json.length - 1) {
      setCurrentSection(currentSection + 1)
    } else {
      setViewState('quiz')
    }
  }

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers({ ...answers, [questionId]: optionId })
  }

  const handleSubmitQuiz = () => {
    if (!activeCourse) return
    
    let correct = 0
    activeCourse.quiz_json.forEach(q => {
      const selectedOption = q.options.find(o => o.id === answers[q.id])
      if (selectedOption?.isCorrect) correct++
    })
    
    const score = Math.round((correct / activeCourse.quiz_json.length) * 100)
    const passed = score >= activeCourse.pass_score

    setQuizResult({ score, passed })
    
    if (passed) {
      setProgress({
        ...progress,
        [activeCourse.id]: {
          user_id: 'user-1',
          tenant_id: 'tenant-1',
          course_id: activeCourse.id,
          status: 'completed',
          best_score: score,
          attempts_count: (progress[activeCourse.id]?.attempts_count || 0) + 1,
          rewards_granted_at: new Date().toISOString(),
          created_at: progress[activeCourse.id]?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      })
    }
    
    setViewState('result')
  }

  const handleBackToList = () => {
    setViewState('list')
    setActiveCourse(null)
  }

  const statusConfig = {
    locked: { icon: LockClosedIcon, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800', label: 'Låst' },
    available: { icon: LockOpenIcon, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', label: 'Tillgänglig' },
    in_progress: { icon: PlayIcon, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/30', label: 'Pågående' },
    completed: { icon: CheckCircleIcon, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/30', label: 'Klar' },
  }

  // Course List View
  if (viewState === 'list') {
    return (
      <SandboxShellV2
        moduleId="learning"
        title="Min lärresa"
        description="Utforska tillgängliga kurser och se din progression."
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-border bg-gradient-to-r from-primary/10 to-primary/5 p-6">
            <h1 className="text-2xl font-bold text-foreground">🎓 Min lärresa</h1>
            <p className="mt-2 text-muted-foreground">
              Slutför kurser för att låsa upp nya och tjäna belöningar!
            </p>
            <div className="mt-4 flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>{Object.values(progress).filter(p => p.status === 'completed').length} klara</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500">🪙</span>
                <span>250 DiceCoin tjänade</span>
              </div>
            </div>
          </div>

          {/* Course Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockCourses.map((course) => {
              const status = getCourseStatus(course.id)
              const config = statusConfig[status]
              const StatusIcon = config.icon
              const isClickable = status !== 'locked'

              return (
                <div
                  key={course.id}
                  className={`group rounded-lg border border-border p-5 transition-all ${
                    isClickable 
                      ? 'cursor-pointer hover:border-primary/50 hover:shadow-md' 
                      : 'opacity-60'
                  }`}
                  onClick={() => isClickable && startCourse(course)}
                >
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2 ${config.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    {course.rewards_json && (
                      <div className="text-right text-sm">
                        <div className="text-amber-600">🪙 {course.rewards_json.dicecoin}</div>
                        <div className="text-blue-600">⚡ {course.rewards_json.xp} XP</div>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary">
                    {course.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      ~{course.duration_minutes} min
                    </span>
                    <span className={`text-xs font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  {status === 'locked' && prerequisites[course.id] && (
                    <div className="mt-3 rounded bg-muted/50 p-2 text-xs text-muted-foreground">
                      Kräver: {mockCourses.find(c => c.id === prerequisites[course.id][0])?.title}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </SandboxShellV2>
    )
  }

  // Course Content View
  if (viewState === 'running' && activeCourse) {
    const section = activeCourse.content_json[currentSection]
    const isLastSection = currentSection === activeCourse.content_json.length - 1

    return (
      <SandboxShellV2
        moduleId="learning"
        title={activeCourse.title}
        description={`Del ${currentSection + 1} av ${activeCourse.content_json.length}`}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {activeCourse.content_json.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full ${
                  idx <= currentSection ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
            <div className={`h-1.5 flex-1 rounded-full bg-muted`} />
          </div>

          {/* Content */}
          <div className="rounded-lg border border-border bg-card p-8">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            <div className="mt-4 prose prose-sm dark:prose-invert">
              <p className="text-muted-foreground whitespace-pre-wrap">{section.body}</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handleBackToList}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Avbryt
            </button>
            <button
              onClick={handleNextSection}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {isLastSection ? 'Starta quiz' : 'Fortsätt'}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </SandboxShellV2>
    )
  }

  // Quiz View
  if (viewState === 'quiz' && activeCourse) {
    const question = activeCourse.quiz_json[currentQuestion]
    const isLastQuestion = currentQuestion === activeCourse.quiz_json.length - 1

    return (
      <SandboxShellV2
        moduleId="learning"
        title="Quiz"
        description={`Fråga ${currentQuestion + 1} av ${activeCourse.quiz_json.length}`}
      >
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {activeCourse.quiz_json.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full ${
                  idx <= currentQuestion ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Question */}
          <div className="rounded-lg border border-border bg-card p-8">
            <h2 className="text-lg font-semibold text-foreground">{question.question}</h2>
            
            <div className="mt-6 space-y-3">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                    answers[question.id] === option.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={answers[question.id] === option.id}
                    onChange={() => handleAnswerSelect(question.id, option.id)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-foreground">{option.text}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => currentQuestion > 0 ? setCurrentQuestion(currentQuestion - 1) : setViewState('running')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Tillbaka
            </button>
            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={!answers[question.id]}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Skicka in
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                disabled={!answers[question.id]}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Nästa fråga
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </SandboxShellV2>
    )
  }

  // Result View
  if (viewState === 'result' && activeCourse && quizResult) {
    return (
      <SandboxShellV2
        moduleId="learning"
        title="Resultat"
        description={activeCourse.title}
      >
        <div className="mx-auto max-w-md space-y-6">
          <div className={`rounded-lg border p-8 text-center ${
            quizResult.passed 
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
            {quizResult.passed ? (
              <>
                <TrophyIcon className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="mt-4 text-2xl font-bold text-green-700 dark:text-green-400">
                  Grattis! 🎉
                </h2>
                <p className="mt-2 text-green-600 dark:text-green-400">
                  Du klarade kursen med {quizResult.score}%
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <span className="text-3xl">😔</span>
                </div>
                <h2 className="mt-4 text-2xl font-bold text-red-700 dark:text-red-400">
                  Inte godkänt
                </h2>
                <p className="mt-2 text-red-600 dark:text-red-400">
                  Du fick {quizResult.score}%, men behöver {activeCourse.pass_score}% för att bli godkänd.
                </p>
              </>
            )}
          </div>

          {quizResult.passed && activeCourse.rewards_json && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground">Belöningar intjänade:</h3>
              <div className="mt-3 flex justify-center gap-6">
                {activeCourse.rewards_json.dicecoin && (
                  <div className="text-center">
                    <div className="text-2xl">🪙</div>
                    <div className="mt-1 font-bold text-amber-600">
                      +{activeCourse.rewards_json.dicecoin}
                    </div>
                    <div className="text-xs text-muted-foreground">DiceCoin</div>
                  </div>
                )}
                {activeCourse.rewards_json.xp && (
                  <div className="text-center">
                    <div className="text-2xl">⚡</div>
                    <div className="mt-1 font-bold text-blue-600">
                      +{activeCourse.rewards_json.xp}
                    </div>
                    <div className="text-xs text-muted-foreground">XP</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {!quizResult.passed && (
              <button
                onClick={() => {
                  setCurrentQuestion(0)
                  setAnswers({})
                  setViewState('quiz')
                }}
                className="rounded-lg border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Försök igen
              </button>
            )}
            <button
              onClick={handleBackToList}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Tillbaka till kurser
            </button>
          </div>
        </div>
      </SandboxShellV2>
    )
  }

  return null
}
