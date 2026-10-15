import js from "@eslint/js";
import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "media",
      "docs",
      ".claude",
      "phase0/out",
      "phase0/site/vendor",
      "phase0/**/*.html",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
