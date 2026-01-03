import Link from 'next/link';
import { ShoppingBagIcon, SparklesIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { StatusBadge } from '../status';

export default function RewardsSandboxPage() {
  return (
    <SandboxShell
      moduleId="gamification-rewards"
      title="Rewards & Shop"
      description="Shop items, unlockables, and reward surfaces."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Reward surfaces include shop items, unlockables, and bundles.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>App shop for player purchases</li>
                <li>Admin marketplace management</li>
                <li>Coins spend and ownership state</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>API: /api/shop, /api/shop/powerups/consume</li>
                <li>Admin API: /api/admin/marketplace/items</li>
                <li>Tables: shop_items, shop_purchases</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open /app/shop and buy a sample item.</li>
                <li>Check /admin/marketplace for item management.</li>
                <li>Verify balance changes in /app/profile/coins.</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge state="partial" />
            <span>Shop UI exists; inventory and purchases rely on API + DB.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Preview</h2>
            <Badge variant="outline" size="sm">
              UI sketch
            </Badge>
          </div>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Shop item card</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShoppingBagIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning" size="sm">
                      Featured
                    </Badge>
                    <Badge variant="accent" size="sm">
                      Shop
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold text-foreground">Starter Bundle</div>
                  <div className="text-xs text-muted-foreground">
                    Includes avatar frame, theme, and a powerup.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">60</span>
                  <Button size="sm" className="gap-2">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    Buy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="text-sm text-muted-foreground">
            For the full shop layout preview, open{' '}
            <Link className="text-primary hover:underline" href="/sandbox/app/shop">
              /sandbox/app/shop
            </Link>
            .
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Related routes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/app/shop">
              /app/shop
            </Link>
            <Link className="text-primary hover:underline" href="/admin/marketplace">
              /admin/marketplace
            </Link>
            <Link className="text-primary hover:underline" href="/api/shop">
              /api/shop
            </Link>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
