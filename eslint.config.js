import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Generated artefacts: Supabase types + the router tree are rewritten by
    // tooling and must not be reformatted by the lint gate.
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      ".playwright-browsers/**",
      ".pw-browsers/**",
      // Vendored / reference trees — not part of the product lint surface.
      "docs/reference/**",
      "**/docs/reference/**",
      "src/routeTree.gen.ts",
      "src/integrations/supabase/types.ts",
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/client.server.ts",
      "src/integrations/supabase/auth-middleware.ts",
      "src/integrations/supabase/auth-attacher.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Tracked debt: ~240 pre-existing `any` usages (mostly Supabase row shapes and
      // e2e harness helpers). Reported as warnings so the lint gate stays enforceable
      // while the typing backlog is burned down per domain. Do not add new `any`.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  eslintPluginPrettier,
);
