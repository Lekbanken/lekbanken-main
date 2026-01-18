/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const en = require('../messages/en.json');

// Expand admin.design with all keys needed (English translations)
en.admin.design = {
  ...(en.admin?.design || {}),
  // Toast messages (shared)
  toasts: {
    saving: 'Saving...',
    saved: 'Saved',
    tokensSaved: 'Tokens saved',
    typographySaved: 'Typography saved',
    colorsSaved: 'Colors saved',
    uploadComplete: 'Upload complete',
    imageUploaded: 'Image uploaded',
    deleted: 'Deleted',
    imageDeleted: 'Image deleted',
    copied: 'Copied!',
    error: 'An error occurred',
    uploadFailed: 'Upload failed',
    couldNotSave: 'Could not save',
    couldNotDelete: 'Could not delete'
  },
  
  // Advanced tab
  advanced: {
    title: 'Advanced settings',
    warning: 'These settings affect global design tokens. Change with caution.',
    saveTokens: 'Save tokens',
    borderRadius: {
      title: 'Border Radius',
      badge: 'Tokens',
      description: 'Corner radius for components. Uses CSS values (rem, px, etc).'
    },
    cssVariables: {
      title: 'CSS Variables',
      badge: 'Coming soon',
      description: 'Custom CSS variables for advanced customization.',
      info: 'The ability to define custom CSS variables is coming in a future version.'
    },
    spacingScale: {
      title: 'Spacing Scale',
      badge: 'Coming soon',
      description: 'Custom spacing scale for margin and padding.',
      info: 'Custom spacing scale is coming in a future version.'
    }
  },

  // Brand assets tab
  brand: {
    logos: {
      title: 'Logos',
      description: 'Upload logos for light and dark mode. Recommended format: SVG or PNG with transparent background.',
      light: 'Logo (light mode)',
      lightDesc: 'Used on light backgrounds',
      dark: 'Logo (dark mode)',
      darkDesc: 'Used on dark backgrounds'
    },
    appIcon: {
      title: 'App icon',
      description: 'Used in navigation and as PWA icon. Square format, at least 512x512 px.',
      label: 'App icon',
      labelDesc: 'Square icon for app'
    },
    favicons: {
      title: 'Favicons',
      description: 'Browser tab icon. Upload ICO, PNG or SVG.',
      light: 'Favicon (light)',
      lightDesc: 'For light theme',
      dark: 'Favicon (dark)',
      darkDesc: 'For dark theme'
    },
    colors: {
      title: 'Brand colors',
      description: 'Primary and secondary colors used in components and themes.',
      primary: 'Primary color',
      secondary: 'Secondary color',
      saveColors: 'Save colors'
    },
    assetUploader: {
      replace: 'Replace',
      copyUrl: 'Copy URL',
      clickToUpload: 'Click to upload',
      uploading: 'Uploading...',
      fileTypes: 'PNG, JPEG, SVG, WebP (max 5 MB)'
    }
  },

  // Typography tab
  typography: {
    fontFamily: {
      title: 'Font family',
      description: 'Choose font for the platform. Affects all text.',
      selectLabel: 'Default font',
      selectPlaceholder: 'Choose font',
      custom: 'Custom...',
      customFontFamily: 'Font family',
      customFontFamilyPlaceholder: "'Custom Font', sans-serif",
      customFontUrl: 'Font URL (Google Fonts, etc.)',
      customFontUrlPlaceholder: 'https://fonts.googleapis.com/css2?family=...',
      preview: 'Preview',
      previewHeading: 'Headings look like this',
      previewBody: 'Body text with normal font. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    },
    titleFormat: {
      title: 'Heading format',
      description: 'How headings are formatted (text-transform).',
      label: 'Format',
      normal: 'Normal',
      uppercase: 'Uppercase',
      capitalize: 'Capitalize',
      example: 'Example heading'
    },
    size: {
      title: 'Size',
      description: 'Base font size. All sizes scale relatively.',
      baseSize: 'Base size (px)'
    },
    saveTypography: 'Save typography'
  },

  // Media defaults tab
  mediaDefaults: {
    noDefaultProfileImages: 'No default profile images uploaded',
    noDefaultCoverImages: 'No default cover images uploaded',
    profileImages: {
      title: 'Default profile images',
      description: 'Default profile images that users can choose. Also used as fallback.'
    },
    coverImages: {
      title: 'Default cover images',
      description: 'Default cover images for games and activities.'
    },
    imageAlt: 'Image {index}',
    addImage: 'Add',
    loading: 'Loading...'
  }
};

fs.writeFileSync('./messages/en.json', JSON.stringify(en, null, 2) + '\n');
console.log('en.json uppdaterad med admin.design nycklar');
