"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PlayIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export function CallToActionSection() {
  const t = useTranslations("gamification");
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Image src="/icons/journey/dicecoin_webp.webp" alt="" width={20} height={20} />
        <h2 className="text-sm font-semibold text-white">{t("cta.keepEarning")}</h2>
      </div>

      {/* CTA Cards */}
      <div className="space-y-3">
        <Link
          href="/app/play"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--journey-accent)]/20">
            <PlayIcon className="h-5 w-5 text-[var(--journey-accent)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{t("cta.continuePlaying")}</p>
            <p className="text-xs text-white/50">{t("cta.continuePlayingDesc")}</p>
          </div>
        </Link>

        <Link
          href="/app/planner"
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--journey-accent,#8661ff)]/60"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <ClipboardDocumentListIcon className="h-5 w-5 text-white/70" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{t("cta.planSession")}</p>
            <p className="text-xs text-white/50">{t("cta.planSessionDesc")}</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
