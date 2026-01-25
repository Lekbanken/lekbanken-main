import Link from "next/link";
import { useTranslations } from "next-intl";
import { PlayIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

export function CallToActionSection() {
  const t = useTranslations("gamification");
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">✨</span>
        <h2 className="text-sm font-semibold text-foreground">{t("cta.keepEarning")}</h2>
      </div>

      {/* CTA Cards */}
      <div className="space-y-3">
        <Link
          href="/app/play"
          className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <PlayIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t("cta.continuePlaying")}</p>
            <p className="text-xs text-muted-foreground">{t("cta.continuePlayingDesc")}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            +25 XP
          </span>
        </Link>

        <Link
          href="/app/planner"
          className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <ClipboardDocumentListIcon className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t("cta.planSession")}</p>
            <p className="text-xs text-muted-foreground">{t("cta.planSessionDesc")}</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            +15 XP
          </span>
        </Link>
      </div>
    </section>
  );
}
