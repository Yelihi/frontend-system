import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**", "node_modules/**", "test/fixtures/**", "test/evals/fs-comparison/.work/**", "test/evals/fs-comparison/**/results/**"] },
  ...tseslint.configs.recommended,
  // Reference fixtures intentionally omit private input fields via object rest.
  { files: ["test/evals/fs-comparison/**/reference/**/*.mjs"],
    rules: { "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }] } },
];
