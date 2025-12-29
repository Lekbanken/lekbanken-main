'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type ReactElement,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  isValidElement,
  cloneElement,
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

interface CollapsibleTriggerProps extends HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export const CollapsibleTrigger = forwardRef<HTMLElement, CollapsibleTriggerProps>(
  ({ children, className, asChild = false, onClick, onKeyDown, ...props }, ref) => {
    const { isOpen, toggle } = useCollapsible();

    type ChildProps = {
      className?: string;
      onClick?: (event: MouseEvent<HTMLElement>) => void;
      onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
      role?: string;
      tabIndex?: number;
      type?: string;
      'aria-expanded'?: boolean;
    };

    const handleClick = (e: MouseEvent<HTMLElement>) => {
      toggle();
      onClick?.(e);
    };

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<ChildProps>;
      const childProps = child.props;
      const isButtonElement = typeof children.type === 'string' && children.type === 'button';

      const handleChildClick = (event: MouseEvent<HTMLElement>) => {
        toggle();
        childProps.onClick?.(event);
        onClick?.(event);
      };

      const handleChildKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (!isButtonElement && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          toggle();
        }
        childProps.onKeyDown?.(event);
        onKeyDown?.(event);
      };

      return cloneElement(child, {
        onClick: handleChildClick,
        onKeyDown: handleChildKeyDown,
        className: cn(className, childProps.className),
        'aria-expanded': isOpen,
        ...(props as unknown as Partial<ChildProps>),
        ...(isButtonElement
          ? { type: childProps.type ?? 'button' }
          : {
              role: childProps.role ?? 'button',
              tabIndex: childProps.tabIndex ?? 0,
            }),
      });
    }

    return (
      <button
        ref={ref as Ref<HTMLButtonElement>}
        type="button"
        aria-expanded={isOpen}
        onClick={handleClick as (e: MouseEvent<HTMLButtonElement>) => void}
        onKeyDown={onKeyDown as (e: KeyboardEvent<HTMLButtonElement>) => void}
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
