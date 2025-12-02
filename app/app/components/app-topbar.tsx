"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/supabase/auth";

export function AppTopbar() {
  const router = useRouter();
  const { user, userProfile, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const userEmail = user?.email || "";
  const userName = userProfile?.full_name || user?.user_metadata?.full_name || userEmail.split("@")[0];
  const userRole = user?.app_metadata?.role || user?.user_metadata?.role;
  const isAdmin = userRole === "admin";

  if (!mounted) {
    return (
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 rounded-xl bg-muted sm:h-9 sm:w-9" />
          <div className="hidden sm:block space-y-1">
            <div className="h-2 w-16 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-3 w-20 rounded bg-muted sm:hidden" />
        </div>
        <div className="h-8 w-20 rounded-full bg-muted" />
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Image
          src="/lekbanken-icon.png"
          alt="Lekbanken ikon"
          width={36}
          height={36}
          className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
        />
        <div className="hidden sm:block">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">App</p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Lekbanken</h1>
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:hidden">Lekbanken</h1>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && (
          <Badge
            variant="accent"
            size="sm"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => router.push("/admin")}
          >
            Admin
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-full p-0.5 ring-2 ring-border/50 transition-all hover:ring-primary/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <Avatar name={userName} size="sm" />
              <svg className="mr-1 h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Inloggad som</DropdownMenuLabel>
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/profile")} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" />
              </svg>
              Min profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/app/preferences")} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07-1.41 1.41M8.34 15.66l-1.41 1.41m10.14 0-1.41-1.41M8.34 8.34 6.93 6.93" />
              </svg>
              Inställningar
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin")} className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3 4 7v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4Z" />
                  </svg>
                  Admin Dashboard
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={handleSignOut} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
