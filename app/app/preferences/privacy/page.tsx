/* eslint-disable lekbanken/no-hardcoded-strings */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui'
import {
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface GDPRRequest {
  id: string
  type: 'export' | 'erasure' | 'access' | 'rectification' | 'restriction' | 'portability' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  created_at: string
}

interface DataAccessLog {
  id: string
  action: string
  data_type: string
  timestamp: string
  processor: string
}

interface ConsentRecord {
  id: string
  consent_type: string
  granted: boolean
  granted_at: string
  purpose: string
}

export default function PrivacySettingsPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'info' | 'confirm' | 'final'>('info')
  
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([])
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([])
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrivacyData()
  }, [])

  const loadPrivacyData = async () => {
    setLoading(true)
    try {
      // TODO: Load from API when implemented
      // Simulated data for now
      setGdprRequests([])
      setAccessLogs([])
      setConsents([
        {
          id: '1',
          consent_type: 'terms',
          granted: true,
          granted_at: new Date().toISOString(),
          purpose: 'Användning av tjänsten',
        },
        {
          id: '2',
          consent_type: 'privacy',
          granted: true,
          granted_at: new Date().toISOString(),
          purpose: 'Behandling av personuppgifter',
        },
        {
          id: '3',
          consent_type: 'marketing',
          granted: false,
          granted_at: new Date().toISOString(),
          purpose: 'Marknadsföring via e-post',
        },
      ])
    } catch (err) {
      console.error('Failed to load privacy data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gdpr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Export failed')
      }
      
      const data = await response.json()
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lekbanken-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      setError('Please type "DELETE MY ACCOUNT" to confirm')
      return
    }
    
    setDeleting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gdpr/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Deletion failed')
      }
      
      // Account deleted - redirect to home
      router.push('/?deleted=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed')
      setDeleting(false)
    }
  }

  const handleWithdrawConsent = async (consentId: string) => {
    // TODO: Implement consent withdrawal via API
    setConsents(prev => 
      prev.map(c => c.id === consentId ? { ...c, granted: false } : c)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheckIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Integritet & Datahantering</h1>
          <p className="text-muted-foreground">
            Hantera dina personuppgifter och integritetsval enligt GDPR
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Ett fel uppstod</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <XMarkIcon className="h-5 w-5 text-red-600" />
          </button>
        </div>
      )}

      {/* Data Export - Article 15 & 20 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Exportera dina data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Enligt GDPR har du rätt att få en kopia av alla dina personuppgifter
            (Artikel 15 - Rätt till tillgång, Artikel 20 - Rätt till dataportabilitet).
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Din export innehåller:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Profil och kontoinformation</li>
              <li>• Spelhistorik och prestationer</li>
              <li>• Inlärningsframsteg och badges</li>
              <li>• Samtycken och inställningar</li>
              <li>• Skapade spel och innehåll</li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Exporterar...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Ladda ner mina data
                </>
              )}
            </Button>
            
            {exportSuccess && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircleIcon className="h-5 w-5" />
                Export nedladdad
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5" />
            Samtycken
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Hantera dina samtycken. Vissa samtycken krävs för att använda tjänsten.
          </p>
          
          <div className="divide-y">
            {consents.map((consent) => (
              <div
                key={consent.id}
                className="py-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{consent.consent_type}</span>
                    <Badge variant={consent.granted ? 'default' : 'secondary'}>
                      {consent.granted ? 'Aktivt' : 'Ej aktivt'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{consent.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    Uppdaterat: {new Date(consent.granted_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
                {consent.consent_type !== 'terms' && consent.consent_type !== 'privacy' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWithdrawConsent(consent.id)}
                    disabled={!consent.granted}
                  >
                    {consent.granted ? 'Dra tillbaka' : 'Återkallat'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GDPR Request History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Förfrågningshistorik
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gdprRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Inga GDPR-förfrågningar har gjorts ännu.
            </p>
          ) : (
            <div className="divide-y">
              {gdprRequests.map((request) => (
                <div key={request.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium capitalize">{request.type}</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      request.status === 'completed' ? 'default' :
                      request.status === 'rejected' ? 'destructive' : 'secondary'
                    }
                  >
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Access Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            Dataåtkomstlogg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Logg över när och hur dina data har använts av systemet.
          </p>
          
          {accessLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Ingen dataåtkomst har loggats ännu.
            </p>
          ) : (
            <div className="divide-y max-h-64 overflow-y-auto">
              {accessLogs.map((log) => (
                <div key={log.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString('sv-SE')}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {log.data_type} • {log.processor}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Deletion - Article 17 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <TrashIcon className="h-5 w-5" />
            Radera mitt konto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Enligt GDPR Artikel 17 har du rätt att bli glömd. Detta raderar permanent
            ditt konto och alla tillhörande personuppgifter.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Viktigt att veta
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Denna åtgärd kan <strong>inte</strong> ångras</li>
              <li>• Alla dina spel, framsteg och badges raderas</li>
              <li>• Ev. prenumerationer avslutas automatiskt</li>
              <li>• Vissa uppgifter behålls enligt lag (7 år för bokföring)</li>
            </ul>
          </div>

          {!showDeleteDialog ? (
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => {
                setShowDeleteDialog(true)
                setDeleteStep('info')
              }}
            >
              Jag vill radera mitt konto
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              {deleteStep === 'info' && (
                <>
                  <h4 className="font-semibold text-red-800">Steg 1: Förstå konsekvenserna</h4>
                  <p className="text-sm text-red-700">
                    Du är på väg att permanent radera ditt konto. Vill du exportera
                    dina data först?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Avbryt
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExportData}
                      disabled={exporting}
                    >
                      Exportera först
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => setDeleteStep('confirm')}
                    >
                      Fortsätt utan export
                    </Button>
                  </div>
                </>
              )}
              
              {deleteStep === 'confirm' && (
                <>
                  <h4 className="font-semibold text-red-800">Steg 2: Bekräfta radering</h4>
                  <p className="text-sm text-red-700">
                    Skriv <strong>DELETE MY ACCOUNT</strong> för att bekräfta:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteDialog(false)
                        setDeleteConfirmation('')
                        setDeleteStep('info')
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteConfirmation !== 'DELETE MY ACCOUNT'}
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Raderar...
                        </>
                      ) : (
                        'Radera permanent'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rights Information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Dina rättigheter enligt GDPR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Artikel 15 - Rätt till tillgång</h4>
              <p className="text-sm text-blue-700">
                Du har rätt att få veta vilka uppgifter vi behandlar om dig.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Artikel 16 - Rätt till rättelse</h4>
              <p className="text-sm text-blue-700">
                Du kan begära att felaktiga uppgifter rättas.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Artikel 17 - Rätt till radering</h4>
              <p className="text-sm text-blue-700">
                Du kan begära att dina uppgifter raderas.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Artikel 20 - Dataportabilitet</h4>
              <p className="text-sm text-blue-700">
                Du kan få dina data i ett maskinläsbart format.
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Dataskyddsombud:</strong> Kontakta oss på{' '}
              <a href="mailto:gdpr@lekbanken.se" className="underline">
                gdpr@lekbanken.se
              </a>{' '}
              för frågor om dina personuppgifter.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
