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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/icons/journey/dicecoin_webp.webp" alt="" width={22} height={22} />
          <h2 className="text-sm font-semibold text-white">{t("coins")}</h2>
        </div>
        <span className="text-xs text-white/40">Valuta</span>
      </div>

      {/* Unified Vault Card — balance + transactions in one container */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-sm"
        style={{
          background: "linear-gradient(135deg, var(--journey-accent, #8661ff)14 0%, var(--journey-accent, #8661ff)06 50%, var(--journey-accent, #8661ff)08 100%)",
          border: "1px solid var(--journey-accent, #8661ff)25",
          boxShadow: "0 0 40px var(--journey-accent, #8661ff)10",
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_infinite] -translate-x-full" />

        {/* Gold halo glow */}
        <div
          className="absolute left-1/2 top-6 -translate-x-1/2 w-28 h-28 rounded-full coins-halo pointer-events-none"
          style={{
            background: "radial-gradient(circle, #f5a62325 0%, #f5a62310 40%, transparent 70%)",
          }}
        />

        {/* Floating mini coins */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {[
            { left: "10%", top: "15%", size: 14, delay: 0 },
            { left: "82%", top: "22%", size: 12, delay: 0.8 },
            { left: "65%", top: "8%", size: 10, delay: 1.6 },
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

        {/* Center: coin illustration + balance */}
        <div className="relative z-10 flex flex-col items-center">
          <Image src="/icons/journey/dicecoin_webp.webp" alt="DiceCoin" width={80} height={80} className="coins-bounce mb-2 drop-shadow-[0_0_20px_rgba(245,166,35,0.3)]" />
          <p className="text-3xl font-black text-white tabular-nums tracking-tight">
            {animatedBalance.toLocaleString("sv-SE")}
          </p>
          <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[#f5a623]">DiceCoin</p>
        </div>

        {/* Recent transactions — inside the same card */}
        {summary.recentTransactions.length > 0 && (
          <div className="relative z-10 mt-5 space-y-2">
            {summary.recentTransactions.slice(0, 3).map((tx) => {
              const isEarn = tx.type === "earn";
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        backgroundColor: isEarn ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: isEarn ? "#22c55e" : "#ef4444",
                      }}
                    >
                      {isEarn ? "↑" : "↓"}
                    </div>
                    <span className="text-[11px] text-white/80 truncate max-w-[160px]">
                      {tx.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        isEarn ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isEarn ? "+" : "-"}{tx.amount}
                    </span>
                    <span className="text-[9px] text-white/30">{tx.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {summary.recentTransactions.length === 0 && (
          <p className="relative z-10 mt-4 text-center text-xs text-white/40">
            {t("noCoinsActivityYet")}
          </p>
        )}

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
    </section>
  );
}
