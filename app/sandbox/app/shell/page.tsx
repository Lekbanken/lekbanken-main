'use client'

import { SandboxShell } from '../../components/shell/SandboxShellV2'
import { SideNav } from '@/components/app/SideNav'
import { BottomNav } from '@/components/app/BottomNav'

export default function AppShellSandbox() {
  return (
    <SandboxShell
      moduleId="app-shell"
      title="App Shell"
      description="SideNav + BottomNav + Layout"
    >
      <div className="space-y-12">
          {/* SideNav Preview */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">SideNav (Desktop)</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Visas på skärmar ≥1024px. Fixed position, 256px bred.
            </p>
            <div className="relative h-[500px] w-full max-w-[300px] overflow-hidden rounded-lg border border-border">
              <div className="absolute inset-0 scale-90 origin-top-left">
                <SideNav />
              </div>
            </div>
          </section>

          {/* BottomNav Preview */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">BottomNav (Mobile)</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Visas på skärmar &lt;1024px. Fixed bottom, safe-area aware.
            </p>
            <div className="relative mx-auto h-[100px] w-full max-w-[400px] overflow-hidden rounded-lg border border-border bg-card">
              <div className="absolute inset-x-0 bottom-0">
                <BottomNav />
              </div>
            </div>
          </section>

          {/* Full Shell Preview */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Full Layout</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Kombinerad vy - Desktop med SideNav, mobil med BottomNav.
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              {/* Desktop mockup */}
              <div className="hidden lg:flex">
                <div className="w-64 border-r border-border bg-card p-4">
                  <div className="mb-6">
                    <div className="text-lg font-semibold text-foreground">Lekbanken</div>
                    <div className="text-sm text-muted-foreground">App</div>
                  </div>
                  <div className="space-y-2">
                    {['Hem', 'Kategorier', 'Lekresa', 'Favoriter', 'Profil'].map((item, i) => (
                      <div 
                        key={item}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                          i === 0 ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-lg bg-muted" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-8">
                  <div className="h-64 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    Innehåll här
                  </div>
                </div>
              </div>
              
              {/* Mobile mockup */}
              <div className="lg:hidden">
                <div className="p-4">
                  <div className="h-48 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    Innehåll här
                  </div>
                </div>
                <div className="border-t border-border bg-card">
                  <div className="grid grid-cols-5 py-2">
                    {['🏠', '📱', '🗺️', '❤️', '👤'].map((icon, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                          i === 0 ? 'bg-primary/10' : ''
                        }`}>
                          {icon}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {['Hem', 'Kat.', 'Resa', 'Fav.', 'Profil'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Code example */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Användning</h2>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
{`// app/app/layout.tsx
import { AppShell } from '@/components/app/AppShell'

export default function AppLayout({ children }) {
  return <AppShell>{children}</AppShell>
}

// AppShell inkluderar:
// - SideNav (desktop, lg:flex)
// - BottomNav (mobile, lg:hidden)
// - Korrekt padding för båda`}
            </pre>
          </section>

          {/* Notes */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">Implementationsnoteringar</h2>
            <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>SideNav: Fixed, 256px bred, visas på lg:</li>
              <li>BottomNav: Fixed bottom, safe-area aware, visas under lg:</li>
              <li>Responsiv breakpoint: 1024px (lg)</li>
              <li>Aktiv navigering med <code className="rounded bg-muted px-1">bg-primary/10 text-primary</code></li>
            </ul>

            <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
          </section>
        </div>
    </SandboxShell>
  )
}
