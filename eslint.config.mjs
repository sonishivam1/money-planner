import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Import boundaries between layers (NFR-MNT-1).
 * Source of truth: docs/04-architecture/system-architecture.md, section 2,
 * "Layers and import rules". Patterns are regular expressions on the import
 * specifier, so `next` doesn't also match `next-auth`.
 */
const restrict = (layer, rules) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: rules.map(([regex, why]) => ({ regex, message: `${layer}: ${why}` })),
    },
  ],
});

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", "drizzle/**", ".data/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),

  {
    rules: {
      // UI copy is plain English with apostrophes and quotes, which React renders correctly.
      // Keep the characters that usually signal a JSX typo.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],
    },
  },
  {
    // Tool config files (PostCSS, Vitest, Drizzle) conventionally default-export an object literal.
    files: ["*.config.{js,mjs,ts,mts}"],
    rules: { "import/no-anonymous-default-export": "off" },
  },

  // Engine: pure, may import zod only (plus its own files and vitest in tests).
  {
    files: ["lib/engine/**/*.{ts,tsx}"],
    rules: restrict("lib/engine is pure", [
      ["^next(/.*)?$", "no Next.js imports."],
      ["^react(-dom)?(/.*)?$", "no React imports."],
      ["^@/lib/db", "no database access."],
      ["^(\\.\\./)+db(/.*)?$", "no database access."],
      ["^@/lib/(actions|session|load)$", "no server glue."],
      ["^(\\.\\./)+(actions|session|load)$", "no server glue."],
      ["^@/auth$", "no auth."],
      ["^server-only$", "the engine runs anywhere, including tests and the browser."],
      ["^postgres(/.*)?$", "no database drivers."],
      ["^drizzle-orm", "no database access."],
      ["^node:", "no I/O or Node built-ins."],
      ["^(fs|path)(/.*)?$", "no I/O or Node built-ins."],
    ]),
  },

  // Data access: engine schemas and Drizzle; never React, Next.js or actions.
  {
    files: ["lib/db/**/*.{ts,tsx}"],
    rules: restrict("lib/db", [
      ["^react(-dom)?(/.*)?$", "no React imports."],
      ["^next(/.*)?$", "no Next.js imports."],
      ["^@/lib/actions$", "data access must not depend on Server Actions."],
      ["^(\\.\\./)+actions$", "data access must not depend on Server Actions."],
      ["^@/components(/.*)?$", "data access must not depend on UI components."],
    ]),
  },

  // Client components: engine types and formatting, actions; never the database or server-only modules.
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: restrict("components", [
      ["^@/lib/db", "no database access; use a Server Action."],
      ["^@/lib/(load|session)$", "server-only module; pass data in as props."],
      ["^server-only$", "components may run in the browser."],
    ]),
  },

  // Server pages and layouts: go through @/lib/load or @/lib/db/queries, never the db client.
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: restrict("app", [
      ["^@/lib/db(/index)?$", "don't use the database client directly; go through @/lib/load or @/lib/db/queries."],
    ]),
  },
]);
