'use client';

/**
 * FeatureGateMap - Definitioner för vilka funktioner som är tillgängliga i demo-läge
 * 
 * Detta dokument definierar vilka features som är:
 * - Fritt tillgängliga för alla demo-användare
 * - Endast tillgängliga för premium demo (efter kontakt med säljare)
 * - Helt låsta i demo-läge
 */

export type DemoTier = 'free' | 'premium';

export type FeatureAccessLevel = 
  | 'full'       // Fullt tillgänglig
  | 'limited'    // Delvis tillgänglig (t.ex. max 3 aktiviteter)
  | 'preview'    // Kan se men inte använda
  | 'locked';    // Helt dold/låst

export interface FeatureGate {
  id: string;
  name: string;
  description: string;
  freeTierAccess: FeatureAccessLevel;
  premiumTierAccess: FeatureAccessLevel;
  freeLimit?: number;      // T.ex. max antal spel
  premiumLimit?: number;
  upgradeMessage?: string; // Visas när användaren försöker nå låst funktion
  category: FeatureCategory;
}

export type FeatureCategory = 
  | 'activities'
  | 'planning'
  | 'collaboration'
  | 'analytics'
  | 'admin'
  | 'export';

/**
 * Master feature gate map
 * Definierar alla funktioner och deras tillgänglighet per demo-nivå
 */
export const FEATURE_GATES: FeatureGate[] = [
  // ============ AKTIVITETER ============
  {
    id: 'browse_activities',
    name: 'Bläddra aktiviteter',
    description: 'Se och sök bland alla tillgängliga aktiviteter',
    freeTierAccess: 'full',
    premiumTierAccess: 'full',
    category: 'activities',
  },
  {
    id: 'play_activities',
    name: 'Kör aktiviteter',
    description: 'Starta och genomföra aktiviteter',
    freeTierAccess: 'limited',
    premiumTierAccess: 'full',
    freeLimit: 3,
    upgradeMessage: 'Du har nått gränsen på 3 aktiviteter. Kontakta oss för fullständig åtkomst.',
    category: 'activities',
  },
  {
    id: 'create_activities',
    name: 'Skapa aktiviteter',
    description: 'Skapa egna anpassade aktiviteter',
    freeTierAccess: 'preview',
    premiumTierAccess: 'full',
    upgradeMessage: 'Skapa egna aktiviteter är en premiumfunktion. Kontakta oss för att låsa upp.',
    category: 'activities',
  },
  {
    id: 'edit_activities',
    name: 'Redigera aktiviteter',
    description: 'Ändra befintliga aktiviteter',
    freeTierAccess: 'locked',
    premiumTierAccess: 'full',
    upgradeMessage: 'Redigering kräver premium. Kontakta oss för att låsa upp.',
    category: 'activities',
  },

  // ============ PLANERING ============
  {
    id: 'view_calendar',
    name: 'Se kalender',
    description: 'Visa planerade aktiviteter i kalendervy',
    freeTierAccess: 'full',
    premiumTierAccess: 'full',
    category: 'planning',
  },
  {
    id: 'schedule_activities',
    name: 'Schemalägg aktiviteter',
    description: 'Planera aktiviteter i förväg',
    freeTierAccess: 'limited',
    premiumTierAccess: 'full',
    freeLimit: 2,
    upgradeMessage: 'Du kan schemaläggs max 2 aktiviteter i demo. Kontakta oss för obegränsad planering.',
    category: 'planning',
  },
  {
    id: 'recurring_schedules',
    name: 'Återkommande scheman',
    description: 'Skapa aktiviteter som upprepas automatiskt',
    freeTierAccess: 'locked',
    premiumTierAccess: 'full',
    upgradeMessage: 'Återkommande scheman är en premiumfunktion.',
    category: 'planning',
  },

  // ============ SAMARBETE ============
  {
    id: 'share_activities',
    name: 'Dela aktiviteter',
    description: 'Dela aktiviteter med kollegor',
    freeTierAccess: 'preview',
    premiumTierAccess: 'full',
    upgradeMessage: 'Delning är låst i demo. Kontakta oss för att aktivera.',
    category: 'collaboration',
  },
  {
    id: 'team_workspace',
    name: 'Team workspace',
    description: 'Gemensamt arbetsytor för team',
    freeTierAccess: 'locked',
    premiumTierAccess: 'full',
    upgradeMessage: 'Team workspaces kräver en organisationslicens.',
    category: 'collaboration',
  },
  {
    id: 'invite_members',
    name: 'Bjud in medlemmar',
    description: 'Bjud in kollegor till din organisation',
    freeTierAccess: 'locked',
    premiumTierAccess: 'limited',
    premiumLimit: 3,
    upgradeMessage: 'Inbjudningar är inte tillgängliga i demo.',
    category: 'collaboration',
  },

  // ============ ANALYS ============
  {
    id: 'basic_stats',
    name: 'Grundläggande statistik',
    description: 'Se hur aktiviteter har gått',
    freeTierAccess: 'full',
    premiumTierAccess: 'full',
    category: 'analytics',
  },
  {
    id: 'advanced_analytics',
    name: 'Avancerad analys',
    description: 'Detaljerade insikter och rapporter',
    freeTierAccess: 'preview',
    premiumTierAccess: 'full',
    upgradeMessage: 'Avancerad analys kräver premium. Se en förhandsgranskning nedan.',
    category: 'analytics',
  },
  {
    id: 'export_reports',
    name: 'Exportera rapporter',
    description: 'Ladda ner rapporter som PDF/Excel',
    freeTierAccess: 'locked',
    premiumTierAccess: 'full',
    upgradeMessage: 'Export är låst i demo-läge.',
    category: 'export',
  },

  // ============ ADMIN ============
  {
    id: 'org_settings',
    name: 'Organisationsinställningar',
    description: 'Hantera organisationens inställningar',
    freeTierAccess: 'locked',
    premiumTierAccess: 'limited',
    upgradeMessage: 'Admin-funktioner är låsta i demo.',
    category: 'admin',
  },
  {
    id: 'user_management',
    name: 'Användarhantering',
    description: 'Hantera användare och roller',
    freeTierAccess: 'locked',
    premiumTierAccess: 'preview',
    upgradeMessage: 'Användarhantering kräver en fullständig licens.',
    category: 'admin',
  },
  {
    id: 'billing',
    name: 'Fakturering',
    description: 'Hantera prenumeration och betalningar',
    freeTierAccess: 'locked',
    premiumTierAccess: 'locked',
    upgradeMessage: 'Fakturering är inte tillgänglig i demo-läge.',
    category: 'admin',
  },
];

