import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { CoinsSummary } from "../types";

type CoinsSectionProps = {
  summary: CoinsSummary;
};

export function CoinsSection({ summary }: CoinsSectionProps) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🪙</span>
        <h2 className="text-sm font-semibold text-foreground">Mynt</h2>
      </div>

      {/* Balance Card with Shimmer */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-6 text-center">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-[shimmer_3s_infinite] -translate-x-full" />
        
        <span className="text-4xl mb-1 block">🪙</span>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {summary.balance.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">mynt</p>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          Senaste transaktioner
        </p>
        
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          {summary.recentTransactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Ingen aktivitet ännu. Spela för att tjäna mynt!
            </div>
          ) : (
            summary.recentTransactions.slice(0, 3).map((tx, index) => {
              const isEarn = tx.type === "earn";
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index < summary.recentTransactions.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <span
                    className={`w-12 text-sm font-bold tabular-nums ${
                      isEarn ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {isEarn ? "+" : "-"}{tx.amount}
                  </span>
                  <p className="flex-1 text-sm text-foreground truncate">
                    {tx.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {tx.date}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {summary.recentTransactions.length > 3 && (
          <Link
            href="/app/profile/coins"
            className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Se transaktionshistorik
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
