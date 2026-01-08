'use client';

import { cn } from '@/lib/utils';
import { CopyButton } from '@/components/ui/copy-button';

// =============================================================================
// FIELD LABEL
// =============================================================================

interface FieldLabelProps {
  /** Main label text */
  label: string;
  /** Technical field name (shown in parentheses) */
  fieldName?: string;
  /** Description shown below label */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * FieldLabel - Consistent label component for form fields
 * 
 * @example
 * <FieldLabel 
 *   label="Enhetsetikett" 
 *   fieldName="unit_label" 
 *   description="Visas på faktura" 
 * />
 */
export function FieldLabel({ 
  label, 
  fieldName, 
  description, 
  required,
  className 
}: FieldLabelProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium">
        {label}
        {fieldName && (
          <span className="text-muted-foreground font-normal ml-1">
            ({fieldName})
          </span>
        )}
        {required && (
          <span className="text-destructive ml-1">*</span>
        )}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// =============================================================================
// READ-ONLY FIELD
// =============================================================================

interface ReadOnlyFieldProps {
  /** Label for the field */
  label: string;
  /** The value to display */
  value: string | null | undefined;
  /** Whether to show copy button */
  copyable?: boolean;
  /** Placeholder when value is empty */
  placeholder?: string;
  /** Additional className */
  className?: string;
  /** Use monospace font */
  mono?: boolean;
}

/**
 * ReadOnlyField - Display a read-only value with optional copy button
 * 
 * @example
 * <ReadOnlyField label="Product ID" value={productId} copyable mono />
 * <ReadOnlyField label="Skapad" value={formatDate(createdAt)} />
 */
export function ReadOnlyField({ 
  label, 
  value, 
  copyable = false, 
  placeholder = '—',
  className,
  mono = false,
}: ReadOnlyFieldProps) {
  const displayValue = value || placeholder;
  const hasValue = !!value;

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span 
          className={cn(
            'text-sm',
            mono && 'font-mono',
            !hasValue && 'text-muted-foreground italic'
          )}
        >
          {displayValue}
        </span>
        {copyable && hasValue && (
          <CopyButton text={value!} size="sm" />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// FIELD GROUP
// =============================================================================

interface FieldGroupProps {
  /** Title for the group */
  title?: string;
  /** Description for the group */
  description?: string;
  /** Children fields */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Number of columns (1, 2, or 3) */
  columns?: 1 | 2 | 3;
}

/**
 * FieldGroup - Group related fields together
 * 
 * @example
 * <FieldGroup title="Stripe-inställningar" columns={2}>
 *   <FieldLabel ... />
 *   <input ... />
 * </FieldGroup>
 */
export function FieldGroup({ 
  title, 
  description, 
  children, 
  className,
  columns = 1,
}: FieldGroupProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-semibold">{title}</h4>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn('grid gap-4', gridClass)}>
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// INFO BOX
// =============================================================================

interface InfoBoxProps {
  /** Variant determines styling */
  variant?: 'info' | 'warning' | 'error' | 'success';
  /** Title (optional) */
  title?: string;
  /** Content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

const INFO_BOX_STYLES = {
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
};

const INFO_BOX_ICONS = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  success: '✅',
};

/**
 * InfoBox - Display contextual information
 * 
 * @example
 * <InfoBox variant="warning" title="Varning">
 *   Denna ändring påverkar fakturering.
 * </InfoBox>
 */
export function InfoBox({ 
  variant = 'info', 
  title, 
  children, 
  className 
}: InfoBoxProps) {
  return (
    <div 
      className={cn(
        'p-3 rounded-lg border text-sm',
        INFO_BOX_STYLES[variant],
        className
      )}
    >
      <div className="flex gap-2">
        <span>{INFO_BOX_ICONS[variant]}</span>
        <div className="flex-1">
          {title && <p className="font-medium mb-1">{title}</p>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}
