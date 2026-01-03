import { Badge } from '@/components/ui';

export type GamificationStatus = 'running' | 'partial' | 'missing';

const statusConfig: Record<GamificationStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  running: { label: '✅ Running', variant: 'success' },
  partial: { label: '⚠️ Partial', variant: 'warning' },
  missing: { label: '❌ Missing UI', variant: 'destructive' },
};

export function StatusBadge({ state }: { state: GamificationStatus }) {
  const config = statusConfig[state];
  return (
    <Badge variant={config.variant} size="sm">
      {config.label}
    </Badge>
  );
}
