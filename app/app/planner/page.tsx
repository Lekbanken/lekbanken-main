import { redirect } from "next/navigation";

/**
 * Planner Root Page (/app/planner)
 *
 * Redirects to the plan library.
 */
export default function PlannerRootPage() {
  redirect("/app/planner/plans");
}
