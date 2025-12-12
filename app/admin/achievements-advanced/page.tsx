import { redirect } from "next/navigation";

// Legacy route: redirect to the consolidated Achievements admin
export default function AchievementsAdvancedRedirect() {
  redirect("/admin/achievements");
}
