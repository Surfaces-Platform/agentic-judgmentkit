import { FlatCompat } from "@eslint/eslintrc";
import nextVitals from "eslint-config-next/core-web-vitals.js";
import { globalIgnores } from "eslint/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.config(nextVitals),
  globalIgnores([".next/**", "node_modules/**"]),
];

export default config;
