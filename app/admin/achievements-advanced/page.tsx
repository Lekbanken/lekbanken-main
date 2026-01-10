import { redirect } from "next/navigation";

// Legacy route: redirect to the canonical achievements admin
export default function AchievementsAdvancedRedirect() {
  redirect("/admin/gamification/achievements");
}
