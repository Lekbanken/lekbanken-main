/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const sv = require('../messages/sv.json');

// Expand admin.design with all keys needed
sv.admin.design = {
  ...sv.admin.design,
  // Toast messages (shared)
  toasts: {
    saving: 'Sparar...',
    saved: 'Sparad',
    tokensSaved: 'Tokens sparade',
    typographySaved: 'Typografi sparad',
    colorsSaved: 'Färger sparade',
    uploadComplete: 'Uppladdning klar',
    imageUploaded: 'Bild uppladdad',
    deleted: 'Borttagen',
    imageDeleted: 'Bild borttagen',
    copied: 'Kopierad!',
    error: 'Ett fel uppstod',
    uploadFailed: 'Uppladdning misslyckades',
    couldNotSave: 'Kunde inte spara',
    couldNotDelete: 'Kunde inte ta bort'
  },
  
  // Advanced tab
  advanced: {
    title: 'Avancerade inställningar',
    warning: 'Dessa inställningar påverkar globala design tokens. Ändra med försiktighet.',
    saveTokens: 'Spara tokens',
    borderRadius: {
      title: 'Border Radius',
      badge: 'Tokens',
      description: 'Hörnradie för komponenter. Använder CSS-värden (rem, px, etc).'
    },
    cssVariables: {
      title: 'CSS Variabler',
      badge: 'Kommande',
      description: 'Egna CSS-variabler för avancerad anpassning.',
      info: 'Möjligheten att definiera egna CSS-variabler kommer i en framtida version.'
    },
    spacingScale: {
      title: 'Spacing Scale',
      badge: 'Kommande',
      description: 'Anpassad spacing-skala för margin och padding.',
      info: 'Anpassad spacing-skala kommer i en framtida version.'
    }
  },

  // Brand assets tab
  brand: {
    logos: {
      title: 'Logotyper',
      description: 'Ladda upp logotyper för ljust och mörkt läge. Rekommenderat format: SVG eller PNG med transparent bakgrund.',
      light: 'Logotyp (ljust läge)',
      lightDesc: 'Används på ljusa bakgrunder',
      dark: 'Logotyp (mörkt läge)',
      darkDesc: 'Används på mörka bakgrunder'
    },
    appIcon: {
      title: 'App-ikon',
      description: 'Används i navigering och som PWA-ikon. Kvadratiskt format, minst 512x512 px.',
      label: 'App-ikon',
      labelDesc: 'Kvadratisk ikon för app'
    },
    favicons: {
      title: 'Favicons',
      description: 'Webbläsarflikikon. Ladda upp ICO, PNG eller SVG.',
      light: 'Favicon (ljust)',
      lightDesc: 'För ljust tema',
      dark: 'Favicon (mörkt)',
      darkDesc: 'För mörkt tema'
    },
    colors: {
      title: 'Varumärkesfärger',
      description: 'Primär och sekundär färg används i komponenter och teman.',
      primary: 'Primär färg',
      secondary: 'Sekundär färg',
      saveColors: 'Spara färger'
    },
    assetUploader: {
      replace: 'Ersätt',
      copyUrl: 'Kopiera URL',
      clickToUpload: 'Klicka för att ladda upp',
      uploading: 'Laddar upp...',
      fileTypes: 'PNG, JPEG, SVG, WebP (max 5 MB)'
    }
  },

  // Typography tab
  typography: {
    fontFamily: {
      title: 'Typsnitt',
      description: 'Välj typsnitt för plattformen. Påverkar all text.',
      selectLabel: 'Förvalt typsnitt',
      selectPlaceholder: 'Välj typsnitt',
      custom: 'Custom...',
      customFontFamily: 'Font family',
      customFontFamilyPlaceholder: "'Custom Font', sans-serif",
      customFontUrl: 'Font URL (Google Fonts, etc.)',
      customFontUrlPlaceholder: 'https://fonts.googleapis.com/css2?family=...',
      preview: 'Förhandsvisning',
      previewHeading: 'Rubriker ser ut så här',
      previewBody: 'Brödtext med normalt typsnitt. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    },
    titleFormat: {
      title: 'Rubrikformat',
      description: 'Hur rubriker formateras (text-transform).',
      label: 'Format',
      normal: 'Normal',
      uppercase: 'Stora bokstäver',
      capitalize: 'Initial versal',
      example: 'Exempel på rubrik'
    },
    size: {
      title: 'Storlek',
      description: 'Basstorlek för typsnitt. Alla storlekar skalas relativt.',
      baseSize: 'Basstorlek (px)'
    },
    saveTypography: 'Spara typografi'
  },

  // Media defaults tab (expand existing)
  mediaDefaults: {
    ...sv.admin.design.mediaDefaults,
    profileImages: {
      title: 'Standard profilbilder',
      description: 'Förvalda profilbilder som användare kan välja. Används också som fallback.'
    },
    coverImages: {
      title: 'Standard omslagsbilder',
      description: 'Förvalda omslagsbilder för lekar och aktiviteter.'
    },
    imageAlt: 'Bild {index}',
    addImage: 'Lägg till',
    loading: 'Laddar...'
  }
};

fs.writeFileSync('./messages/sv.json', JSON.stringify(sv, null, 2) + '\n');
console.log('sv.json uppdaterad med admin.design nycklar');
