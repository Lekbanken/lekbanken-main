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
  }
]);

export default eslintConfig;
