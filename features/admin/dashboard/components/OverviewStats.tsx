import type { OverviewMetric } from "../types";
import { MetricCard } from "./MetricCard";

type OverviewStatsProps = {
  metrics: OverviewMetric[];
};

export function OverviewStats({ metrics }: OverviewStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.id}
          label={metric.label}
          value={String(metric.value)}
          change={metric.change}
          trend={metric.trend}
          iconGradient={metric.iconGradient}
          icon={metric.icon}
        />
      ))}
    </div>
  );
}
