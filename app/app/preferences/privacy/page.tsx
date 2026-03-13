/* eslint-disable lekbanken/no-hardcoded-strings */
'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@/components/ui'
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ClockIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'

interface GDPRRequest {
  id: string
  type: 'export' | 'erasure' | 'access' | 'rectification' | 'restriction' | 'portability' | 'objection'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  created_at: string
}

interface ConsentRecord {
  id: string
  consent_type: string
  granted: boolean
  granted_at: string
  purpose: string
}

export default function PrivacySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [gdprRequests, setGdprRequests] = useState<GDPRRequest[]>([])
  const [consents, setConsents] = useState<ConsentRecord[]>([])

  useEffect(() => {
    loadPrivacyData()
  }, [])

  const loadPrivacyData = async () => {
    setLoading(true)
    try {
      // TODO: Load from API when implemented
      setGdprRequests([])
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

      {/* DSAR Contact — Data Export & Deletion */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EnvelopeIcon className="h-5 w-5" />
            Exportera eller radera dina data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Du har rätt att begära en kopia av dina personuppgifter (Artikel 15 &amp; 20)
            eller att få dem raderade (Artikel 17). Kontakta vårt dataskyddsombud
            för att utöva dessa rättigheter.
          </p>

          <div className="bg-background border rounded-lg p-4 space-y-3">
            <div>
              <p className="font-medium">Dataskyddsombud</p>
              <a
                href="mailto:privacy@lekbanken.se"
                className="text-primary underline"
              >
                privacy@lekbanken.se
              </a>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Vi behandlar din förfrågan inom 30 dagar i enlighet med GDPR Artikel 12(3).
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Vad du kan begära:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Dataexport</strong> — En kopia av alla dina personuppgifter i maskinläsbart format</li>
              <li>• <strong>Kontoradering</strong> — Permanent radering av ditt konto och tillhörande personuppgifter</li>
              <li>• <strong>Rättelse</strong> — Korrigering av felaktiga personuppgifter</li>
              <li>• <strong>Begränsning</strong> — Begränsning av behandling av dina uppgifter</li>
            </ul>
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
              <a href="mailto:privacy@lekbanken.se" className="underline">
                privacy@lekbanken.se
              </a>{' '}
              för frågor om dina personuppgifter.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
