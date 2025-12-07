"use client"

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/navigation/LanguageSwitcher";
import { ProfileMenu } from "@/components/navigation/ProfileMenu";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/supabase/auth";

export function AppTopbar() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const userRole = user?.app_metadata?.role || user?.user_metadata?.role || userProfile?.role;
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  if (!mounted) {
    return (
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 rounded-xl bg-muted sm:h-9 sm:w-9" />
          <div className="hidden space-y-1 sm:block">
            <div className="h-2 w-16 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-3 w-20 rounded bg-muted sm:hidden" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 rounded-full bg-muted" />
          <div className="h-9 w-9 rounded-full bg-muted" />
        </div>
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
        <LanguageSwitcher />
        <ThemeToggle />
        <ProfileMenu context="app" />
      </div>
    </header>
  );
}
