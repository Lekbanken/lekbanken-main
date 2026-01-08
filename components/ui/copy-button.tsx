'use client';

import { useCallback } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string;
  /** Optional label to display next to the icon */
  label?: string;
  /** Optional title for the button (tooltip) */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show success feedback */
  showFeedback?: boolean;
}

/**
 * CopyButton - A button that copies text to clipboard
 * 
 * @example
 * <CopyButton text="prod_ABC123" label="Kopiera" />
 * <CopyButton text={productId} title="Kopiera produkt-ID" />
 */
export function CopyButton({
  text,
  label,
  title,
  className,
  size = 'sm',
  showFeedback = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      if (showFeedback) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text, showFeedback]);

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors',
        textSize,
        className
      )}
      title={title || `Kopiera ${label || text}`}
      type="button"
    >
      {copied ? (
        <CheckIcon className={cn(iconSize, 'text-green-500')} />
      ) : (
        <ClipboardDocumentIcon className={iconSize} />
      )}
      {label && <span>{copied ? 'Kopierat!' : label}</span>}
    </button>
  );
}
