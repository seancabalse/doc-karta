# Fixture: sample-repo

A self-contained 4-node slice used to validate the crawler. Shaped like the real
"Chirp" monorepo (pnpm + Turbo + React/TanStack + Elysia) so switching the
crawl target to the real repo is trivial.

## Nodes & edges

```
dashboard-page (page)
  ├── calls ──> get-portfolio (bff) ── calls ──> get-positions (api)
  └── calls ──> get-prices    (bff)
```

## Conventions exercised here

- **Library name** = the directory that contains the `docs/` folder
  (e.g. `libs/bffs/portfolio-bff/docs/` → library `portfolio-bff`).
- **Fully-qualified id** = `{project}/{library}/{node-id}` (project `chirp`).
- **Reference resolution**: bare ids in `calls` resolve to the target's
  fully-qualified id within the same project.

## `expected-registry.json`

The hand-authored target output — the Phase-1 success oracle. The crawler is
"done" for Phase 1 when its output for this fixture equals this file. Ordering
is deterministic: `nodes` sorted by `id`, `edges` sorted by `(from, to)`.
