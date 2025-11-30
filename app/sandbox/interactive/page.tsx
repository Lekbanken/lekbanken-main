'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, ConfirmDialog } from '@/components/ui/dialog'
import { DropdownMenu, DropdownItem, DropdownDivider, DropdownLabel } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarWithStatus, AvatarGroup } from '@/components/ui/avatar'
import { Breadcrumbs, BackLink } from '@/components/ui/breadcrumbs'
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs'

export default function InteractiveSandboxPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmVariant, setConfirmVariant] = useState<'default' | 'danger' | 'warning'>('default')
  const { activeTab, setActiveTab } = useTabs('tab1')
  const { activeTab: pillTab, setActiveTab: setPillTab } = useTabs('overview')

  return (
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
            <h1 className="text-lg font-semibold text-foreground">Interactive Components</h1>
          </div>
          <Badge variant="success">Implementerad</Badge>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-12">

          {/* Dialogs */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Dialogs</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Basic Dialog</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setDialogOpen(true)}>Öppna Dialog</Button>
                  <Dialog 
                    open={dialogOpen} 
                    onClose={() => setDialogOpen(false)}
                    title="Redigera profil"
                    description="Uppdatera din profilinformation här."
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Namn</label>
                        <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" defaultValue="Anna Svensson" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">E-post</label>
                        <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground" defaultValue="anna@example.com" />
                      </div>
                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
                        <Button onClick={() => setDialogOpen(false)}>Spara</Button>
                      </div>
                    </div>
                  </Dialog>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Confirm Dialogs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => { setConfirmVariant('default'); setConfirmOpen(true) }}>
                      Default
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setConfirmVariant('warning'); setConfirmOpen(true) }}>
                      Warning
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setConfirmVariant('danger'); setConfirmOpen(true) }}>
                      Danger
                    </Button>
                  </div>
                  <ConfirmDialog
                    open={confirmOpen}
                    onClose={() => setConfirmOpen(false)}
                    onConfirm={() => setConfirmOpen(false)}
                    variant={confirmVariant}
                    title={confirmVariant === 'danger' ? 'Ta bort användare?' : confirmVariant === 'warning' ? 'Osparade ändringar' : 'Bekräfta åtgärd'}
                    description={confirmVariant === 'danger' ? 'Denna åtgärd kan inte ångras. All data för denna användare kommer att tas bort.' : confirmVariant === 'warning' ? 'Du har osparade ändringar. Vill du fortsätta utan att spara?' : 'Är du säker på att du vill fortsätta?'}
                    confirmLabel={confirmVariant === 'danger' ? 'Ta bort' : 'Fortsätt'}
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Dropdown Menus */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Dropdown Menus</h2>
            <div className="flex flex-wrap gap-4">
              <DropdownMenu
                trigger={
                  <Button variant="outline">
                    Välj åtgärd
                    <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </Button>
                }
              >
                <DropdownLabel>Åtgärder</DropdownLabel>
                <DropdownItem 
                  icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
                  onClick={() => {}}
                >
                  Redigera
                </DropdownItem>
                <DropdownItem 
                  icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                  onClick={() => {}}
                >
                  Duplicera
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem 
                  icon={<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                  destructive
                  onClick={() => {}}
                >
                  Ta bort
                </DropdownItem>
              </DropdownMenu>

              <DropdownMenu
                trigger={
                  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80">
                    <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                }
              >
                <DropdownItem onClick={() => {}}>Visa detaljer</DropdownItem>
                <DropdownItem onClick={() => {}}>Dela</DropdownItem>
                <DropdownItem onClick={() => {}}>Exportera</DropdownItem>
              </DropdownMenu>
            </div>
          </section>

          {/* Avatars */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Avatars</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sizes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <Avatar name="Anna Svensson" size="xs" />
                    <Avatar name="Anna Svensson" size="sm" />
                    <Avatar name="Anna Svensson" size="md" />
                    <Avatar name="Anna Svensson" size="lg" />
                    <Avatar name="Anna Svensson" size="xl" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">With Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <AvatarWithStatus name="Online User" status="online" />
                    <AvatarWithStatus name="Away User" status="away" />
                    <AvatarWithStatus name="Busy User" status="busy" />
                    <AvatarWithStatus name="Offline User" status="offline" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Avatar Group</CardTitle>
                </CardHeader>
                <CardContent>
                  <AvatarGroup
                    avatars={[
                      { name: 'Anna Svensson' },
                      { name: 'Erik Johansson' },
                      { name: 'Maria Lindgren' },
                      { name: 'Johan Karlsson' },
                      { name: 'Sara Nilsson' },
                      { name: 'Per Andersson' },
                    ]}
                    max={4}
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Breadcrumbs */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Breadcrumbs</h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Standard Breadcrumbs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Breadcrumbs
                    items={[
                      { label: 'Hem', href: '/' },
                      { label: 'Kategorier', href: '/categories' },
                      { label: 'Utomhuslekar', href: '/categories/outdoor' },
                      { label: 'Räkna & Spring' },
                    ]}
                  />
                  <Breadcrumbs
                    items={[
                      { label: 'Admin', href: '/admin' },
                      { label: 'Användare', href: '/admin/users' },
                      { label: 'Anna Svensson' },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Back Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <BackLink href="/sandbox" label="Tillbaka till sandbox" />
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Tabs */}
          <section>
            <h2 className="mb-6 text-xl font-semibold text-foreground">Tabs</h2>
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Default Tabs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs
                    tabs={[
                      { id: 'tab1', label: 'Översikt' },
                      { id: 'tab2', label: 'Detaljer' },
                      { id: 'tab3', label: 'Historik', badge: '12' },
                      { id: 'tab4', label: 'Inaktiv', disabled: true },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                  />
                  <div className="mt-4 rounded-lg border border-border p-4">
                    <TabPanel id="tab1" activeTab={activeTab}>
                      <p className="text-muted-foreground">Innehåll för översiktsfliken.</p>
                    </TabPanel>
                    <TabPanel id="tab2" activeTab={activeTab}>
                      <p className="text-muted-foreground">Detaljerad information visas här.</p>
                    </TabPanel>
                    <TabPanel id="tab3" activeTab={activeTab}>
                      <p className="text-muted-foreground">Historik med 12 poster.</p>
                    </TabPanel>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pills Variant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      variant="pills"
                      tabs={[
                        { id: 'overview', label: 'Översikt' },
                        { id: 'analytics', label: 'Analys' },
                        { id: 'reports', label: 'Rapporter' },
                      ]}
                      activeTab={pillTab}
                      onChange={setPillTab}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Underline Variant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs
                      variant="underline"
                      tabs={[
                        { id: 'all', label: 'Alla' },
                        { id: 'active', label: 'Aktiva', badge: 24 },
                        { id: 'inactive', label: 'Inaktiva', badge: 3 },
                      ]}
                      activeTab="all"
                      onChange={() => {}}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Implementation Notes */}
          <div className="mt-12 rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">Implementeringsnoteringar</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li><strong>Dialog:</strong> Bygger på Headless UI. Stödjer olika storlekar. ConfirmDialog för bekräftelser med danger/warning/default varianter.</li>
              <li><strong>DropdownMenu:</strong> Headless UI Menu. Stödjer ikoner, destructive items, labels och dividers.</li>
              <li><strong>Avatar:</strong> Genererar initialer och konsistenta färger från namn. AvatarWithStatus för online-indikator. AvatarGroup för att visa flera.</li>
              <li><strong>Breadcrumbs:</strong> Navigationsbrödsmulor med anpassningsbar separator. BackLink för enkel tillbaka-länk.</li>
              <li><strong>Tabs:</strong> Tre varianter (default, pills, underline). Stödjer badges och disabled state. useTabs hook för state-hantering.</li>
            </ul>
            
            <h3 className="mt-6 text-base font-medium text-foreground">Användning</h3>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
{`// Dialog
<Dialog open={open} onClose={close} title="Titel">
  <p>Innehåll</p>
</Dialog>

// Confirm dialog  
<ConfirmDialog 
  open={open} 
  onClose={close}
  onConfirm={handleDelete}
  variant="danger"
  title="Ta bort?"
/>

// Dropdown
<DropdownMenu trigger={<Button>Meny</Button>}>
  <DropdownItem onClick={edit}>Redigera</DropdownItem>
  <DropdownDivider />
  <DropdownItem destructive onClick={del}>Ta bort</DropdownItem>
</DropdownMenu>

// Avatar
<Avatar name="Anna Svensson" size="lg" />
<AvatarWithStatus name="User" status="online" />
<AvatarGroup avatars={users} max={4} />

// Tabs
const { activeTab, setActiveTab } = useTabs('tab1')
<Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
<TabPanel id="tab1" activeTab={activeTab}>Content</TabPanel>`}
            </pre>
            
            <p className="mt-6 text-xs text-muted-foreground">Senast uppdaterad: 2024-11-30</p>
          </div>

        </div>
      </div>
    </div>
  )
}
