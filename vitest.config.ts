import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Configurazione test unit (Sprint 6 · CI/Qualità).
 * Ambiente `node` (helper puri, nessun DOM). Alias `@/*` allineato al tsconfig.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
