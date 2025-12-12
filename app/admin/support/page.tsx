import { redirect } from "next/navigation";

// Legacy support route: redirect to tickets to avoid duplication
export default function SupportRedirect() {
  redirect("/admin/tickets");
}
