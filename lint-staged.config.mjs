export default {
  "apps/web/**/*.{js,jsx,ts,tsx}": "pnpm --filter web exec eslint --fix",
  "apps/api/**/*.py": [
    "uv --directory apps/api run ruff check --fix",
    "uv --directory apps/api run ruff format",
  ],
};
