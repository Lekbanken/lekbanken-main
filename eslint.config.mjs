import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  ]),
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
  // Allow sandbox imports only in sandbox paths
  {
    files: ["app/sandbox/**/*.tsx", "app/sandbox/**/*.ts", "components/achievements/**/*.tsx", "components/achievements/**/*.ts"],
    rules: {
      "no-restricted-imports": "off"
    }
  }
]);

export default eslintConfig;
