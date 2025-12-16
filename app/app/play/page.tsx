import { redirect } from "next/navigation";

// Redirect to sessions list - users manage their play sessions there
export default function PlayRoutePage() {
  redirect("/app/play/sessions");
}
