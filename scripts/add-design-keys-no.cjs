const fs = require('fs');
const no = require('../messages/no.json');

// Expand admin.design with all keys needed (Norwegian translations)
no.admin.design = {
  ...(no.admin?.design || {}),
  // Toast messages (shared)
  toasts: {
    saving: 'Lagrer...',
    saved: 'Lagret',
    tokensSaved: 'Tokens lagret',
    typographySaved: 'Typografi lagret',
    colorsSaved: 'Farger lagret',
    uploadComplete: 'Opplasting fullført',
    imageUploaded: 'Bilde lastet opp',
    deleted: 'Slettet',
    imageDeleted: 'Bilde slettet',
    copied: 'Kopiert!',
    error: 'En feil oppstod',
    uploadFailed: 'Opplasting mislyktes',
    couldNotSave: 'Kunne ikke lagre',
    couldNotDelete: 'Kunne ikke slette'
  },
  
  // Advanced tab
  advanced: {
    title: 'Avanserte innstillinger',
    warning: 'Disse innstillingene påvirker globale design tokens. Endre med forsiktighet.',
    saveTokens: 'Lagre tokens',
    borderRadius: {
      title: 'Border Radius',
      badge: 'Tokens',
      description: 'Hjørneradius for komponenter. Bruker CSS-verdier (rem, px, etc).'
    },
    cssVariables: {
      title: 'CSS Variabler',
      badge: 'Kommer snart',
      description: 'Egne CSS-variabler for avansert tilpasning.',
      info: 'Muligheten til å definere egne CSS-variabler kommer i en fremtidig versjon.'
    },
    spacingScale: {
      title: 'Spacing Scale',
      badge: 'Kommer snart',
      description: 'Tilpasset spacing-skala for margin og padding.',
      info: 'Tilpasset spacing-skala kommer i en fremtidig versjon.'
    }
  },

  // Brand assets tab
  brand: {
    logos: {
      title: 'Logoer',
      description: 'Last opp logoer for lyst og mørkt modus. Anbefalt format: SVG eller PNG med gjennomsiktig bakgrunn.',
      light: 'Logo (lys modus)',
      lightDesc: 'Brukes på lyse bakgrunner',
      dark: 'Logo (mørk modus)',
      darkDesc: 'Brukes på mørke bakgrunner'
    },
    appIcon: {
      title: 'App-ikon',
      description: 'Brukes i navigering og som PWA-ikon. Kvadratisk format, minst 512x512 px.',
      label: 'App-ikon',
      labelDesc: 'Kvadratisk ikon for app'
    },
    favicons: {
      title: 'Favicons',
      description: 'Nettleserfaneikon. Last opp ICO, PNG eller SVG.',
      light: 'Favicon (lys)',
      lightDesc: 'For lyst tema',
      dark: 'Favicon (mørk)',
      darkDesc: 'For mørkt tema'
    },
    colors: {
      title: 'Merkevarefarger',
      description: 'Primær og sekundær farge brukes i komponenter og temaer.',
      primary: 'Primærfarge',
      secondary: 'Sekundærfarge',
      saveColors: 'Lagre farger'
    },
    assetUploader: {
      replace: 'Erstatt',
      copyUrl: 'Kopier URL',
      clickToUpload: 'Klikk for å laste opp',
      uploading: 'Laster opp...',
      fileTypes: 'PNG, JPEG, SVG, WebP (maks 5 MB)'
    }
  },

  // Typography tab
  typography: {
    fontFamily: {
      title: 'Skrifttype',
      description: 'Velg skrifttype for plattformen. Påvirker all tekst.',
      selectLabel: 'Standard skrifttype',
      selectPlaceholder: 'Velg skrifttype',
      custom: 'Egendefinert...',
      customFontFamily: 'Font family',
      customFontFamilyPlaceholder: "'Custom Font', sans-serif",
      customFontUrl: 'Font URL (Google Fonts, etc.)',
      customFontUrlPlaceholder: 'https://fonts.googleapis.com/css2?family=...',
      preview: 'Forhåndsvisning',
      previewHeading: 'Overskrifter ser slik ut',
      previewBody: 'Brødtekst med normal skrifttype. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    },
    titleFormat: {
      title: 'Overskriftformat',
      description: 'Hvordan overskrifter formateres (text-transform).',
      label: 'Format',
      normal: 'Normal',
      uppercase: 'Store bokstaver',
      capitalize: 'Stor forbokstav',
      example: 'Eksempel på overskrift'
    },
    size: {
      title: 'Størrelse',
      description: 'Basisstørrelse for skrift. Alle størrelser skaleres relativt.',
      baseSize: 'Basisstørrelse (px)'
    },
    saveTypography: 'Lagre typografi'
  },

  // Media defaults tab
  mediaDefaults: {
    noDefaultProfileImages: 'Ingen standard profilbilder lastet opp',
    noDefaultCoverImages: 'Ingen standard omslagsbilder lastet opp',
    profileImages: {
      title: 'Standard profilbilder',
      description: 'Standard profilbilder som brukere kan velge. Brukes også som fallback.'
    },
    coverImages: {
      title: 'Standard omslagsbilder',
      description: 'Standard omslagsbilder for leker og aktiviteter.'
    },
    imageAlt: 'Bilde {index}',
    addImage: 'Legg til',
    loading: 'Laster...'
  }
};

fs.writeFileSync('./messages/no.json', JSON.stringify(no, null, 2) + '\n');
console.log('no.json oppdatert med admin.design nycklar');
