'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, EmptySearchState, EmptyListState, EmptyFavoritesState } from '@/components/ui/empty-state'
import { ErrorState, NetworkErrorState, NotFoundState, PermissionErrorState } from '@/components/ui/error-state'
import { LoadingSpinner, LoadingState, ButtonSpinner } from '@/components/ui/loading-spinner'
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, SkeletonStats, SkeletonGameCard } from '@/components/ui/skeleton'
import { Alert, InlineAlert } from '@/components/ui/alert'
import { ToastProvider, useToast } from '@/components/ui/toast'

function ToastDemo() {
  const { success, error, warning, info } = useToast()
  
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => success('Ändringarna har sparats!')}>
        Success Toast
      </Button>
      <Button size="sm" variant="outline" onClick={() => error('Något gick fel vid sparandet')}>
        Error Toast
      </Button>
      <Button size="sm" variant="outline" onClick={() => warning('Du har osparade ändringar')}>
        Warning Toast
      </Button>
      <Button size="sm" variant="outline" onClick={() => info('Ny version tillgänglig')}>
        Info Toast
      </Button>
    </div>
  )
}

export default function FeedbackSandboxPage() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        {/* Toolbar */}
        <div className="sticky top-0 z-50 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/sandbox" 
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Tillbaka
              </Link>
              <h1 className="text-lg font-semibold text-foreground">Feedback & States</h1>
            </div>
            <Badge variant="success">Implementerad</Badge>
          </div>
        </div>

        <div className="p-8">
          <div className="mx-auto max-w-6xl space-y-12">
            
            {/* Empty States */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Empty States</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">EmptySearchState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptySearchState query="fotboll" onClear={() => {}} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">EmptyListState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyListState itemName="aktiviteter" onAdd={() => {}} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">EmptyFavoritesState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyFavoritesState onBrowse={() => {}} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Custom EmptyState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EmptyState
                      icon={
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      }
                      title="Inga schemalagda aktiviteter"
                      description="Lägg till aktiviteter i din kalender för att se dem här."
                      action={{ label: 'Planera aktivitet', onClick: () => {} }}
                    />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Error States */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Error States</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ErrorState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ErrorState
                      description="Kunde inte ladda data. Försök igen senare."
                      onRetry={() => {}}
                      onGoBack={() => {}}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">NetworkErrorState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NetworkErrorState onRetry={() => {}} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">NotFoundState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <NotFoundState itemName="aktiviteten" onGoBack={() => {}} />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">PermissionErrorState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PermissionErrorState onGoBack={() => {}} />
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Loading States */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Loading States</h2>
              <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">LoadingSpinner (sizes)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <LoadingSpinner size="sm" />
                      <LoadingSpinner size="md" />
                      <LoadingSpinner size="lg" />
                      <LoadingSpinner size="xl" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">LoadingState</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LoadingState message="Laddar aktiviteter..." />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ButtonSpinner</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button disabled>
                      <ButtonSpinner />
                      Sparar...
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsLoading(!isLoading)}
                    >
                      {isLoading ? (
                        <>
                          <ButtonSpinner />
                          Laddar...
                        </>
                      ) : (
                        'Klicka för loading'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Skeletons */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Skeleton Loaders</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">SkeletonStats</h3>
                  <SkeletonStats count={4} />
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">SkeletonCard</h3>
                    <SkeletonCard />
                  </div>
                  <div>
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">SkeletonGameCard</h3>
                    <SkeletonGameCard />
                  </div>
                </div>
                
                <div>
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">SkeletonTable</h3>
                  <SkeletonTable rows={4} columns={5} />
                </div>
                
                <div>
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">SkeletonList</h3>
                  <div className="rounded-xl border border-border bg-card p-6">
                    <SkeletonList items={4} />
                  </div>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3">
                  <div>
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">Basic Skeleton</h3>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alerts */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Alerts</h2>
              <div className="space-y-4">
                <Alert variant="info" title="Information">
                  Det finns en ny version av appen tillgänglig. Uppdatera för att få tillgång till nya funktioner.
                </Alert>
                <Alert variant="success" title="Lyckat!">
                  Dina ändringar har sparats.
                </Alert>
                <Alert variant="warning" title="Varning">
                  Du har osparade ändringar. Kom ihåg att spara innan du lämnar sidan.
                </Alert>
                <Alert variant="error" title="Fel">
                  Kunde inte spara ändringarna. Kontrollera din anslutning och försök igen.
                </Alert>
                <Alert variant="info" onClose={() => {}}>
                  Denna alert kan stängas med X-knappen.
                </Alert>
              </div>
              
              <h3 className="mt-8 mb-4 text-lg font-medium text-foreground">Inline Alerts</h3>
              <div className="space-y-2">
                <InlineAlert variant="error">E-postadressen är ogiltig</InlineAlert>
                <InlineAlert variant="success">Tillgängligt användarnamn</InlineAlert>
                <InlineAlert variant="warning">Lösenordet är svagt</InlineAlert>
              </div>
            </section>

            {/* Toasts */}
            <section>
              <h2 className="mb-6 text-xl font-semibold text-foreground">Toasts</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Toast Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Klicka på knapparna för att visa toast-notifikationer i nedre högra hörnet.
                  </p>
                  <ToastDemo />
                </CardContent>
              </Card>
            </section>

            {/* Implementation Notes */}
            <div className="mt-12 rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground">Implementeringsnoteringar</h2>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
                <li><strong>EmptyState:</strong> Generisk tom-vy med ikon, titel, beskrivning och actions. Preset-varianter för sök, listor och favoriter.</li>
                <li><strong>ErrorState:</strong> Felvyer med retry/back-actions. Presets för nätverksfel, 404 och behörighetsfel.</li>
                <li><strong>LoadingSpinner:</strong> Animerad spinner i 4 storlekar. LoadingState för fullständig laddningsvy.</li>
                <li><strong>Skeleton:</strong> Placeholder-komponenter för data som laddas. Presets för cards, tabeller, listor och stats.</li>
                <li><strong>Alert:</strong> Inline-meddelanden med 4 varianter (info, success, warning, error). Stödjer stängning.</li>
                <li><strong>Toast:</strong> Notifikationer via ToastProvider context. Använd useToast() hook för att visa meddelanden.</li>
              </ul>
              
              <h3 className="mt-6 text-base font-medium text-foreground">Användning</h3>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`// Empty states
<EmptySearchState query="sökterm" onClear={() => {}} />
<EmptyListState itemName="användare" onAdd={() => {}} />

// Error states  
<ErrorState onRetry={refetch} onGoBack={() => router.back()} />
<NetworkErrorState onRetry={refetch} />

// Loading
<LoadingSpinner size="lg" />
<LoadingState message="Laddar..." />
<Button disabled><ButtonSpinner />Sparar...</Button>

// Skeletons
<SkeletonTable rows={5} columns={4} />
<SkeletonGameCard />
<SkeletonStats count={4} />

// Alerts
<Alert variant="success" title="Sparat!">Dina ändringar sparades.</Alert>
<InlineAlert variant="error">Ogiltigt värde</InlineAlert>

// Toasts (wrap app med ToastProvider)
const { success, error } = useToast()
success('Sparat!')
error('Något gick fel')`}
              </pre>
              
              <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
            </div>

          </div>
        </div>
      </div>
    </ToastProvider>
  )
}
