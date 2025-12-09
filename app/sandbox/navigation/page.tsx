'use client'

import { Header } from '@/components/marketing/header'
import { SimpleModulePage } from '../components/shell/SimpleModulePage'

export default function NavigationSandbox() {
  return (
    <SimpleModulePage
      moduleId="navigation"
      title="Navigation"
      description="Marketing header and app navigation patterns."
    >
      <div className="space-y-12">
        {/* Marketing Header - Live component */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Marketing Header (Live)</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Testa mobilmenyn genom att minska webbläsarens bredd under 1024px.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <Header />
          </div>
        </section>

        {/* App SideNav */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">App SideNav</h2>
          <div className="w-64 overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex flex-col gap-1 p-4">
              <a href="#" className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                <span>🏠</span> Dashboard
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>🎮</span> Spel
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>🏆</span> Topplista
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>⭐</span> Prestationer
              </a>
              <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <span>👤</span> Profil
              </a>
            </div>
          </div>
        </section>

        {/* App BottomNav (Mobile) */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">App BottomNav (Mobile)</h2>
          <div className="mx-auto max-w-sm overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex items-center justify-around border-t border-border py-3">
              <a href="#" className="flex flex-col items-center gap-1 text-primary">
                <span className="text-xl">🏠</span>
                <span className="text-xs font-medium">Hem</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">🎮</span>
                <span className="text-xs font-medium">Spel</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">🏆</span>
                <span className="text-xs font-medium">Topplista</span>
              </a>
              <a href="#" className="flex flex-col items-center gap-1 text-muted-foreground">
                <span className="text-xl">👤</span>
                <span className="text-xs font-medium">Profil</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </SimpleModulePage>
  )
}
