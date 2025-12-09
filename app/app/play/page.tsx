import { redirect } from "next/navigation";

// The base /app/play route should not hang without a game id; redirect users to pick a game.
export default function PlayRoutePage() {
  redirect("/app/games?playNotice=select");
}
