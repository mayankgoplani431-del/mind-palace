# Contributing

1. `npm ci`
2. `npm run dev` – local dev server (base path `/mind-palace/`).
3. Before opening a PR: `npm run lint && npm test && npm run build`.
4. Use conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

**New memory objects:** add an `ObjectDef` to a file in `src/objects/builders/` (procedural Three.js primitives only – no external assets) and make sure its `key` is unique.

**New UI strings:** add the key to **all three** of `src/i18n/en.json`, `hi.json`, `mr.json` (a test enforces parity).
