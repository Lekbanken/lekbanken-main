import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/supabase/auth";

export function LogoutButton() {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-destructive/20 bg-destructive/5 px-4 py-4 text-sm font-medium text-destructive transition-all hover:border-destructive/30 hover:bg-destructive/10 active:scale-[0.98]"
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5" />
      Logga ut
    </button>
  );
}
