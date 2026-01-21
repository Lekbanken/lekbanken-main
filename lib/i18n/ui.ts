import type { LanguageCode } from '@/lib/context/PreferencesContext'

export type MarketingCopy = {
  nav: {
    features: string
    howItWorks: string
    pricing: string
    customers: string
  }
  actions: {
    login: string
    signup: string
    goToApp: string
    goToAdmin: string
    goToMarketing: string
  }
}

export type AuthCopy = {
  loginTitle: string
  loginDescription: string
  email: string
  password: string
  loginAction: string
  googleAction: string
  signupPrompt: string
  signupAction: string
  signupTitle: string
  creatingAccount: string
  orgCreationNoticePrefix: string
  orgCreationNoticeLinkText: string
  orgCreationNoticeSuffix: string
  passwordResetTitle: string
  passwordResetDescription: string
  passwordResetAction: string
  forgotPassword: string
  backToLogin: string
}

const uiCopy: Record<LanguageCode, { marketing: MarketingCopy; auth: AuthCopy }> = {
  NO: {
    marketing: {
      nav: {
        features: 'Funksjoner',
        howItWorks: 'Slik fungerer det',
        pricing: 'Priser',
        customers: 'Kunder',
      },
      actions: {
        login: 'Logg inn',
        signup: 'Prøv gratis',
        goToApp: 'Gå til appen',
        goToAdmin: 'Gå til admin',
        goToMarketing: 'Gå til markedsplassen',
      },
    },
    auth: {
      loginTitle: 'Logg inn i Lekbanken',
      loginDescription: 'Fortsett der du slapp.',
      email: 'E-postadresse',
      password: 'Passord',
      loginAction: 'Logg inn',
      googleAction: 'Logg inn med Google',
      signupPrompt: 'Har du ikke konto?',
      signupAction: 'Opprett konto',
      signupTitle: 'Opprett konto',
      creatingAccount: 'Oppretter konto...',
      orgCreationNoticePrefix: 'Organisasjoner opprettes etter gjennomført kjøp (Stripe-bekreftelse). Se',
      orgCreationNoticeLinkText: 'priser',
      orgCreationNoticeSuffix: 'for å kjøpe en lisens.',
      passwordResetTitle: 'Tilbakestill passord',
      passwordResetDescription: 'Skriv inn e-posten din så sender vi en lenke.',
      passwordResetAction: 'Send lenke',
      forgotPassword: 'Glemt passord?',
      backToLogin: 'Tilbake til innlogging',
    },
  },
  SE: {
    marketing: {
      nav: {
        features: 'Funktioner',
        howItWorks: 'Så funkar det',
        pricing: 'Priser',
        customers: 'Kunder',
      },
      actions: {
        login: 'Logga in',
        signup: 'Prova gratis',
        goToApp: 'Gå till appen',
        goToAdmin: 'Gå till admin',
        goToMarketing: 'Gå till startsidan',
      },
    },
    auth: {
      loginTitle: 'Logga in i Lekbanken',
      loginDescription: 'Fortsätt där du slutade.',
      email: 'E-postadress',
      password: 'Lösenord',
      loginAction: 'Logga in',
      googleAction: 'Logga in med Google',
      signupPrompt: 'Har du inget konto?',
      signupAction: 'Skapa konto',
      signupTitle: 'Skapa konto',
      creatingAccount: 'Skapar konto...',
      orgCreationNoticePrefix: 'Organisationer skapas efter genomfört köp (Stripe-bekräftelse). Se',
      orgCreationNoticeLinkText: 'priser',
      orgCreationNoticeSuffix: 'för att köpa en licens.',
      passwordResetTitle: 'Återställ lösenord',
      passwordResetDescription: 'Ange din e-post så skickar vi en länk.',
      passwordResetAction: 'Skicka länk',
      forgotPassword: 'Glömt lösenord?',
      backToLogin: 'Tillbaka till inloggning',
    },
  },
  EN: {
    marketing: {
      nav: {
        features: 'Features',
        howItWorks: 'How it works',
        pricing: 'Pricing',
        customers: 'Customers',
      },
      actions: {
        login: 'Log in',
        signup: 'Try for free',
        goToApp: 'Go to app',
        goToAdmin: 'Go to admin',
        goToMarketing: 'Go to marketing site',
      },
    },
    auth: {
      loginTitle: 'Sign in to Lekbanken',
      loginDescription: 'Pick up where you left off.',
      email: 'Email address',
      password: 'Password',
      loginAction: 'Sign in',
      googleAction: 'Continue with Google',
      signupPrompt: 'No account yet?',
      signupAction: 'Create account',
      signupTitle: 'Create account',
      creatingAccount: 'Creating account...',
      orgCreationNoticePrefix: 'Organizations are created after a completed purchase (Stripe confirmation). See',
      orgCreationNoticeLinkText: 'pricing',
      orgCreationNoticeSuffix: 'to buy a license.',
      passwordResetTitle: 'Reset password',
      passwordResetDescription: 'Enter your email and we will send you a link.',
      passwordResetAction: 'Send reset link',
      forgotPassword: 'Forgot password?',
      backToLogin: 'Back to login',
    },
  },
}

export function getUiCopy(lang: LanguageCode) {
  return uiCopy[lang] ?? uiCopy.EN
}
