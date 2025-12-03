'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/ui';
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

// Types
interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  description: string;
  date: string;
  category: string;
}

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'earn',
    amount: 50,
    description: 'Genomförde daglig utmaning',
    date: '2025-01-27',
    category: 'challenge',
  },
  {
    id: '2',
    type: 'earn',
    amount: 25,
    description: 'Spelade "Bollkull"',
    date: '2025-01-27',
    category: 'game',
  },
  {
    id: '3',
    type: 'spend',
    amount: 200,
    description: 'Köpte XP-boost',
    date: '2025-01-26',
    category: 'shop',
  },
  {
    id: '4',
    type: 'earn',
    amount: 100,
    description: 'Ny achievement: Samarbetare',
    date: '2025-01-26',
    category: 'achievement',
  },
  {
    id: '5',
    type: 'earn',
    amount: 10,
    description: 'Daglig inloggningsbonus',
    date: '2025-01-25',
    category: 'bonus',
  },
  {
    id: '6',
    type: 'spend',
    amount: 150,
    description: 'Köpte Regnbågs-emoji',
    date: '2025-01-24',
    category: 'shop',
  },
  {
    id: '7',
    type: 'earn',
    amount: 75,
    description: 'Veckoutmaning klar',
    date: '2025-01-23',
    category: 'challenge',
  },
];

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  });
}

export default function CoinsHistoryPage() {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'earn') return tx.type === 'earn';
    if (filter === 'spend') return tx.type === 'spend';
    return true;
  });

  const totalEarned = transactions
    .filter((tx) => tx.type === 'earn')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalSpent = transactions
    .filter((tx) => tx.type === 'spend')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const balance = totalEarned - totalSpent;

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
            Mynthistorik
          </h1>
        </div>
      </header>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
        <CardContent className="p-6 text-center">
          <span className="text-4xl mb-2 block">🪙</span>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {balance.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground">mynt totalt</p>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <div className="flex items-center justify-center gap-1 text-emerald-600">
                <ArrowUpIcon className="h-4 w-4" />
                <span className="text-lg font-bold tabular-nums">
                  +{totalEarned.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Tjänat</p>
            </div>
            <div className="rounded-xl bg-rose-500/10 p-3">
              <div className="flex items-center justify-center gap-1 text-rose-500">
                <ArrowDownIcon className="h-4 w-4" />
                <span className="text-lg font-bold tabular-nums">
                  -{totalSpent.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Spenderat</p>
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
          Alla
        </Button>
        <Button
          variant={filter === 'earn' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('earn')}
        >
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          Tjänat
        </Button>
        <Button
          variant={filter === 'spend' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('spend')}
        >
          <ArrowDownIcon className="h-4 w-4 mr-1" />
          Spenderat
        </Button>
      </div>

      {/* Transaction List */}
      <Card>
        <CardContent className="divide-y divide-border">
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Inga transaktioner att visa.
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
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {formatDate(tx.date)}
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
          Spendera dina mynt i butiken
        </Button>
      </Link>
    </div>
  );
}
