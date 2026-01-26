/**
 * DomainTabs Component
 *
 * Tab bar for filtering inventory by domain.
 * Shows counts per domain with color-coded badges.
 */

import type { InventoryDomain } from '../lib/inventory-types';
import type { DomainCount } from '../hooks/useInventoryLegacy';

interface DomainTabsProps {
  domainCounts: DomainCount[];
  selectedDomain: InventoryDomain | null;
  onSelectDomain: (domain: InventoryDomain | null) => void;
  totalNodes: number;
}

// Domain configuration with colors and icons
const DOMAIN_CONFIG: Record<InventoryDomain, { emoji: string; color: string; bgColor: string }> = {
  admin: { emoji: '🔧', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  app: { emoji: '📱', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  marketing: { emoji: '🏠', color: 'text-green-600', bgColor: 'bg-green-100' },
  sandbox: { emoji: '🧪', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  demo: { emoji: '🎮', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  shared: { emoji: '🔗', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  db: { emoji: '🗄️', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
};

export function DomainTabs({
  domainCounts,
  selectedDomain,
  onSelectDomain,
  totalNodes,
}: DomainTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* All domains tab */}
      <button
        type="button"
        onClick={() => onSelectDomain(null)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          selectedDomain === null
            ? 'bg-foreground text-background'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        <span>All</span>
        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
          {totalNodes}
        </span>
      </button>

      {/* Domain-specific tabs */}
      {domainCounts.map(({ domain, count }) => {
        const config = DOMAIN_CONFIG[domain] || {
          emoji: '📦',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
        const isSelected = selectedDomain === domain;

        return (
          <button
            key={domain}
            type="button"
            onClick={() => onSelectDomain(domain)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isSelected
                ? `${config.bgColor} ${config.color}`
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span>{config.emoji}</span>
            <span className="capitalize">{domain}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                isSelected ? 'bg-background/30' : 'bg-background/50'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
