/**
 * Learning Module Exports
 * 
 * This module provides course-based training with:
 * - Course content and quizzes
 * - Learning paths with prerequisites
 * - Reward integration (DiceCoin, XP, Achievements)
 * - Gating requirements for activities/games/roles
 */

// Hooks
export { useRequirementGate } from './useRequirementGate'
export type { 
  RequirementCheckResult, 
  GatingTarget, 
  UseRequirementGateOptions,
  UseRequirementGateResult 
} from './useRequirementGate'

// Types re-exported from types/learning.ts for convenience
export type {
  LearningCourse,
  LearningPath,
  LearningPathNode,
  LearningPathEdge,
  LearningUserProgress,
  LearningCourseAttempt,
  LearningRequirement,
  CourseStatus,
  CourseDifficulty,
  PathStatus,
  PathKind,
  ProgressStatus,
  RequirementType,
  CourseContentSection,
  QuizQuestion,
  QuizOption,
  CourseRewards,
  QuizAnswer,
  CourseFormData,
  PathFormData,
  RequirementFormData,
} from '@/types/learning'
