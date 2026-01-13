/**
 * GDPR Data Registry
 *
 * Documents all personal data categories collected by Lekbanken
 * as required by GDPR Article 30 (Records of Processing Activities)
 *
 * @module lib/gdpr/data-registry
 */

// =============================================================================
// Types
// =============================================================================

export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'
  | 'legitimate_interest'

export type DataCategory = {
  id: string
  name: string
  description: string
  personalData: boolean
  specialCategory: boolean // GDPR Article 9
  legalBasis: LegalBasis
  purposes: string[]
  retention: {
    duration: string
    rationale: string
  }
  recipients: string[]
  transfers: {
    destination: string
    safeguards: string
  }[]
  dataSubjects: string[]
  source: 'user_provided' | 'automatically_collected' | 'third_party'
}

// =============================================================================
// Data Registry
// =============================================================================

export const DATA_REGISTRY: DataCategory[] = [
  // ===========================
  // User Profile Data
  // ===========================
  {
    id: 'user_profile',
    name: 'Användarprofil',
    description: 'Grundläggande kontoinformation som namn, e-post och profilbild',
    personalData: true,
    specialCategory: false,
    legalBasis: 'contract',
    purposes: ['account_management', 'service_delivery', 'communication'],
    retention: {
      duration: 'Active account + 2 years',
      rationale: 'Kontraktsenlig skyldighet plus rimlig tid för kundtjänst',
    },
    recipients: ['Lekbanken', 'Email provider (Resend)'],
    transfers: [],
    dataSubjects: ['users', 'administrators'],
    source: 'user_provided',
  },

  // ===========================
  // Authentication Data
  // ===========================
  {
    id: 'auth_data',
    name: 'Autentiseringsdata',
    description: 'Lösenordshash, MFA-faktorer, sessionsdata',
    personalData: true,
    specialCategory: false,
    legalBasis: 'contract',
    purposes: ['authentication', 'security', 'fraud_prevention'],
    retention: {
      duration: 'Active account + 90 days',
      rationale: 'Säkerhet och spårbarhet vid incidenter',
    },
    recipients: ['Lekbanken', 'Supabase Auth'],
    transfers: [],
    dataSubjects: ['users'],
    source: 'user_provided',
  },

  // ===========================
  // Tenant Membership
  // ===========================
  {
    id: 'tenant_membership',
    name: 'Organisationsmedlemskap',
    description: 'Vilka organisationer användaren tillhör och med vilken roll',
    personalData: true,
    specialCategory: false,
    legalBasis: 'contract',
    purposes: ['service_delivery', 'access_control'],
    retention: {
      duration: 'Active membership + 1 year',
      rationale: 'Historik för support och revision',
    },
    recipients: ['Lekbanken', 'Organization admins'],
    transfers: [],
    dataSubjects: ['users', 'organization_members'],
    source: 'user_provided',
  },

  // ===========================
  // Activity Data
  // ===========================
  {
    id: 'activity_data',
    name: 'Aktivitetsdata',
    description: 'Användning av plattformen, genomförda aktiviteter, poäng',
    personalData: true,
    specialCategory: false,
    legalBasis: 'contract',
    purposes: ['service_delivery', 'progress_tracking', 'gamification'],
    retention: {
      duration: '2 years',
      rationale: 'Historik för användaren och organisationen',
    },
    recipients: ['Lekbanken', 'Organization admins', 'Coaches'],
    transfers: [],
    dataSubjects: ['participants', 'users'],
    source: 'automatically_collected',
  },

  // ===========================
  // Child/Youth Data
  // ===========================
  {
    id: 'child_data',
    name: 'Barn- och ungdomsdata',
    description: 'Personuppgifter för deltagare under 18 år',
    personalData: true,
    specialCategory: false, // But requires parental consent
    legalBasis: 'consent', // Parental consent required
    purposes: ['activity_tracking', 'progress_monitoring', 'safety'],
    retention: {
      duration: 'Until parental withdrawal or age 18',
      rationale: 'Föräldrasamtycke styr lagringstid',
    },
    recipients: ['Lekbanken', 'Organization admins', 'Coaches', 'Parents'],
    transfers: [],
    dataSubjects: ['children', 'minors'],
    source: 'user_provided',
  },

  // ===========================
  // Religious Affiliation (Special Category)
  // ===========================
  {
    id: 'religious_affiliation',
    name: 'Religiös tillhörighet',
    description: 'Församlingstillhörighet och religiösa preferenser',
    personalData: true,
    specialCategory: true, // GDPR Article 9
    legalBasis: 'consent', // Explicit consent required
    purposes: ['organization_membership', 'relevant_content'],
    retention: {
      duration: 'Until consent withdrawal',
      rationale: 'Känslig personuppgift - minimeras och raderas vid återkallande',
    },
    recipients: ['Lekbanken', 'Organization admins'],
    transfers: [],
    dataSubjects: ['organization_members'],
    source: 'user_provided',
  },

  // ===========================
  // Payment Data
  // ===========================
  {
    id: 'payment_data',
    name: 'Betalningsdata',
    description: 'Faktureringsuppgifter, betalningshistorik, Stripe customer ID',
    personalData: true,
    specialCategory: false,
    legalBasis: 'contract',
    purposes: ['payment_processing', 'billing', 'accounting'],
    retention: {
      duration: '7 years',
      rationale: 'Bokföringslagen kräver 7 års arkivering',
    },
    recipients: ['Lekbanken', 'Stripe'],
    transfers: [
      {
        destination: 'Stripe (EU - Ireland)',
        safeguards: 'Standard Contractual Clauses (SCC)',
      },
    ],
    dataSubjects: ['paying_customers', 'organization_owners'],
    source: 'user_provided',
  },

  // ===========================
  // Consent Records
  // ===========================
  {
    id: 'consent_records',
    name: 'Samtyckesregister',
    description: 'Dokumentation av givna och återkallade samtycken',
    personalData: true,
    specialCategory: false,
    legalBasis: 'legal_obligation',
    purposes: ['gdpr_compliance', 'accountability'],
    retention: {
      duration: '7 years',
      rationale: 'Bevisning av samtycke enligt GDPR',
    },
    recipients: ['Lekbanken'],
    transfers: [],
    dataSubjects: ['all_users'],
    source: 'automatically_collected',
  },

  // ===========================
  // Technical/Device Data
  // ===========================
  {
    id: 'device_data',
    name: 'Enhets- och teknisk data',
    description: 'IP-adress, webbläsare, enhet, sessionsdata',
    personalData: true,
    specialCategory: false,
    legalBasis: 'legitimate_interest',
    purposes: ['security', 'debugging', 'service_improvement'],
    retention: {
      duration: '90 days',
      rationale: 'Säkerhetsincidenter och felsökning',
    },
    recipients: ['Lekbanken', 'Vercel', 'Supabase'],
    transfers: [],
    dataSubjects: ['all_users'],
    source: 'automatically_collected',
  },

  // ===========================
  // Audit Logs
  // ===========================
  {
    id: 'audit_logs',
    name: 'Revisionsloggar',
    description: 'Loggning av administrativa åtgärder och säkerhetshändelser',
    personalData: true,
    specialCategory: false,
    legalBasis: 'legitimate_interest',
    purposes: ['security', 'compliance', 'accountability'],
    retention: {
      duration: '7 years',
      rationale: 'Revisionskrav och säkerhet',
    },
    recipients: ['Lekbanken', 'System admins'],
    transfers: [],
    dataSubjects: ['administrators', 'all_users'],
    source: 'automatically_collected',
  },

  // ===========================
  // Cookie/Analytics Data
  // ===========================
  {
    id: 'analytics_data',
    name: 'Analys- och cookiedata',
    description: 'Användningsstatistik och preferenser',
    personalData: true,
    specialCategory: false,
    legalBasis: 'consent',
    purposes: ['analytics', 'service_improvement'],
    retention: {
      duration: '2 years',
      rationale: 'Aggregerad statistik för produktutveckling',
    },
    recipients: ['Lekbanken'],
    transfers: [],
    dataSubjects: ['all_users'],
    source: 'automatically_collected',
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all special category data types
 */
export function getSpecialCategoryData(): DataCategory[] {
  return DATA_REGISTRY.filter((c) => c.specialCategory)
}

/**
 * Get data categories requiring consent
 */
export function getConsentRequiredData(): DataCategory[] {
  return DATA_REGISTRY.filter((c) => c.legalBasis === 'consent')
}

/**
 * Get data category by ID
 */
export function getDataCategory(id: string): DataCategory | undefined {
  return DATA_REGISTRY.find((c) => c.id === id)
}

/**
 * Get data categories by purpose
 */
export function getDataByPurpose(purpose: string): DataCategory[] {
  return DATA_REGISTRY.filter((c) => c.purposes.includes(purpose))
}

/**
 * Generate GDPR Article 30 record (Records of Processing Activities)
 */
export function generateProcessingRecord(): {
  controllerName: string
  controllerContact: string
  dpoContact: string
  processingActivities: Array<{
    category: string
    purposes: string[]
    dataSubjects: string[]
    recipients: string[]
    transfers: string[]
    retention: string
  }>
} {
  return {
    controllerName: 'Lekbanken AS',
    controllerContact: 'privacy@lekbanken.no',
    dpoContact: 'dpo@lekbanken.no',
    processingActivities: DATA_REGISTRY.map((c) => ({
      category: c.name,
      purposes: c.purposes,
      dataSubjects: c.dataSubjects,
      recipients: c.recipients,
      transfers: c.transfers.map((t) => `${t.destination} (${t.safeguards})`),
      retention: c.retention.duration,
    })),
  }
}
