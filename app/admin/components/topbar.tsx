'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownItem, DropdownDivider, DropdownLabel } from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { useAuth } from '@/lib/supabase/auth'

export function AdminTopbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'A'
  const userEmail = user?.email || 'admin@lekbanken.no'

  return (
    <header className="flex items-center justify-between border-b border-border bg-card/70 px-6 py-4 backdrop-blur">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            type="search"
            placeholder="Sök användare, organisationer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick actions */}
        <Button variant="outline" size="sm">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ny användare
        </Button>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Help */}
        <button className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* User menu with dropdown */}
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-1.5 transition-colors hover:bg-muted">
              <Avatar name={userEmail} size="sm" />
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-foreground">Admin</p>
                <p className="text-xs text-muted-foreground">Superadmin</p>
              </div>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          }
          align="right"
        >
          <DropdownLabel>Inloggad som</DropdownLabel>
          <div className="px-3 py-2 text-sm text-foreground">{userEmail}</div>
          <DropdownDivider />
          <DropdownItem
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20c0-3.3 3-6 7-6s7 2.7 7 6" />
              </svg>
            }
            onClick={() => router.push('/admin/settings')}
          >
            Min profil
          </DropdownItem>
          <DropdownItem
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-5.07-1.41 1.41M8.34 15.66l-1.41 1.41m10.14 0-1.41-1.41M8.34 8.34 6.93 6.93" />
              </svg>
            }
            onClick={() => router.push('/admin/settings')}
          >
            Inställningar
          </DropdownItem>
          <DropdownItem
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
            onClick={() => router.push('/app')}
          >
            Gå till appen
          </DropdownItem>
          <DropdownDivider />
          <DropdownItem
            destructive
            icon={
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            }
            onClick={handleSignOut}
          >
            Logga ut
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  )
}
