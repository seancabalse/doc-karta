# doc-karta

Living, graph-based documentation viewer for monorepos. MDX files with typed
frontmatter are the single source of truth; a fast Rust core crawls them into a
`registry.json`, and a React canvas renders the page → component → BFF →
service-API dependency graph. A broken reference is a build error, not a stale
wiki page.

> Status: skeleton. The contracts, fixture, and project structure are in place;
> the crawler and graph UI are not implemented yet. See the
> [Linear project](https://linear.app/heli0sa/project/documentation-viewer-doc-karta-a6f6a319479d)
> (milestones P1–P5).

## Layout

```
packages/
  karta-core/        Rust core — crawl, parse, validate, resolve → registry.json
  karta/             TypeScript package users install (CLI + dev server + UI)
    bin/karta.js     `npx karta` entry point
    src/server/      Elysia dev server (serves UI, watches MDX) — stub
    src/ui/          Vite + React 19 + TanStack Router + TanStack Query graph UI
    src/styling/     StyleX design tokens
    src/types/       TS mirror of the registry/config contracts
fixtures/sample-repo Synthetic crawl target + expected-registry.json oracle
schemas/             JSON Schema for MDX frontmatter (editor integration)
docs/specs/          Frozen contracts: id namespacing, registry format
```

The single interface between the Rust core and the UI is `registry.json` — see
[`docs/specs/registry-format.md`](docs/specs/registry-format.md). The
non-retrofittable id convention is in
[`docs/specs/id-namespacing.md`](docs/specs/id-namespacing.md).

## Prerequisites

- Node 22+ and pnpm 11+
- Rust toolchain (`rustup`) for `karta-core`

## Develop

```bash
pnpm install

# JS workspace (lint / typecheck / test / build via Turborepo)
pnpm lint
pnpm turbo typecheck test build

# UI shell dev server
pnpm --filter karta dev

# Elysia dev server stub (health check on :4317)
pnpm --filter karta serve

# Rust core
cargo build -p karta-core
cargo test -p karta-core
cargo run -p karta-core -- crawl fixtures/sample-repo   # prints registry.json
```

## Stack

pnpm workspaces · Turborepo · Biome · Vitest · Playwright · TypeScript ·
React 19 · TanStack Router/Query · StyleX · Elysia · Rust (serde, walkdir,
globset, pulldown-cmark, petgraph, rayon).
