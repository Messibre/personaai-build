# ADR-0001: Tooling Dependencies (Husky, ESLint, @eslint/js)

## Context
Per AGENTS.md, `pnpm verify` must run `lint + typecheck + test + boundary check`. However, `eslint` was missing from `devDependencies` while `package.json` had a `"lint": "eslint ."` script. Additionally, git pre-commit automation was requested via Husky to enforce `pnpm verify` locally before commits reach remote branches, along with GitHub Actions CI.

## Decision
1. Add `husky` (v9) as a devDependency to manage `.husky/pre-commit` hooks that run `pnpm verify`.
2. Add `eslint` (v9), `@eslint/js`, and `typescript-eslint` as devDependencies with a minimal flat `eslint.config.mjs` supporting JavaScript/TypeScript/React source files.
3. Keep dependency additions strictly scoped to developer tooling (`devDependencies`), avoiding runtime dependencies.

## Trade-offs
- Slight increase in `node_modules` size and install time (~5–10s in CI).
- ESLint v9 flat config requires modern config format, but avoids deprecated legacy `.eslintrc` structures.

## Reverse this if:
- Linting step in `pnpm verify` takes > 10 seconds locally on clean commits, or lint maintenance overhead causes > 2 false-positive build failures per sprint.
