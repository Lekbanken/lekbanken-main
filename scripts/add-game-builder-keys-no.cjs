/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const no = require('../messages/no.json');

// Expand admin.games.builder with all keys needed (Norwegian)
no.admin.games = no.admin.games || {};
no.admin.games.builder = {
  ...(no.admin.games.builder || {}),
  
  // Shared toasts
  toasts: {
    saving: 'Lagrer...',
    saved: 'Lagret',
    error: 'En feil oppstod',
    deleted: 'Slettet',
    added: 'Lagt til'
  },

  // Phase Editor
  phase: {
    title: 'Faser',
    addPhase: 'Legg til fase',
    editPhase: 'Rediger fase',
    noPhases: 'Ingen faser ennå. Legg til din første fase.',
    namePlaceholder: 'F.eks. Etterforskningen begynner',
    descriptionPlaceholder: 'Hva skjer i denne fasen?',
    boardMessagePlaceholder: 'Vises på spillskjermen',
    unnamed: 'Navnløs fase',
    types: {
      intro: 'Intro',
      round: 'Runde',
      finale: 'Finale',
      break: 'Pause'
    },
    timerStyles: {
      countdown: 'Nedtelling',
      elapsed: 'Oppover',
      trafficlight: 'Trafikklys'
    },
    fields: {
      name: 'Fasenavn',
      type: 'Fasetype',
      description: 'Beskrivelse',
      boardMessage: 'Board-melding',
      duration: 'Varighet (minutter)',
      timerVisible: 'Vis timer',
      timerStyle: 'Timer-stil',
      autoAdvance: 'Automatisk overgang'
    },
    duration: '{min} min'
  },

  // Role Editor
  role: {
    title: 'Roller',
    addRole: 'Legg til rolle',
    editRole: 'Rediger rolle',
    noRoles: 'Ingen roller ennå. Legg til din første rolle.',
    unnamed: 'Navnløs rolle',
    hasPrivate: 'Har hemmelige instruksjoner',
    unlimited: 'Ubegrenset',
    min: 'min {count}',
    range: '{min}–{max}',
    colors: {
      red: 'Rød',
      orange: 'Oransje',
      yellow: 'Gul',
      green: 'Grønn',
      cyan: 'Cyan',
      blue: 'Blå',
      purple: 'Lilla',
      pink: 'Rosa',
      gray: 'Grå'
    },
    icons: {
      mask: 'Maske',
      spy: 'Spion',
      crown: 'Krone',
      sword: 'Sverd',
      shield: 'Skjold',
      crystal: 'Krystallkule',
      star: 'Stjerne',
      target: 'Mål',
      idea: 'Idé',
      key: 'Nøkkel',
      circus: 'Sirkustelt',
      hero: 'Helt',
      wizard: 'Trollmann',
      robot: 'Robot',
      person: 'Person'
    },
    strategies: {
      random: 'Tilfeldig',
      leader_picks: 'Leder velger',
      player_picks: 'Spiller velger'
    },
    fields: {
      name: 'Rollenavn',
      icon: 'Ikon',
      color: 'Farge',
      publicDescription: 'Offentlig beskrivelse',
      privateInstructions: 'Hemmelige instruksjoner',
      privateHints: 'Hemmelige tips',
      minCount: 'Min antall',
      maxCount: 'Maks antall',
      strategy: 'Tildelingsstrategi'
    }
  },

  // Board Editor
  board: {
    title: 'Spillskjerm',
    preview: 'Forhåndsvisning',
    themes: {
      mystery: 'Mysterium',
      party: 'Fest',
      sport: 'Sport',
      nature: 'Natur',
      neutral: 'Nøytral'
    },
    layouts: {
      standard: 'Standard',
      fullscreen: 'Fullskjerm'
    },
    toggles: {
      showGameName: 'Vis spillnavn',
      showCurrentPhase: 'Vis nåværende fase',
      showTimer: 'Vis timer',
      showParticipants: 'Vis deltakere',
      showPublicRoles: 'Vis offentlige roller',
      showLeaderboard: 'Vis resultattavle',
      showQrCode: 'Vis QR-kode'
    },
    fields: {
      welcomeMessage: 'Velkomstmelding',
      theme: 'Tema',
      backgroundColor: 'Bakgrunnsfarge',
      layout: 'Layout'
    },
    previewLabels: {
      phase: 'Fase',
      timeLeft: 'Tid igjen',
      gameName: 'Spillnavn'
    }
  },

  // Step Editor
  step: {
    title: 'Steg',
    addStep: 'Legg til steg',
    editStep: 'Rediger steg',
    noSteps: 'Ingen steg ennå. Legg til ditt første steg.',
    unnamed: 'Navnløst steg',
    displayModes: {
      instant: 'Umiddelbar',
      typewriter: 'Skrivemaskin',
      dramatic: 'Dramatisk'
    },
    fields: {
      title: 'Tittel',
      body: 'Beskrivelse',
      duration: 'Varighet (minutter)',
      leaderScript: '💬 Lederskript (valgfritt)',
      displayMode: 'Visningsmode',
      media: 'Media'
    },
    placeholders: {
      title: 'F.eks. Samle gruppen',
      body: 'Hva skal deltakerne gjøre i dette steget?'
    }
  },

  // Artifact Wizard
  wizard: {
    title: 'Legg til artefakt',
    selectTemplate: 'Velg mal',
    customize: 'Tilpass',
    close: 'Lukk',
    create: 'Opprett',
    back: 'Tilbake',
    next: 'Neste',
    cancel: 'Avbryt',
    categories: {
      escape_room: 'Escape Room',
      party: 'Festspill',
      educational: 'Pedagogisk',
      general: 'Generelt'
    },
    templates: {
      keypadBasic: {
        name: 'Keypad (4 sifre)',
        description: 'En enkel 4-sifret pinkode for å låse opp noe'
      },
      keypadAdvanced: {
        name: 'Keypad (med forsøksgrense)',
        description: 'Pinkode med maks 3 forsøk før låsing'
      },
      riddle: {
        name: 'Gåte / Spørsmål',
        description: 'En gåte med tekstinntasting for svar'
      },
      cipher: {
        name: 'Caesar-chiffer',
        description: 'Kryptert melding med bokstavforskyvning'
      },
      hotspot: {
        name: 'Klikkbart bilde',
        description: 'Bilde med skjulte soner å finne'
      },
      tilePuzzle: {
        name: 'Puslespill (3x3)',
        description: 'Sliding tile puzzle for å avsløre et bilde'
      },
      logicGrid: {
        name: 'Logikkrutenett',
        description: 'Logikkpuslespill der ting skal matches'
      },
      counter: {
        name: 'Ledetrådteller',
        description: 'Tell fundne ledetråder eller fremgang'
      },
      hints: {
        name: 'Tips-beholder',
        description: 'Progressive tips som kan avsløres'
      },
      qrGate: {
        name: 'QR-kode checkpoint',
        description: 'Skann QR-kode for å fortsette'
      },
      location: {
        name: 'Plassering-checkpoint',
        description: 'GPS-verifisering for byspill'
      },
      clueCard: {
        name: 'Ledetråd/Tips',
        description: 'Et kort med en ledetråd som kan avsløres'
      },
      secretDocument: {
        name: 'Hemmelig dokument',
        description: 'Et dokument som avsløres på rett tidspunkt'
      },
      revealCard: {
        name: 'Avslørende kort',
        description: 'Et kort for dramatiske avsløringer'
      },
      roleSecret: {
        name: 'Rollehemmelighet',
        description: 'Hemmelig informasjon synlig bare for én rolle'
      }
    }
  }
};

fs.writeFileSync('./messages/no.json', JSON.stringify(no, null, 2) + '\n');
console.log('no.json oppdatert med admin.games.builder nycklar');
