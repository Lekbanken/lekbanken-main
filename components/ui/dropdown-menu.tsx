'use client'

import { Fragment, ReactNode } from 'react'
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { cn } from '@/lib/utils'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  return (
    <Menu as="div" className={cn('relative inline-block text-left', className)}>
      <MenuButton as={Fragment}>{trigger}</MenuButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems
          className={cn(
            'absolute z-50 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card p-1 shadow-lg ring-1 ring-black/5 focus:outline-none',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {children}
        </MenuItems>
      </Transition>
    </Menu>
  )
}

interface DropdownItemProps {
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function DropdownItem({ 
  onClick, 
  disabled, 
  destructive,
  icon, 
  children,
  className,
}: DropdownItemProps) {
  return (
    <MenuItem disabled={disabled}>
      {({ focus }) => (
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            focus && !destructive && 'bg-muted',
            focus && destructive && 'bg-red-50',
            destructive ? 'text-red-600' : 'text-foreground',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          {icon && <span className="h-4 w-4">{icon}</span>}
          {children}
        </button>
      )}
    </MenuItem>
  )
}

export function DropdownDivider() {
  return <div className="my-1 h-px bg-border" />
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}
