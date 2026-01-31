import { redirect } from 'next/navigation';

/**
 * Achievements page har flyttats till gamification hub.
 * Denna sida redirectar för bakåtkompatibilitet.
 * 
 * @see /app/gamification för achievements-översikt
 */
export default function AchievementsPage() {
  redirect('/app/gamification');
}

