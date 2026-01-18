/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const sv = require('../messages/sv.json');

// Expand admin.games.builder with all keys needed
sv.admin.games = sv.admin.games || {};
sv.admin.games.builder = {
  ...(sv.admin.games.builder || {}),
  
  // Shared toasts
  toasts: {
    saving: 'Sparar...',
    saved: 'Sparad',
    error: 'Ett fel uppstod',
    deleted: 'Borttagen',
    added: 'Tillagd'
  },

  // Phase Editor
  phase: {
    title: 'Faser',
    addPhase: 'Lägg till fas',
    editPhase: 'Redigera fas',
    noPhases: 'Inga faser ännu. Lägg till din första fas.',
    namePlaceholder: 'Ex. Utredningen börjar',
    descriptionPlaceholder: 'Vad händer i denna fas?',
    boardMessagePlaceholder: 'Visas på spelskärmen',
    unnamed: 'Namnlös fas',
    types: {
      intro: 'Intro',
      round: 'Runda',
      finale: 'Final',
      break: 'Paus'
    },
    timerStyles: {
      countdown: 'Nedräkning',
      elapsed: 'Uppåträkning',
      trafficlight: 'Trafikljus'
    },
    fields: {
      name: 'Fasnamn',
      type: 'Fastyp',
      description: 'Beskrivning',
      boardMessage: 'Board-meddelande',
      duration: 'Varaktighet (minuter)',
      timerVisible: 'Visa timer',
      timerStyle: 'Timer-stil',
      autoAdvance: 'Automatisk övergång'
    },
    duration: '{min} min'
  },

  // Role Editor
  role: {
    title: 'Roller',
    addRole: 'Lägg till roll',
    editRole: 'Redigera roll',
    noRoles: 'Inga roller ännu. Lägg till din första roll.',
    unnamed: 'Namnlös roll',
    hasPrivate: 'Har hemliga instruktioner',
    unlimited: 'Obegränsad',
    min: 'min {count}',
    range: '{min}–{max}',
    colors: {
      red: 'Röd',
      orange: 'Orange',
      yellow: 'Gul',
      green: 'Grön',
      cyan: 'Cyan',
      blue: 'Blå',
      purple: 'Lila',
      pink: 'Rosa',
      gray: 'Grå'
    },
    icons: {
      mask: 'Mask',
      spy: 'Spion',
      crown: 'Krona',
      sword: 'Svärd',
      shield: 'Sköld',
      crystal: 'Kristallkula',
      star: 'Stjärna',
      target: 'Mål',
      idea: 'Idé',
      key: 'Nyckel',
      circus: 'Cirkustält',
      hero: 'Hjälte',
      wizard: 'Trollkarl',
      robot: 'Robot',
      person: 'Person'
    },
    strategies: {
      random: 'Slumpmässig',
      leader_picks: 'Ledaren väljer',
      player_picks: 'Spelare väljer'
    },
    fields: {
      name: 'Rollnamn',
      icon: 'Ikon',
      color: 'Färg',
      publicDescription: 'Publik beskrivning',
      privateInstructions: 'Hemliga instruktioner',
      privateHints: 'Hemliga tips',
      minCount: 'Min antal',
      maxCount: 'Max antal',
      strategy: 'Tilldelningsstrategi'
    }
  },

  // Board Editor
  board: {
    title: 'Spelskärm',
    preview: 'Förhandsvisning',
    themes: {
      mystery: 'Mysterium',
      party: 'Fest',
      sport: 'Sport',
      nature: 'Natur',
      neutral: 'Neutral'
    },
    layouts: {
      standard: 'Standard',
      fullscreen: 'Fullscreen'
    },
    toggles: {
      showGameName: 'Visa spelnamn',
      showCurrentPhase: 'Visa aktuell fas',
      showTimer: 'Visa timer',
      showParticipants: 'Visa deltagare',
      showPublicRoles: 'Visa publika roller',
      showLeaderboard: 'Visa resultattavla',
      showQrCode: 'Visa QR-kod'
    },
    fields: {
      welcomeMessage: 'Välkomstmeddelande',
      theme: 'Tema',
      backgroundColor: 'Bakgrundsfärg',
      layout: 'Layout'
    },
    previewLabels: {
      phase: 'Fas',
      timeLeft: 'Tid kvar',
      gameName: 'Spelnamn'
    }
  },

  // Step Editor
  step: {
    title: 'Steg',
    addStep: 'Lägg till steg',
    editStep: 'Redigera steg',
    noSteps: 'Inga steg ännu. Lägg till ditt första steg.',
    unnamed: 'Namnlöst steg',
    displayModes: {
      instant: 'Omedelbar',
      typewriter: 'Skrivmaskin',
      dramatic: 'Dramatisk'
    },
    fields: {
      title: 'Rubrik',
      body: 'Beskrivning',
      duration: 'Varaktighet (minuter)',
      leaderScript: '💬 Ledarskript (valfritt)',
      displayMode: 'Visningsläge',
      media: 'Media'
    },
    placeholders: {
      title: 'Ex. Samla gruppen',
      body: 'Vad ska deltagarna göra i detta steg?'
    }
  },

  // Artifact Wizard
  wizard: {
    title: 'Lägg till artefakt',
    selectTemplate: 'Välj mall',
    customize: 'Anpassa',
    close: 'Stäng',
    create: 'Skapa',
    back: 'Tillbaka',
    next: 'Nästa',
    cancel: 'Avbryt',
    categories: {
      escape_room: 'Escape Room',
      party: 'Festspel',
      educational: 'Pedagogiskt',
      general: 'Allmänt'
    },
    templates: {
      keypadBasic: {
        name: 'Keypad (4 siffror)',
        description: 'En enkel 4-siffrig pinkod för att låsa upp något'
      },
      keypadAdvanced: {
        name: 'Keypad (med försöksbegränsning)',
        description: 'Pinkod med max 3 försök innan låsning'
      },
      riddle: {
        name: 'Gåta / Fråga',
        description: 'En gåta med textinmatning för svar'
      },
      cipher: {
        name: 'Caesar-chiffer',
        description: 'Krypterat meddelande med bokstavsförskjutning'
      },
      hotspot: {
        name: 'Klickbar bild',
        description: 'Bild med dolda zoner att hitta'
      },
      tilePuzzle: {
        name: 'Pusselspel (3x3)',
        description: 'Sliding tile puzzle för att avslöja en bild'
      },
      logicGrid: {
        name: 'Logikrutnät',
        description: 'Logikpussel där saker ska matchas'
      },
      counter: {
        name: 'Ledtrådsräknare',
        description: 'Räkna hittade ledtrådar eller framsteg'
      },
      hints: {
        name: 'Tips-behållare',
        description: 'Progressiva tips som kan avslöjas'
      },
      qrGate: {
        name: 'QR-kod checkpoint',
        description: 'Skanna QR-kod för att fortsätta'
      },
      location: {
        name: 'Plats-checkpoint',
        description: 'GPS-verifiering för stadsspel'
      },
      clueCard: {
        name: 'Ledtråd/Hint',
        description: 'Ett kort med en ledtråd som kan avslöjas'
      },
      secretDocument: {
        name: 'Hemligt dokument',
        description: 'Ett dokument som avslöjas vid rätt tidpunkt'
      },
      revealCard: {
        name: 'Avslöjande kort',
        description: 'Ett kort för dramatiska avslöjanden'
      },
      roleSecret: {
        name: 'Rollhemlighet',
        description: 'Hemlig information synlig endast för en roll'
      }
    }
  }
};

fs.writeFileSync('./messages/sv.json', JSON.stringify(sv, null, 2) + '\n');
console.log('sv.json uppdaterad med admin.games.builder nycklar');
