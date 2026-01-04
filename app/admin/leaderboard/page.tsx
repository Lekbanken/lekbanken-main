import { redirect } from "next/navigation";

export default function LeaderboardRedirectPage() {
  redirect("/admin/gamification/dicecoin-xp?tab=leaderboards");
}
