import { redirect } from "next/navigation";

export default function LevelsRedirectPage() {
  redirect("/admin/gamification/dicecoin-xp?tab=levels");
}
