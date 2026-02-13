import Image from "next/image";
import { useTranslations } from "next-intl";
import type { CoinsSummary } from "../types";
import { useCountUp } from "../hooks/useCountUp";

type CoinsSectionProps = {
  summary: CoinsSummary;
};

export function CoinsSection({ summary }: CoinsSectionProps) {
  const t = useTranslations("gamification");
  const animatedBalance = useCountUp(summary.balance);
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Image src="/icons/journey/dicecoin_webp.webp" alt="" width={22} height={22} />
        <h2 className="text-sm font-semibold text-white">{t("coins")}</h2>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_infinite] -translate-x-full" />

        <Image src="/icons/journey/dicecoin_webp.webp" alt="DiceCoin" width={48} height={48} className="mx-auto mb-1" />
        <p className="text-3xl font-bold text-white tabular-nums">
          {animatedBalance.toLocaleString()}
        </p>
        <p className="text-sm text-white/50">DiceCoin</p>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40 px-1">
          Senaste transaktioner
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
          {summary.recentTransactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-white/50">
              {t("noCoinsActivityYet")}
            </div>
          ) : (
            summary.recentTransactions.slice(0, 3).map((tx, index) => {
              const isEarn = tx.type === "earn";
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < summary.recentTransactions.length - 1 ? "border-b border-white/10" : ""
                  }`}
                >
                  <span
                    className={`w-12 text-sm font-bold tabular-nums ${
                      isEarn ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {isEarn ? "+" : "-"}{tx.amount}
                  </span>
                  <p className="flex-1 text-sm text-white/80 truncate">
                    {tx.description}
                  </p>
                  <span className="text-xs text-white/40">
                    {tx.date}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
