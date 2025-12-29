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
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from './button';

// =============================================================================
// Context
// =============================================================================

interface AlertDialogContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within an AlertDialog');
  }
  return context;
}

// =============================================================================
// AlertDialog Root
// =============================================================================

interface AlertDialogProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setIsOpen = (open: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(open);
    }
    onOpenChange?.(open);
  };

  return (
    <AlertDialogContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

// =============================================================================
// AlertDialog Trigger
// =============================================================================

interface AlertDialogTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const AlertDialogTrigger = forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  ({ children, className, asChild: _asChild, onClick, ...props }, ref) => {
    const { setIsOpen } = useAlertDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsOpen(true);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  }
);

AlertDialogTrigger.displayName = 'AlertDialogTrigger';

// =============================================================================
// AlertDialog Portal & Overlay
// =============================================================================

export function AlertDialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const AlertDialogOverlay = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isOpen } = useAlertDialog();

    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
          'animate-in fade-in-0',
          className
        )}
        {...props}
      />
    );
  }
);

AlertDialogOverlay.displayName = 'AlertDialogOverlay';

// =============================================================================
// AlertDialog Content
// =============================================================================

interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export const AlertDialogContent = forwardRef<HTMLDivElement, AlertDialogContentProps>(
  ({ children, className, variant = 'default', ...props }, ref) => {
    const { isOpen, setIsOpen: _setIsOpen } = useAlertDialog();

    if (!isOpen) return null;

    return (
      <>
        <AlertDialogOverlay />
        <div
          ref={ref}
          role="alertdialog"
          aria-modal="true"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-card p-6 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
          {...props}
        >
          {variant === 'destructive' && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          )}
          {children}
        </div>
      </>
    );
  }
);

AlertDialogContent.displayName = 'AlertDialogContent';

// =============================================================================
// AlertDialog Header, Footer, Title, Description
// =============================================================================

export const AlertDialogHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  )
);

AlertDialogHeader.displayName = 'AlertDialogHeader';

export const AlertDialogFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)}
      {...props}
    />
  )
);

AlertDialogFooter.displayName = 'AlertDialogFooter';

export const AlertDialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-foreground', className)}
      {...props}
    />
  )
);

AlertDialogTitle.displayName = 'AlertDialogTitle';

export const AlertDialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
);

AlertDialogDescription.displayName = 'AlertDialogDescription';

// =============================================================================
// AlertDialog Action & Cancel
// =============================================================================

interface AlertDialogActionProps {
  className?: string;
  variant?: 'default' | 'destructive';
  onClick?: () => void;
  children?: ReactNode;
  disabled?: boolean;
}

export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ className, variant = 'default', onClick, children, disabled }, _ref) => {
    const { setIsOpen } = useAlertDialog();

    const handleClick = () => {
      onClick?.();
      setIsOpen(false);
    };

    return (
      <Button
        variant={variant === 'destructive' ? 'destructive' : 'primary'}
        onClick={handleClick}
        className={className}
        disabled={disabled}
      >
        {children}
      </Button>
    );
  }
);

AlertDialogAction.displayName = 'AlertDialogAction';

interface AlertDialogCancelProps {
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
  disabled?: boolean;
}

export const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  ({ className, onClick, children, disabled }, _ref) => {
    const { setIsOpen } = useAlertDialog();

    const handleClick = () => {
      onClick?.();
      setIsOpen(false);
    };

    return (
      <Button
        variant="outline"
        onClick={handleClick}
        className={cn('mt-2 sm:mt-0', className)}
        disabled={disabled}
      >
        {children}
      </Button>
    );
  }
);

AlertDialogCancel.displayName = 'AlertDialogCancel';
