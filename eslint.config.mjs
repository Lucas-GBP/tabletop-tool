import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "build",
      "node_modules",
      "src-tauri/target",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...solid,
    languageOptions: {
      parserOptions: {
        project: "tsconfig.json",
      },
    },
    rules: {
      // Solid.js específico
      "solid/reactivity": "warn",
      "solid/no-destructure": "warn",
      "solid/jsx-no-undef": "error",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // Gerais
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "warn",
    },
  },
  eslintConfigPrettier
);
