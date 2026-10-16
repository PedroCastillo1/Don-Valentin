import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/dist-preview",
      "**/dist-archivo",
      "**/.vercel",
      "media",
      "docs",
      ".claude",
      "continuidad",
      "coverage",
      "test-results",
      "playwright-report",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
