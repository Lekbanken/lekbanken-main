import { type ReactNode } from 'react';
import { InformationCircleIcon, LightBulbIcon, ExclamationTriangleIcon } from '@heroicons/react/20/solid';

// =============================================================================
// Types
// =============================================================================

type HelpTextVariant = 'default' | 'info' | 'tip' | 'warning';

interface HelpTextProps {
  /** The help text content */
  children: ReactNode;
  /** Visual variant */
  variant?: HelpTextVariant;
  /** Additional class names */
  className?: string;
}

interface SectionIntroProps {
  /** Title of the section */
  title: string;
  /** Description text */
  description: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Additional class names */
  className?: string;
}

interface FeatureExplainerProps {
  /** Title of the feature */
  title: string;
  /** Description of what it does */
  description: string;
  /** Example usage (optional) */
  example?: string;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Variant styles
// =============================================================================

const variantStyles: Record<HelpTextVariant, { wrapper: string; icon: ReactNode }> = {
  default: {
    wrapper: 'text-muted-foreground',
    icon: null,
  },
  info: {
    wrapper: 'text-blue-600 dark:text-blue-400',
    icon: <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />,
  },
  tip: {
    wrapper: 'text-amber-600 dark:text-amber-400',
    icon: <LightBulbIcon className="h-4 w-4 flex-shrink-0" />,
  },
  warning: {
    wrapper: 'text-orange-600 dark:text-orange-400',
    icon: <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />,
  },
};

// =============================================================================
// HelpText Component
// =============================================================================

/**
 * Inline help text below form fields or sections.
 * 
 * @example
 * <Input label="Namn" />
 * <HelpText>Namnet visas för deltagarna i lobbyn.</HelpText>
 */
export function HelpText({
  children,
  variant = 'default',
  className = '',
}: HelpTextProps) {
  const { wrapper, icon } = variantStyles[variant];

  return (
    <p className={`text-xs mt-1 flex items-start gap-1.5 ${wrapper} ${className}`}>
      {icon}
      <span>{children}</span>
    </p>
  );
}

// =============================================================================
// SectionIntro Component
// =============================================================================

/**
 * Introduction text at the top of a section/tab to explain its purpose.
 * 
 * @example
 * <SectionIntro
 *   title="Faser"
 *   description="Faser delar upp spelet i tydliga akter."
 * />
 */
export function SectionIntro({
  title,
  description,
  icon,
  className = '',
}: SectionIntroProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

// =============================================================================
// FeatureExplainer Component
// =============================================================================

/**
 * Explains a feature in more detail, optionally with an example.
 * Good for complex features like triggers.
 * 
 * @example
 * <FeatureExplainer
 *   title="Triggers"
 *   description="Automatiska händelser som reagerar på vad som sker i spelet."
 *   example="När 5 minuter återstår → Visa en ledtråd"
 * />
 */
export function FeatureExplainer({
  title,
  description,
  example,
  className = '',
}: FeatureExplainerProps) {
  return (
    <div
      className={`p-3 rounded-lg bg-muted/50 border border-border ${className}`}
    >
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
      {example && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          Exempel: {example}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// EmptyStateGuide Component
// =============================================================================

interface EmptyStateGuideProps {
  /** What the empty list is for */
  itemName: string;
  /** What adding items enables */
  benefit: string;
  /** Action button text */
  actionText: string;
  /** Action handler */
  onAction?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Guides users when a list is empty, explaining what they can add.
 * 
 * @example
 * <EmptyStateGuide
 *   itemName="faser"
 *   benefit="att strukturera spelupplevelsen"
 *   actionText="Lägg till din första fas"
 *   onAction={handleAddPhase}
 * />
 */
export function EmptyStateGuide({
  itemName,
  benefit,
  actionText,
  onAction,
  className = '',
}: EmptyStateGuideProps) {
  return (
    <div
      className={`text-center py-8 px-4 border-2 border-dashed border-muted rounded-lg ${className}`}
    >
      <p className="text-sm text-muted-foreground mb-1">
        Du har inga {itemName} ännu.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Lägg till {itemName} för {benefit}.
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-medium text-primary hover:underline"
        >
          + {actionText}
        </button>
      )}
    </div>
  );
}
