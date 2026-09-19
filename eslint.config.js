import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**", "node_modules/**", "test/fixtures/**"] },
  ...tseslint.configs.recommended,
];
