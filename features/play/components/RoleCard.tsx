/**
 * RoleCard Component
 * 
 * Displays a participant's assigned role with identity, instructions, and hints.
 * Supports different views: compact (icon only), summary, and full.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  EyeIcon,
  EyeSlashIcon,
  LightBulbIcon,
  UserCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// Types
// =============================================================================

export interface RoleCardData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  public_description: string | null;
  private_instructions: string;
  private_hints: string | null;
}

export interface RoleCardProps {
  /** Role data */
  role: RoleCardData;
  /** Display variant */
  variant?: 'compact' | 'summary' | 'full';
  /** Whether to show private info (instructions/hints) */
  showPrivate?: boolean;
  /** Whether hints are revealed */
  hintsRevealed?: boolean;
  /** Called when user requests to reveal hints */
  onRevealHints?: () => void;
  /** Called when user requests a hint from the host */
  onRequestHint?: () => void;
  /** Whether the card is interactive */
  interactive?: boolean;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// Helper: Get color classes from role color
// =============================================================================

function getRoleColorClasses(color: string | null): {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
} {
  // Map role colors to Tailwind classes
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconBg: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconBg: 'bg-yellow-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', iconBg: 'bg-green-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconBg: 'bg-blue-100' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', iconBg: 'bg-pink-100' },
  };
  
  return colorMap[color || ''] || {
    bg: 'bg-muted/50',
    border: 'border-border',
    text: 'text-foreground',
    iconBg: 'bg-muted',
  };
}

// =============================================================================
// Component
// =============================================================================

export function RoleCard({
  role,
  variant = 'full',
  showPrivate = true,
  hintsRevealed = false,
  onRevealHints,
  onRequestHint,
  interactive = true,
  className = '',
}: RoleCardProps) {
  const t = useTranslations('play.roleCard');
  const [showInstructions, setShowInstructions] = useState(true);
  const [localHintsRevealed, setLocalHintsRevealed] = useState(hintsRevealed);
  
  const colors = getRoleColorClasses(role.color);
  const hasHints = !!role.private_hints;
  const hintsVisible = hintsRevealed || localHintsRevealed;
  
  const handleRevealHints = () => {
    setLocalHintsRevealed(true);
    onRevealHints?.();
  };

  // ==========================================================================
  // Compact variant (icon + name only)
  // ==========================================================================
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${colors.bg} ${colors.border} border ${className}`}>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${colors.iconBg}`}>
          {role.icon ? (
            <span className="text-sm">{role.icon}</span>
          ) : (
            <UserCircleIcon className={`h-4 w-4 ${colors.text}`} />
          )}
        </span>
        <span className={`text-sm font-medium ${colors.text}`}>{role.name}</span>
      </div>
    );
  }

  // ==========================================================================
  // Summary variant (name + description, no instructions)
  // ==========================================================================
  if (variant === 'summary') {
    return (
      <Card className={`overflow-hidden ${colors.border} border-2 ${className}`}>
        <div className={`p-4 ${colors.bg}`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg}`}>
              {role.icon ? (
                <span className="text-xl">{role.icon}</span>
              ) : (
                <UserCircleIcon className={`h-6 w-6 ${colors.text}`} />
              )}
            </span>
            <div>
              <h3 className={`font-semibold ${colors.text}`}>{role.name}</h3>
              {role.public_description && (
                <p className="text-sm text-muted-foreground">{role.public_description}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // ==========================================================================
  // Full variant (everything)
  // ==========================================================================
  return (
    <Card className={`overflow-hidden ${colors.border} border-2 ${className}`}>
      {/* Header */}
      <div className={`p-4 ${colors.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.iconBg} shadow-sm`}>
              {role.icon ? (
                <span className="text-2xl">{role.icon}</span>
              ) : (
                <UserCircleIcon className={`h-7 w-7 ${colors.text}`} />
              )}
            </span>
            <div>
              <Badge variant="default" className={`mb-1 ${colors.bg} ${colors.text} border ${colors.border}`}>
                Din roll
              </Badge>
              <h2 className={`text-xl font-bold ${colors.text}`}>{role.name}</h2>
            </div>
          </div>
          
          {/* Toggle instructions visibility */}
          {showPrivate && interactive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="shrink-0"
            >
              {showInstructions ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
        
        {/* Public description */}
        {role.public_description && (
          <p className="mt-3 text-sm text-muted-foreground">{role.public_description}</p>
        )}
      </div>
      
      {/* Private Instructions */}
      {showPrivate && showInstructions && (
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Dina instruktioner
            </h3>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {role.private_instructions}
            </p>
          </div>
        </div>
      )}
      
      {/* Hints Section */}
      {showPrivate && hasHints && (
        <div className="border-t border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <LightBulbIcon className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tips
            </h3>
          </div>
          
          {hintsVisible ? (
            <div className="rounded-xl bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {role.private_hints}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevealHints}
                disabled={!interactive}
                className="w-full gap-2"
              >
                <LightBulbIcon className="h-4 w-4" />
                {t('showHints')}
              </Button>

              {onRequestHint && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRequestHint}
                  disabled={!interactive}
                  className="w-full"
                >
                  {t('requestHint')}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
