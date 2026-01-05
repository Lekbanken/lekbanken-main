'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AvatarBuilderShellProps {
  children: ReactNode
  className?: string
}

/**
 * AvatarBuilderShell
 * 
 * A mobile device frame wrapper that makes the builder feel like
 * a compact mobile app embedded in the sandbox page.
 */
export function AvatarBuilderShell({ children, className = '' }: AvatarBuilderShellProps) {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[600px] p-4',
      className
    )}>
      {/* Phone frame */}
      <div className={cn(
        'relative w-full max-w-[375px] bg-gray-900 rounded-[40px] p-3',
        'shadow-2xl shadow-gray-400/50'
      )}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-20">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-800 rounded-full" />
        </div>

        {/* Screen */}
        <div className={cn(
          'relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-[32px] overflow-hidden',
          'min-h-[580px]'
        )}>
          {/* Status bar mockup */}
          <div className="flex items-center justify-between px-6 pt-8 pb-2 text-xs text-gray-600">
            <span className="font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <SignalIcon className="w-4 h-4" />
              <WifiIcon className="w-4 h-4" />
              <BatteryIcon className="w-5 h-5" />
            </div>
          </div>

          {/* Content area */}
          <div className="px-4 pb-6">
            {children}
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
      </div>
    </div>
  )
}

// Status bar icons
function SignalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="16" width="3" height="6" rx="1" />
      <rect x="7" y="12" width="3" height="10" rx="1" />
      <rect x="12" y="8" width="3" height="14" rx="1" />
      <rect x="17" y="4" width="3" height="18" rx="1" />
    </svg>
  )
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  )
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <rect x="4" y="9" width="12" height="6" rx="1" fill="currentColor" />
      <path d="M22 11v2" strokeLinecap="round" />
    </svg>
  )
}

export default AvatarBuilderShell
