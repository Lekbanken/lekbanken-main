import Link from 'next/link';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CoinBalance } from '../../components/previews/CoinBalance';
import { CoinsSection } from '@/features/gamification/components/CoinsSection';
import { mockCoins } from '../mock-data';
import { StatusBadge } from '../status';

export default function DiceCoinSandboxPage() {
  return (
    <SandboxShell
      moduleId="gamification-dicecoin"
      title="DiceCoin & Coins"
      description="Balance, ledger, awards, and coin transactions."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>DiceCoin is the in-app currency used for rewards, shop items, and progression.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Balance + recent transactions</li>
                <li>Manual awards and approvals</li>
                <li>Ledger via RPC + API endpoints</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Tables: user_coins, coin_transactions</li>
                <li>RPC: apply_coin_transaction_v1</li>
                <li>API: /api/gamification/coins/transaction</li>
                <li>Admin API: /api/admin/gamification/awards</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open /app/gamification to see the coin summary.</li>
                <li>Check /app/profile/coins for ledger history.</li>
                <li>Use /admin/gamification/awards to award coins.</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge state="running" />
            <span>Coin UI is implemented; production flows require auth + tenant context.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <Badge variant="outline" size="sm">
              Mock data
            </Badge>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Coin balance variants</CardTitle>
              </CardHeader>
              <CardContent>
                <CoinBalance />
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Coins section (app)</CardTitle>
              </CardHeader>
              <CardContent>
                <CoinsSection summary={mockCoins} />
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Related routes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/app/profile/coins">
              /app/profile/coins
            </Link>
            <Link className="text-primary hover:underline" href="/app/gamification">
              /app/gamification
            </Link>
            <Link className="text-primary hover:underline" href="/admin/gamification/awards">
              /admin/gamification/awards
            </Link>
            <Link className="text-primary hover:underline" href="/admin/gamification/analytics">
              /admin/gamification/analytics
            </Link>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