/**
 * Hämta en specifik feature gate
 */
export function getFeatureGate(featureId: string): FeatureGate | undefined {
  return FEATURE_GATES.find((f) => f.id === featureId);
}

/**
 * Kontrollera om en funktion är tillgänglig för en viss demo-nivå
 */
export function isFeatureAccessible(
  featureId: string,
  tier: DemoTier,
  currentUsage?: number
): { accessible: boolean; reason?: string } {
  const feature = getFeatureGate(featureId);
  
  if (!feature) {
    return { accessible: false, reason: 'Okänd funktion' };
  }

  const accessLevel = tier === 'premium' 
    ? feature.premiumTierAccess 
    : feature.freeTierAccess;

  const limit = tier === 'premium' 
    ? feature.premiumLimit 
    : feature.freeLimit;

  switch (accessLevel) {
    case 'full':
      return { accessible: true };
    
    case 'limited':
      if (limit !== undefined && currentUsage !== undefined && currentUsage >= limit) {
        return { 
          accessible: false, 
          reason: feature.upgradeMessage ?? `Du har nått gränsen på ${limit}.` 
        };
      }
      return { accessible: true };
    
    case 'preview':
      return { 
        accessible: false, 
        reason: feature.upgradeMessage ?? 'Denna funktion är endast tillgänglig för förhandsgranskning.' 
      };
    
    case 'locked':
      return { 
        accessible: false, 
        reason: feature.upgradeMessage ?? 'Denna funktion är låst i demo-läge.' 
      };
    
    default:
      return { accessible: false, reason: 'Okänd åtkomstnivå' };
  }
}

/**
 * Hämta alla funktioner inom en kategori
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureGate[] {
  return FEATURE_GATES.filter((f) => f.category === category);
}

/**
 * Hämta alla tillgängliga funktioner för en demo-nivå
 */
export function getAccessibleFeatures(tier: DemoTier): FeatureGate[] {
  return FEATURE_GATES.filter((f) => {
    const access = tier === 'premium' ? f.premiumTierAccess : f.freeTierAccess;
    return access === 'full' || access === 'limited';
  });
}

/**
 * Hämta alla låsta funktioner för en demo-nivå
 */
export function getLockedFeatures(tier: DemoTier): FeatureGate[] {
  return FEATURE_GATES.filter((f) => {
    const access = tier === 'premium' ? f.premiumTierAccess : f.freeTierAccess;
    return access === 'locked' || access === 'preview';
  });
}

/**
 * Kategorilabels för UI
 */
export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  activities: 'Aktiviteter',
  planning: 'Planering',
  collaboration: 'Samarbete',
  analytics: 'Analys',
  admin: 'Administration',
  export: 'Export',
};

/**
 * Ikoner för kategorier (Heroicons namn)
 */
export const CATEGORY_ICONS: Record<FeatureCategory, string> = {
  activities: 'puzzle-piece',
  planning: 'calendar',
  collaboration: 'user-group',
  analytics: 'chart-bar',
  admin: 'cog-6-tooth',
  export: 'arrow-down-tray',
};
