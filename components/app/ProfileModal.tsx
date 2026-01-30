"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

export function ProfileModal({
  open,
  onClose,
  displayName,
  avatarUrl,
  isAdmin = false,
}: ProfileModalProps) {
  const t = useTranslations();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-0 border-0">
          <DialogTitle className="sr-only">{t('app.nav.profile')}</DialogTitle>
        </DialogHeader>

        {/* Profile Header */}
        <div className="flex flex-col items-center px-5 pb-4 text-center">
          <Avatar
            src={avatarUrl || undefined}
            name={displayName}
            size="xl"
            className="h-20 w-20 ring-4 ring-primary/20"
          />
          <p className="mt-3 text-xs text-muted-foreground">{t('app.nav.loggedInAs')}</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{displayName}</h2>
          <DialogClose asChild>
            <Link
              href="/app/profile"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
              {t('app.nav.viewProfile')}
            </Link>
          </DialogClose>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border" />

        {/* Navigation Links */}
        <div className="grid gap-2 p-5">
          {isAdmin && (
            <DialogClose asChild>
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent/20"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                  <svg className="h-5 w-5 text-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="font-semibold">Admin</span>
                  <p className="text-xs text-muted-foreground">{t('app.nav.manageApp')}</p>
                </div>
              </Link>
            </DialogClose>
          )}
          <DialogClose asChild>
            <Link
              href="/app"
              className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="font-semibold">{t('app.nav.dashboard')}</span>
                <p className="text-xs text-muted-foreground">{t('app.nav.goToDashboard')}</p>
              </div>
            </Link>
          </DialogClose>
          <DialogClose asChild>
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3h18v18H3z" />
                  <path d="M21 12H3M12 3v18" />
                </svg>
              </div>
              <div className="flex-1">
                <span className="font-semibold">{t('app.nav.marketing')}</span>
                <p className="text-xs text-muted-foreground">{t('app.nav.visitWebsite')}</p>
              </div>
            </Link>
          </DialogClose>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-border" />

        {/* Sign Out Button */}
        <div className="p-5 pt-4">
          <form action="/auth/signout" method="POST">
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-center gap-2 rounded-xl border-destructive/30 py-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('app.nav.logout')}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
