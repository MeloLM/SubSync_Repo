import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint 9, flat config nativa (Next 16). Sostituisce `.eslintrc.json`
 * (`extends: next/core-web-vitals`). Il lint si lancia con `eslint .`:
 * `next lint` è stato rimosso in Next 16.
 */
export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    // Client Prisma generato (già in .gitignore).
    "lib/generated/**",
    // Service worker scritto a mano della PWA.
    "public/sw.js",
    "next-env.d.ts",
  ]),
]);
