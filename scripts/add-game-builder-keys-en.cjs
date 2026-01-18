/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const en = require('../messages/en.json');

// Expand admin.games.builder with all keys needed (English)
en.admin.games = en.admin.games || {};
en.admin.games.builder = {
  ...(en.admin.games.builder || {}),
  
  // Shared toasts
  toasts: {
    saving: 'Saving...',
    saved: 'Saved',
    error: 'An error occurred',
    deleted: 'Deleted',
    added: 'Added'
  },

  // Phase Editor
  phase: {
    title: 'Phases',
    addPhase: 'Add phase',
    editPhase: 'Edit phase',
    noPhases: 'No phases yet. Add your first phase.',
    namePlaceholder: 'E.g. The investigation begins',
    descriptionPlaceholder: 'What happens in this phase?',
    boardMessagePlaceholder: 'Shown on the game board',
    unnamed: 'Unnamed phase',
    types: {
      intro: 'Intro',
      round: 'Round',
      finale: 'Finale',
      break: 'Break'
    },
    timerStyles: {
      countdown: 'Countdown',
      elapsed: 'Elapsed',
      trafficlight: 'Traffic light'
    },
    fields: {
      name: 'Phase name',
      type: 'Phase type',
      description: 'Description',
      boardMessage: 'Board message',
      duration: 'Duration (minutes)',
      timerVisible: 'Show timer',
      timerStyle: 'Timer style',
      autoAdvance: 'Auto advance'
    },
    duration: '{min} min'
  },

  // Role Editor
  role: {
    title: 'Roles',
    addRole: 'Add role',
    editRole: 'Edit role',
    noRoles: 'No roles yet. Add your first role.',
    unnamed: 'Unnamed role',
    hasPrivate: 'Has private instructions',
    unlimited: 'Unlimited',
    min: 'min {count}',
    range: '{min}–{max}',
    colors: {
      red: 'Red',
      orange: 'Orange',
      yellow: 'Yellow',
      green: 'Green',
      cyan: 'Cyan',
      blue: 'Blue',
      purple: 'Purple',
      pink: 'Pink',
      gray: 'Gray'
    },
    icons: {
      mask: 'Mask',
      spy: 'Spy',
      crown: 'Crown',
      sword: 'Sword',
      shield: 'Shield',
      crystal: 'Crystal ball',
      star: 'Star',
      target: 'Target',
      idea: 'Idea',
      key: 'Key',
      circus: 'Circus tent',
      hero: 'Hero',
      wizard: 'Wizard',
      robot: 'Robot',
      person: 'Person'
    },
    strategies: {
      random: 'Random',
      leader_picks: 'Leader picks',
      player_picks: 'Player picks'
    },
    fields: {
      name: 'Role name',
      icon: 'Icon',
      color: 'Color',
      publicDescription: 'Public description',
      privateInstructions: 'Private instructions',
      privateHints: 'Private hints',
      minCount: 'Min count',
      maxCount: 'Max count',
      strategy: 'Assignment strategy'
    }
  },

  // Board Editor
  board: {
    title: 'Game board',
    preview: 'Preview',
    themes: {
      mystery: 'Mystery',
      party: 'Party',
      sport: 'Sport',
      nature: 'Nature',
      neutral: 'Neutral'
    },
    layouts: {
      standard: 'Standard',
      fullscreen: 'Fullscreen'
    },
    toggles: {
      showGameName: 'Show game name',
      showCurrentPhase: 'Show current phase',
      showTimer: 'Show timer',
      showParticipants: 'Show participants',
      showPublicRoles: 'Show public roles',
      showLeaderboard: 'Show leaderboard',
      showQrCode: 'Show QR code'
    },
    fields: {
      welcomeMessage: 'Welcome message',
      theme: 'Theme',
      backgroundColor: 'Background color',
      layout: 'Layout'
    },
    previewLabels: {
      phase: 'Phase',
      timeLeft: 'Time left',
      gameName: 'Game name'
    }
  },

  // Step Editor
  step: {
    title: 'Steps',
    addStep: 'Add step',
    editStep: 'Edit step',
    noSteps: 'No steps yet. Add your first step.',
    unnamed: 'Unnamed step',
    displayModes: {
      instant: 'Instant',
      typewriter: 'Typewriter',
      dramatic: 'Dramatic'
    },
    fields: {
      title: 'Title',
      body: 'Description',
      duration: 'Duration (minutes)',
      leaderScript: '💬 Leader script (optional)',
      displayMode: 'Display mode',
      media: 'Media'
    },
    placeholders: {
      title: 'E.g. Gather the group',
      body: 'What should participants do in this step?'
    }
  },

  // Artifact Wizard
  wizard: {
    title: 'Add artifact',
    selectTemplate: 'Select template',
    customize: 'Customize',
    close: 'Close',
    create: 'Create',
    back: 'Back',
    next: 'Next',
    cancel: 'Cancel',
    categories: {
      escape_room: 'Escape Room',
      party: 'Party game',
      educational: 'Educational',
      general: 'General'
    },
    templates: {
      keypadBasic: {
        name: 'Keypad (4 digits)',
        description: 'A simple 4-digit PIN code to unlock something'
      },
      keypadAdvanced: {
        name: 'Keypad (with attempt limit)',
        description: 'PIN code with max 3 attempts before lock'
      },
      riddle: {
        name: 'Riddle / Question',
        description: 'A riddle with text input for answer'
      },
      cipher: {
        name: 'Caesar cipher',
        description: 'Encrypted message with letter shift'
      },
      hotspot: {
        name: 'Clickable image',
        description: 'Image with hidden zones to find'
      },
      tilePuzzle: {
        name: 'Tile puzzle (3x3)',
        description: 'Sliding tile puzzle to reveal an image'
      },
      logicGrid: {
        name: 'Logic grid',
        description: 'Logic puzzle where things need to be matched'
      },
      counter: {
        name: 'Clue counter',
        description: 'Count found clues or progress'
      },
      hints: {
        name: 'Hint container',
        description: 'Progressive hints that can be revealed'
      },
      qrGate: {
        name: 'QR code checkpoint',
        description: 'Scan QR code to continue'
      },
      location: {
        name: 'Location checkpoint',
        description: 'GPS verification for city games'
      },
      clueCard: {
        name: 'Clue/Hint',
        description: 'A card with a clue that can be revealed'
      },
      secretDocument: {
        name: 'Secret document',
        description: 'A document revealed at the right moment'
      },
      revealCard: {
        name: 'Reveal card',
        description: 'A card for dramatic reveals'
      },
      roleSecret: {
        name: 'Role secret',
        description: 'Secret information visible only to one role'
      }
    }
  }
};

fs.writeFileSync('./messages/en.json', JSON.stringify(en, null, 2) + '\n');
console.log('en.json updated with admin.games.builder keys');
