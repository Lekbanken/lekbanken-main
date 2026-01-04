/**
 * Learning Domain Types
 * Types for courses, paths, progress, and requirements
 */

// =============================================================================
// Course Types
// =============================================================================

export type CourseStatus = 'draft' | 'active' | 'archived';
export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type CourseContentSection = {
  id: string;
  title: string;
  body_markdown: string;
  media_url?: string;
  order: number;
};

export type QuizOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  explanation?: string;
  order: number;
};

export type CourseRewards = {
  dicecoin_amount?: number;
  xp_amount?: number;
  achievement_id?: string;
};

export type LearningCourse = {
  id: string;
  tenant_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  difficulty: CourseDifficulty;
  tags: string[];
  content_json: CourseContentSection[];
  quiz_json: QuizQuestion[];
  pass_score: number;
  rewards_json: CourseRewards;
  duration_minutes: number | null;
  cover_image_url: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseFormData = {
  slug: string;
  title: string;
  description: string;
  status: CourseStatus;
  difficulty: CourseDifficulty;
  tags: string[];
  content_sections: CourseContentSection[];
  quiz_questions: QuizQuestion[];
  pass_score: number;
  rewards: CourseRewards;
  duration_minutes: number | null;
  cover_image_url: string | null;
};

// =============================================================================
// Path Types
// =============================================================================

export type PathStatus = 'draft' | 'active' | 'archived';
export type PathKind = 'onboarding' | 'role' | 'theme' | 'compliance';

export type LearningPath = {
  id: string;
  tenant_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: PathStatus;
  kind: PathKind;
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PathNodePosition = {
  x: number;
  y: number;
};

export type LearningPathNode = {
  id: string;
  path_id: string;
  course_id: string;
  position_json: PathNodePosition;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined data
  course?: LearningCourse;
};

export type EdgeRule = {
  type: 'completed';
};

export type LearningPathEdge = {
  id: string;
  path_id: string;
  from_course_id: string;
  to_course_id: string;
  rule_json: EdgeRule;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PathFormData = {
  slug: string;
  title: string;
  description: string;
  status: PathStatus;
  kind: PathKind;
  cover_image_url: string | null;
};

// =============================================================================
// Progress Types
// =============================================================================

export type ProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

export type LearningUserProgress = {
  id: string;
  user_id: string;
  tenant_id: string;
  course_id: string;
  status: ProgressStatus;
  best_score: number | null;
  last_score: number | null;
  attempts_count: number;
  completed_at: string | null;
  last_attempt_at: string | null;
  rewards_granted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  course?: LearningCourse;
};

export type QuizAnswer = {
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
};

export type LearningCourseAttempt = {
  id: string;
  user_id: string;
  tenant_id: string;
  course_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  passed: boolean | null;
  answers_json: QuizAnswer[];
  time_spent_seconds: number | null;
  created_at: string;
};

// =============================================================================
// Requirement Types
// =============================================================================

export type RequirementType = 'role_unlock' | 'activity_unlock' | 'game_unlock' | 'onboarding_required';
export type RequiredStatus = 'completed' | 'in_progress';

export type TargetRef = {
  kind: 'game' | 'role' | 'feature' | 'activity';
  id: string;
  name?: string;
};

export type LearningRequirement = {
  id: string;
  tenant_id: string | null;
  requirement_type: RequirementType;
  target_ref: TargetRef;
  required_course_id: string;
  required_status: RequiredStatus;
  priority: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  required_course?: LearningCourse;
};

export type RequirementFormData = {
  requirement_type: RequirementType;
  target_ref: TargetRef;
  required_course_id: string;
  required_status: RequiredStatus;
  priority: number;
  is_active: boolean;
};

// =============================================================================
// Graph View Types (for UI)
// =============================================================================

export type CourseNodeState = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export type CourseGraphNode = {
  id: string;
  course: LearningCourse;
  position: PathNodePosition;
  state: CourseNodeState;
  progress?: LearningUserProgress;
  prerequisitesMet: boolean;
};

export type CourseGraphEdge = {
  id: string;
  from: string;
  to: string;
  isUnlocked: boolean;
};

export type LearningGraph = {
  pathId: string;
  pathTitle: string;
  nodes: CourseGraphNode[];
  edges: CourseGraphEdge[];
};

// =============================================================================
// Quiz Runner Types
// =============================================================================

export type QuizState = {
  courseId: string;
  currentQuestionIndex: number;
  answers: Map<string, string[]>;
  startedAt: Date;
  isSubmitting: boolean;
};

export type QuizResult = {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  rewards?: CourseRewards;
  nextUnlockedCourses?: LearningCourse[];
};

// =============================================================================
// API Response Types
// =============================================================================

export type CourseWithProgress = LearningCourse & {
  progress: LearningUserProgress | null;
  isUnlocked: boolean;
};

export type PathWithGraph = LearningPath & {
  nodes: LearningPathNode[];
  edges: LearningPathEdge[];
  progress: Map<string, LearningUserProgress>;
};

export type RequirementCheckResult = {
  satisfied: boolean;
  unsatisfiedRequirements: Array<{
    requirement_id: string;
    course_id: string;
    course_title: string;
  }>;
};
