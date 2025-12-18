'use client'

import { AppShell } from '@/components/app/AppShell'

export default function AppShellMobilePreview() {
  return (
    <AppShell
      header={
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Mobile preview</div>
            <div className="text-xs text-muted-foreground">BottomNav visas under 1024px (lg)</div>
          </div>
          <div className="text-xs text-muted-foreground">390px</div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Innehåll här</div>
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Scrolla för att se fixed BottomNav</div>
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Sektion 3</div>
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Sektion 4</div>
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Sektion 5</div>
        <div className="rounded-2xl bg-muted p-6 text-sm text-muted-foreground">Sektion 6</div>
      </div>
    </AppShell>
  )
}
