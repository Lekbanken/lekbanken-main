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
      }]
    }
  }
]);

export default eslintConfig;
