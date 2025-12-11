'use client'

import { useState } from 'react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState, EmptySearchState, EmptyListState } from '@/components/ui/empty-state'
import { ErrorState, NetworkErrorState, PermissionErrorState } from '@/components/ui/error-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingOverlay, LoadingSpinner, LoadingState } from '@/components/ui/loading-spinner'
import { MediaPicker } from '@/components/ui/media-picker'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs'
import { ToastProvider, useToast } from '@/components/ui/toast'
import { Toggle } from '@/components/ui/toggle'

function ToastButtons() {
  const { success, error, warning, info } = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => success('Åtgärd lyckades', 'Success')}>
        Visa success
      </Button>
      <Button size="sm" variant="outline" onClick={() => info('Information till användaren', 'Info')}>
        Visa info
      </Button>
      <Button size="sm" variant="outline" onClick={() => warning('Något behöver din uppmärksamhet', 'Varning')}>
        Visa varning
      </Button>
      <Button size="sm" variant="destructive" onClick={() => error('Något gick fel', 'Fel')}>
        Visa fel
      </Button>
    </div>
  )
}

export default function UIExtrasPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [sheetToggle, setSheetToggle] = useState(true)
  const { activeTab, setActiveTab } = useTabs('states')

  return (
    <ToastProvider>
      <div className="space-y-10 p-6 md:p-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground">UI Extras</h1>
          <p className="text-muted-foreground">Översikt över mindre komponenter och states.</p>
        </div>

        <Card className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Navigering & layout</h2>
          <Breadcrumbs
            items={[
              { label: 'Hem', href: '/' },
              { label: 'Sandbox', href: '/sandbox' },
              { label: 'UI Extras' },
            ]}
          />

          <div className="flex flex-wrap gap-4">
            <Tabs
              tabs={[
                { id: 'states', label: 'States', badge: 3 },
                { id: 'inputs', label: 'Inputs' },
                { id: 'overlay', label: 'Overlay' },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              variant="underline"
            />
          </div>

          <TabPanel id="states" activeTab={activeTab} className="grid gap-6 md:grid-cols-2">
            <EmptyState
              title="Inga poster ännu"
              description="Visa en generell tomvy."
              action={{ label: 'Skapa', onClick: () => alert('Skapa') }}
              secondaryAction={{ label: 'Läs mer', onClick: () => alert('Läs mer') }}
            />
            <ErrorState
              title="Något gick fel"
              description="Visa fel med retry."
              onRetry={() => alert('Retry')}
            />
            <EmptySearchState query="roliga grejer" onClear={() => alert('Rensa sökning')} />
            <EmptyListState itemName="inlägg" onAdd={() => alert('Lägg till')} />
            <NetworkErrorState onRetry={() => alert('Försök igen')} />
            <PermissionErrorState onGoBack={() => alert('Tillbaka')} />
          </TabPanel>

          <TabPanel id="inputs" activeTab={activeTab} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Toggles & Switches</h3>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="notif">Notiser</Label>
                <Switch id="notif" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="dark">Dark mode</Label>
                <Toggle pressed={darkMode} onClick={() => setDarkMode(!darkMode)} aria-label="Dark mode">
                  {darkMode ? 'On' : 'Off'}
                </Toggle>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Media Picker (mockad)</h3>
              <p className="text-sm text-muted-foreground">
                Visar biblioteket utan nätverksladdning (ingen fetch förrän du byter flik eller laddar).
              </p>
              <MediaPicker
                onSelect={(id, url) => alert(`Valde media ${id} (${url})`)}
                allowUpload={false}
                allowTemplate={false}
                trigger={<Button variant="outline">Öppna Media Picker</Button>}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Form + Tabs</h3>
              <Tabs
                tabs={[
                  { id: 'info', label: 'Info' },
                  { id: 'inst', label: 'Inställningar' },
                ]}
                activeTab="info"
                onChange={() => {}}
                variant="pills"
              />
              <div className="space-y-2">
                <Label htmlFor="name">Namn</Label>
                <Input id="name" placeholder="Skriv något" />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Loading states</h3>
              <div className="flex items-center gap-3">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
              </div>
              <LoadingState message="Laddar data..." size="md" />
            </div>
          </TabPanel>

          <TabPanel id="overlay" activeTab={activeTab} className="space-y-6">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Sheet</h3>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline">Öppna sheet</Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Inställningspanel</SheetTitle>
                    <SheetDescription>En enkel sheet för sekundära åtgärder.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sheet-name">Namn</Label>
                      <Input id="sheet-name" placeholder="Ange namn" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sheet-toggle">Aktivera</Label>
                      <Switch id="sheet-toggle" checked={sheetToggle} onCheckedChange={setSheetToggle} />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Toast</h3>
              <ToastButtons />
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4 relative overflow-hidden">
              <h3 className="font-semibold">Overlay</h3>
              <p className="text-sm text-muted-foreground">Exempel på LoadingOverlay.</p>
              <div className="h-32 rounded-lg bg-muted relative">
                <LoadingOverlay message="Bearbetar..." />
              </div>
            </div>
          </TabPanel>
        </Card>
      </div>
    </ToastProvider>
  )
}
