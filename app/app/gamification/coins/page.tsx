'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent } from '@/components/ui';
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

type Transaction = {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  date: string;
};

type CoinsPayload = {
  coins: {
    balance: number;
    recentTransactions: Transaction[];
  };
};

export default function CoinsHistoryPage() {
  const t = useTranslations('app.profile');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/gamification', { cache: 'no-store' });
        if (!res.ok) throw new Error(t('sections.coins.error'));
        const payload = (await res.json()) as CoinsPayload;
        if (!isMounted) return;
        setTransactions(payload.coins?.recentTransactions ?? []);
        setBalance(payload.coins?.balance ?? 0);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : t('sections.coins.error'));
        setTransactions([]);
        setBalance(0);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [t]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'earn') return transactions.filter((tx) => tx.type === 'earn');
    if (filter === 'spend') return transactions.filter((tx) => tx.type === 'spend');
    return transactions;
  }, [filter, transactions]);

  const totalEarned = transactions
    .filter((tx) => tx.type === 'earn')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSpent = transactions
    .filter((tx) => tx.type === 'spend')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/app/gamification"
          className="rounded-full p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-foreground" />
        </Link>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Gamification
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t('sections.coins.title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('sections.coins.subtitle')}</p>
        </div>
      </header>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardContent className="p-6 text-center">
          <span className="text-4xl mb-2 block">🪙</span>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {balance.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">{t('sections.coins.totalBalance')}</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <div className="flex items-center justify-center gap-1 text-emerald-600">
                <ArrowUpIcon className="h-4 w-4" />
                <span className="text-lg font-bold tabular-nums">
                  +{totalEarned.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('sections.coins.earnedRecent')}</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-3">
              <div className="flex items-center justify-center gap-1 text-rose-500">
                <ArrowDownIcon className="h-4 w-4" />
                <span className="text-lg font-bold tabular-nums">
                  -{totalSpent.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{t('sections.coins.spentRecent')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('sections.coins.filters.all')}
        </Button>
        <Button
          variant={filter === 'earn' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('earn')}
        >
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          {t('sections.coins.filters.earn')}
        </Button>
        <Button
          variant={filter === 'spend' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('spend')}
        >
          <ArrowDownIcon className="h-4 w-4 mr-1" />
          {t('sections.coins.filters.spend')}
        </Button>
      </div>

      {/* Transaction List */}
      <Card>
        <CardContent className="divide-y divide-border">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{t('sections.coins.loading')}</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('sections.coins.noTransactions')}
            </div>
          ) : (
            filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 py-4 first:pt-6 last:pb-6"
              >
                <div
                  className={`rounded-full p-2 ${
                    tx.type === 'earn'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {tx.type === 'earn' ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {tx.description || t('sections.coins.unknownTransaction')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {tx.date}
                  </p>
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    tx.type === 'earn' ? 'text-emerald-600' : 'text-rose-500'
                  }`}
                >
                  {tx.type === 'earn' ? '+' : '-'}
                  {tx.amount}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Link to Shop */}
      <Link href="/app/shop">
        <Button variant="outline" className="w-full">
          {t('sections.coins.shopLink')}
        </Button>
      </Link>
    </div>
  );
}
