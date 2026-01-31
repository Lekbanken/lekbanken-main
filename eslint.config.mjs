import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { createRequire } from 'module';

// Import custom rules using CommonJS require (needed for .cjs files in ESM context)
const require = createRequire(import.meta.url);
const lekbankenRules = require('./eslint-rules/index.cjs');

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "catalyst-ui-kit/**",
    "types/supabase.ts",
    "types/database.ts",
  ]),
  // Register custom Lekbanken rules
  {
    plugins: {
      lekbanken: lekbankenRules,
    },
  },
  {
    rules: {
      // Prevent 'as any' usage - force proper typing
      "@typescript-eslint/no-explicit-any": "warn",
      // Encourage consistent type imports
      "@typescript-eslint/consistent-type-imports": "warn",
      // Warn about unused vars
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      // Prevent importing deprecated sandbox builder into admin paths
      "no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["@/components/achievements/*", "@/components/achievements"],
            "message": "The sandbox badge builder is deprecated. Use features/admin/achievements/* instead."
          },
          {
            "group": ["@/types/achievements-builder", "@/types/achievements-builder/*"],
            "message": "Legacy achievement types are deprecated. Use features/admin/achievements/types instead."
          },
          {
            "group": ["@/components/app/GameCard", "@/components/app/GameCard/*"],
            "message": "Legacy GameCard is removed. Use @/components/game/GameCard instead."
          },
          {
            "group": ["@/features/browse/GameCard", "@/features/browse/GameCard/*"],
            "message": "Legacy GameCard is removed. Use @/components/game/GameCard instead."
          },
          {
            "group": ["@/features/browse/components/GameCard", "@/features/browse/components/GameCard/*"],
            "message": "Legacy GameCard is removed. Use @/components/game/GameCard instead."
          }
        ]
      }]
    }
  },
  // i18n: ERROR for critical user-facing areas (legal, play, app)
  {
    files: [
      "app/legal/**/*.tsx",
      "app/app/**/*.tsx", 
      "features/play/**/*.tsx",
      "components/play/**/*.tsx"
    ],
    rules: {
      "lekbanken/no-hardcoded-strings": "error",
    },
  },
  // i18n: Warn about hardcoded Nordic strings in other components (migration phase)
  {
    files: ["components/**/*.tsx", "app/**/*.tsx", "features/**/*.tsx"],
    ignores: [
      "app/legal/**/*.tsx",
      "app/app/**/*.tsx",
      "features/play/**/*.tsx", 
      "components/play/**/*.tsx",
      "app/sandbox/**/*.tsx" // Dev tools - lower priority
    ],
    rules: {
      "lekbanken/no-hardcoded-strings": "warn",
    },
  },
  // Allow sandbox imports only in sandbox paths
  {
    files: ["app/sandbox/**/*.tsx", "app/sandbox/**/*.ts", "components/achievements/**/*.tsx", "components/achievements/**/*.ts"],
    rules: {
      "no-restricted-imports": "off"
    }
  },
  // =============================================================================
  // LAYER-BASED IMPORT GUARDRAILS (GameDetails Phase 0)
  // =============================================================================
  // Prevent UI components from importing server-only service layer directly.
  // Service layer should only be used in:
  // - app/api/** (API routes)
  // - lib/services/** (internal service composition)
  // - Server components in app/ that explicitly need DB access
  {
    files: [
      "components/**/*.tsx",
      "components/**/*.ts",
      "features/**/*.tsx",
      "features/**/*.ts",
    ],
    ignores: [
      // These are allowed to use service layer
      "**/*.server.ts",
      "**/*.server.tsx",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["@/lib/services/*", "@/lib/services"],
            "message": "UI components should not import from service layer directly. Use API routes or server components instead."
          }
        ]
      }]
    }
  },
  // app/app/ pages should use service layer via server components, not client components
  // This is a softer warning since some pages legitimately use server actions
  {
    files: [
      "app/app/**/*.tsx",
    ],
    ignores: [
      "app/app/**/page.tsx",
      "app/app/**/layout.tsx",
      "app/app/**/loading.tsx",
      "app/app/**/error.tsx",
      "**/*.server.tsx",
    ],
    rules: {
      "no-restricted-imports": ["warn", {
        "patterns": [
          {
            "group": ["@/lib/services/*", "@/lib/services"],
            "message": "Client components should not import from service layer. Use props from server components or API routes."
          }
        ]
      }]
    }
  },
  // =============================================================================
  // PROFILE LOADING RESILIENCE (Prevent regression to manual useEffect patterns)
  // =============================================================================
  // Profile routes should use useProfileQuery hook instead of manual useEffect
  // to prevent infinite loading spinners and request storms.
  {
    files: [
      "app/app/profile/**/*.tsx",
    ],
    rules: {
      "lekbanken/no-manual-profile-fetch": "warn",
    },
  }
]);

export default eslintConfig;
