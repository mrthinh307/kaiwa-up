export default {
  "*.{json,jsonc,md,yaml,yml,css,scss,html}": "prettier --write",
  "apps/web/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}": [
    "pnpm --filter web exec eslint --fix",
    "prettier --write",
  ],
  "apps/api/**/*.py": [
    "uv --directory apps/api run ruff check --fix",
    "uv --directory apps/api run ruff format",
  ],
};
