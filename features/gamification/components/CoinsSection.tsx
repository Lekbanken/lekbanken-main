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

        {/* Gold halo glow */}
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 w-24 h-24 rounded-full coins-halo pointer-events-none"
          style={{
            background: "radial-gradient(circle, #f5a62325 0%, #f5a62310 40%, transparent 70%)",
          }}
        />

        {/* Floating mini coins */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {[
            { left: "15%", top: "20%", size: 14, delay: 0 },
            { left: "78%", top: "30%", size: 12, delay: 0.8 },
            { left: "60%", top: "12%", size: 10, delay: 1.6 },
          ].map((c, i) => (
            <Image
              key={i}
              src="/icons/journey/dicecoin_webp.webp"
              alt=""
              width={c.size}
              height={c.size}
              className={`absolute coins-float-${i} opacity-40`}
              style={{ left: c.left, top: c.top, animationDelay: `${c.delay}s` }}
            />
          ))}
        </div>

        <Image src="/icons/journey/dicecoin_webp.webp" alt="DiceCoin" width={48} height={48} className="relative mx-auto mb-1 coins-bounce" />
        <p className="relative text-3xl font-bold text-white tabular-nums">
          {animatedBalance.toLocaleString()}
        </p>
        <p className="relative text-sm text-white/50">DiceCoin</p>

        <style jsx>{`
          @keyframes coins-halo {
            0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.7; }
            50% { transform: translateX(-50%) scale(1.1); opacity: 1; }
          }
          @keyframes coins-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes coins-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          .coins-halo { animation: coins-halo 3s ease-in-out infinite; }
          .coins-float-0 { animation: coins-float 3.5s ease-in-out infinite; }
          .coins-float-1 { animation: coins-float 4s ease-in-out infinite; }
          .coins-float-2 { animation: coins-float 4.5s ease-in-out infinite; }
          .coins-bounce { animation: coins-bounce 2.5s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .coins-halo, .coins-float-0, .coins-float-1, .coins-float-2, .coins-bounce {
              animation: none !important;
            }
          }
        `}</style>
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
