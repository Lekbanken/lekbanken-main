import type { LegalDocType, LegalLocale } from './types'

export const LEGAL_DOC_LABELS: Record<LegalDocType, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  org_terms: 'Organization Terms',
  dpa: 'Data Processing Agreement',
  cookie_policy: 'Cookie Policy',
}

export const LEGAL_LOCALE_LABELS: Record<LegalLocale, string> = {
  sv: 'Swedish',
  no: 'Norwegian',
  en: 'English',
}

export const LEGAL_DOC_PUBLIC_ROUTES: Partial<Record<LegalDocType, string>> = {
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  cookie_policy: '/legal/cookie-policy',
  org_terms: '/legal/org-terms',
  dpa: '/legal/dpa',
}
