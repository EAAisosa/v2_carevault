import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @param {boolean} hasReact */
export function createConfig(hasReact = false) {
  const base = [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      rules: {
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/consistent-type-imports": "error",
      },
    },
    {
      ignores: ["dist/**", ".next/**", "node_modules/**", "*.generated.*"],
    },
  ];

  if (!hasReact) return base;

  return [
    ...base,
    {
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  ];
}
