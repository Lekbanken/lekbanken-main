'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type HTMLAttributes,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

// =============================================================================
// Context
// =============================================================================

interface CollapsibleContextValue {
  isOpen: boolean;
  toggle: () => void;
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null);

function useCollapsible() {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible');
  }
  return context;
}

// =============================================================================
// Collapsible Root
// =============================================================================

interface CollapsibleProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Collapsible({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const toggle = () => {
    const newState = !isOpen;
    if (!isControlled) {
      setUncontrolledOpen(newState);
    }
    onOpenChange?.(newState);
  };

  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

// =============================================================================
// Collapsible Trigger
// =============================================================================

interface CollapsibleTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, className, asChild: _asChild, onClick, ...props }, ref) => {
    const { isOpen, toggle } = useCollapsible();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      toggle();
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={isOpen}
        onClick={handleClick}
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        {children}
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
    );
  }
);

CollapsibleTrigger.displayName = 'CollapsibleTrigger';

// =============================================================================
// Collapsible Content
// =============================================================================

interface CollapsibleContentProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: boolean;
}

export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, forceMount, ...props }, ref) => {
    const { isOpen } = useCollapsible();

    if (!forceMount && !isOpen) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'animate-in fade-in-0' : 'animate-out fade-out-0',
          className
        )}
        hidden={!isOpen}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CollapsibleContent.displayName = 'CollapsibleContent';
