'use client'

import * as React from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

function hasSheetDescription(node: React.ReactNode): boolean {
  let found = false

  const visit = (child: React.ReactNode) => {
    if (found || child == null || typeof child === 'boolean') return

    if (Array.isArray(child)) {
      for (const c of child) visit(c)
      return
    }

    if (!React.isValidElement(child)) return

    if (child.type === SheetDescription || child.type === SheetPrimitive.Description) {
      found = true
      return
    }

    const props = child.props as { children?: React.ReactNode } | undefined
    if (props?.children) visit(props.children)
  }

  visit(node)
  return found
}

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

type SheetSide = 'top' | 'bottom' | 'left' | 'right'

function sideClasses(side: SheetSide) {
  switch (side) {
    case 'top':
      return 'inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top'
    case 'bottom':
      return 'inset-x-0 bottom-0 border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom'
    case 'left':
      return 'inset-y-0 left-0 h-full w-5/6 border-r sm:max-w-sm data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left'
    default:
      return 'inset-y-0 right-0 h-full w-5/6 border-l sm:max-w-sm data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right'
  }
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: SheetSide }
>(({ className, children, side = 'right', ...props }, ref) => {
  const hasDescription = hasSheetDescription(children)
  const shouldUnsetDescribedBy =
    !hasDescription && !Object.prototype.hasOwnProperty.call(props, 'aria-describedby')

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 gap-4 bg-card p-6 shadow-xl outline-none transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          sideClasses(side),
          className,
        )}
        {...(shouldUnsetDescribedBy ? { 'aria-describedby': undefined } : {})}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:space-x-3', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName
