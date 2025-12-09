import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

const toggleVariants = {
  base: 'inline-flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all hover:shadow-md hover:border-border active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
  pressed: 'bg-primary/10 text-primary border-primary/40',
}

type ToggleProps = {
  pressed?: boolean
  asChild?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        data-pressed={pressed ? 'on' : 'off'}
        className={cn(toggleVariants.base, pressed && toggleVariants.pressed, className)}
        aria-pressed={pressed}
        type={asChild ? undefined : 'button'}
        {...props}
      />
    )
  }
)
Toggle.displayName = 'Toggle'
