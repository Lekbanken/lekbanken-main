/**
 * Achievement types re-exported for UI consumption.
 *
 * UI components (components/, features/) are forbidden from importing
 * @/lib/services/* directly (no-restricted-imports). Import these types
 * from here instead.
 */
export type {
  Achievement,
  AchievementProgress,
  UserAchievement,
} from '@/lib/services/achievementService';
