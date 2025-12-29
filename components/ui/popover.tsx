'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type HTMLAttributes,
  forwardRef,
} from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// Context
// =============================================================================

interface PopoverContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
}

// =============================================================================
// Popover Root
// =============================================================================

interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(open);
    }
    onOpenChange?.(open);
  };

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

// =============================================================================
// Popover Trigger
// =============================================================================

interface PopoverTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, className, asChild: _asChild, onClick, ...props }, ref) => {
    const { isOpen, setIsOpen, triggerRef } = usePopover();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsOpen(!isOpen);
      onClick?.(e);
    };

    // Create a mutable ref for the trigger
    const internalTriggerRef = triggerRef as React.MutableRefObject<HTMLButtonElement | null>;

    return (
      <button
        ref={(node) => {
          // Handle both refs
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          if (node) internalTriggerRef.current = node;
        }}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleClick}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PopoverTrigger.displayName = 'PopoverTrigger';

// =============================================================================
// Popover Content
// =============================================================================

type PopoverAlign = 'start' | 'center' | 'end';
type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: PopoverAlign;
  side?: PopoverSide;
  sideOffset?: number;
}

const alignClasses: Record<PopoverAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const sideClasses: Record<PopoverSide, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
};

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { children, className, align = 'center', side = 'bottom', sideOffset = 4, ...props },
    ref
  ) => {
    const { isOpen, setIsOpen } = usePopover();
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, setIsOpen]);

    if (!isOpen) return null;

    return (
      <div
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        role="dialog"
        className={cn(
          'absolute z-50 min-w-[8rem] rounded-lg border border-border bg-card p-4 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
          alignClasses[align],
          sideClasses[side],
          className
        )}
        style={{ marginTop: side === 'bottom' ? sideOffset : undefined }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PopoverContent.displayName = 'PopoverContent';
