import js from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  { ignores: ["node_modules/", ".expo/", "coverage/", "assets/", "dist/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,

  // --- Complexity thresholds (warn first, tighten later) ---
  {
    rules: {
      "complexity": ["warn", 10],
      "max-depth": ["warn", 4],
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", 4],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/todo-tag": "off",
      "sonarjs/pseudo-random": "off",
    },
  },

  // --- Functional patterns ---
  {
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "no-param-reassign": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // --- CommonJS config files ---
  {
    files: ["*.config.js"],
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // --- Strict overrides for engine/ (pure domain layer) ---
  {
    files: ["engine/**/*.ts"],
    rules: {
      "complexity": ["warn", 8],
      "max-lines-per-function": ["warn", { max: 40, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": ["warn", {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],
      "no-param-reassign": "error",
    },
  },
];
