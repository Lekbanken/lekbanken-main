/* eslint-disable lekbanken/no-hardcoded-strings */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Underleverantörer | Lekbanken',
  description: 'Lista över underleverantörer (subprocessors) som behandlar personuppgifter för Lekbankens räkning enligt GDPR.',
}

interface Subprocessor {
  name: string
  purpose: string
  dataTypes: string[]
  location: string
  region: string
  dpaStatus: 'signed' | 'pending' | 'scc'
  schrems2Compliant: boolean
  website: string
}

const subprocessors: Subprocessor[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Databas, autentisering och backend-infrastruktur',
    dataTypes: [
      'Kontoinformation',
      'Speldata',
      'Inlärningsframsteg',
      'Autentiseringsdata',
    ],
    location: 'USA (med EU-region)',
    region: 'eu-central-1 (Frankfurt, Tyskland)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://supabase.com',
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Webbhosting och CDN',
    dataTypes: ['IP-adresser', 'Användaragent', 'Sessionscookies'],
    location: 'USA (med EU Edge)',
    region: 'eu-west-1 (Irland)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://vercel.com',
  },
  {
    name: 'Stripe Inc.',
    purpose: 'Betalningshantering',
    dataTypes: ['Faktureringsadress', 'E-post', 'Betalhistorik'],
    location: 'USA/Irland',
    region: 'EU (Irland)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://stripe.com',
  },
  {
    name: 'Resend Inc.',
    purpose: 'Transaktionella e-postmeddelanden',
    dataTypes: ['E-postadress', 'Namn', 'Meddelandeinnehåll'],
    location: 'USA',
    region: 'US (med EU-kryptering)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://resend.com',
  },
  {
    name: 'Sentry',
    purpose: 'Felrapportering och övervakning',
    dataTypes: ['Felloggar', 'Användaragent', 'IP-adress (anonymiserad)'],
    location: 'USA',
    region: 'EU (Frankfurt)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://sentry.io',
  },
  {
    name: 'PostHog',
    purpose: 'Produktanalys (opt-in)',
    dataTypes: ['Användarinteraktioner', 'Sessionsdata'],
    location: 'EU',
    region: 'EU (Frankfurt)',
    dpaStatus: 'signed',
    schrems2Compliant: true,
    website: 'https://posthog.com',
  },
]

function DPAStatusBadge({ status }: { status: Subprocessor['dpaStatus'] }) {
  const styles = {
    signed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    scc: 'bg-blue-100 text-blue-800 border-blue-200',
  }

  const labels = {
    signed: 'DPA Signerat',
    pending: 'DPA Under behandling',
    scc: 'SCC (Standardklausuler)',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function SubprocessorsPage() {
  const lastUpdated = '2025-01-13'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Underleverantörer (Subprocessors)
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Enligt GDPR Artikel 28 informerar vi om de underleverantörer som behandlar 
            personuppgifter för Lekbankens räkning.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Senast uppdaterad: {new Date(lastUpdated).toLocaleDateString('sv-SE')}
          </p>
        </div>

        {/* GDPR Compliance Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            GDPR-efterlevnad
          </h2>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Alla underleverantörer</strong> har signerat databehandlingsavtal (DPA) enligt GDPR Artikel 28
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>EU-fokus:</strong> Vi prioriterar underleverantörer med EU-baserad infrastruktur
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Schrems II:</strong> Alla USA-baserade leverantörer följer EU-kommissionens standardavtalsklausuler (SCC) 
                och har kompletterande skyddsåtgärder
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Ändringsnotis:</strong> Vi informerar avtalskunder 30 dagar innan nya underleverantörer läggs till
              </span>
            </li>
          </ul>
        </div>

        {/* Subprocessors List */}
        <div className="space-y-6">
          {subprocessors.map((sp, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <a
                        href={sp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {sp.name}
                      </a>
                    </h3>
                    <p className="text-gray-600">{sp.purpose}</p>
                  </div>
                  <div className="flex gap-2">
                    <DPAStatusBadge status={sp.dpaStatus} />
                    {sp.schrems2Compliant && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        Schrems II ✓
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500 mb-1">Behandlade datatyper</dt>
                    <dd className="text-gray-900">
                      <ul className="list-disc list-inside space-y-0.5">
                        {sp.dataTypes.map((type, i) => (
                          <li key={i}>{type}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 mb-1">Bolagsland</dt>
                    <dd className="text-gray-900">{sp.location}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 mb-1">Databehandlingsregion</dt>
                    <dd className="text-gray-900">{sp.region}</dd>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Update Subscription */}
        <div className="mt-12 bg-gray-100 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Håll dig uppdaterad
          </h2>
          <p className="text-gray-600 mb-4">
            Enterprise-kunder får automatiska notifieringar om ändringar i underleverantörslistan.
            Kontakta oss för att prenumerera på uppdateringar.
          </p>
          <a
            href="mailto:gdpr@lekbanken.se?subject=Prenumerera på underleverantörsuppdateringar"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Kontakta GDPR-ansvarig
          </a>
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Se även:{' '}
            <a href="/legal/privacy" className="text-blue-600 hover:underline">
              Integritetspolicy
            </a>
            {' · '}
            <a href="/legal/terms" className="text-blue-600 hover:underline">
              Användarvillkor
            </a>
            {' · '}
            <a href="/app/preferences/privacy" className="text-blue-600 hover:underline">
              Mina integritetsval
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
