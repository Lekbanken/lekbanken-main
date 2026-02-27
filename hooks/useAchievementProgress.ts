/**
 * Thin re-export of getUserAchievementProgress for UI consumption.
 *
 * UI components (components/, features/) are forbidden from importing
 * @/lib/services/* directly (no-restricted-imports). Import the function
 * from here instead.
 */
export { getUserAchievementProgress } from '@/lib/services/achievementService';
