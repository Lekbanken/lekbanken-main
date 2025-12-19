import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react';
import { Fragment } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: ReactNode
}

const defaultSeparator = (
  <svg className="h-4 w-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

export function Breadcrumbs({ items, className, separator = defaultSeparator }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Fragment key={index}>
              <li className="flex items-center gap-2">
                {item.icon && (
                  <span className="text-muted-foreground">{item.icon}</span>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn(isLast ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && <li aria-hidden="true">{separator}</li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

// Simple back link (common pattern)
interface BackLinkProps {
  href: string
  label?: string
  className?: string
}

export function BackLink({ href, label = 'Tillbaka', className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground',
        className
      )}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  )
}
