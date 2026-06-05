<div align="center">

# doc-karta

**A living, graph-based documentation viewer for monorepos.**

Your docs are MDX files with typed frontmatter. A fast Rust core crawls them into
a single `registry.json`, and a React canvas renders the
**page → component → BFF → service-API** dependency graph. A broken reference is
a *build error* — not a wiki page that quietly went stale.

![status](https://img.shields.io/badge/status-alpha%20%C2%B7%20P2%20complete-orange)
![core](https://img.shields.io/badge/core-Rust-dea584)
![ui](https://img.shields.io/badge/ui-React%2019%20%2B%20TypeScript-3178c6)
![license](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Why doc-karta?

In a monorepo, the truth about how things connect — which page calls which BFF,
which BFF fans out to which service — lives in code that changes daily. Hand-kept
docs drift away from that truth within weeks, and nobody trusts them.

doc-karta treats documentation like source code:

- 📝 **Docs live next to the code** they describe (`libs/**/docs/*.mdx`) and move
  with it.
- 🔗 **References are typed and checked.** A page that `calls` a BFF that no
  longer exists fails the crawl — the same way a dangling import fails a compiler.
- 🕸️ **The shape is a graph, not a tree.** doc-karta renders the real dependency
  web so you can *see* the blast radius of a change.
- ⚡ **The core is Rust.** Crawling, parsing, validating, and resolving thousands
  of docs is fast enough to run on every save.

> [!NOTE]
> **Status: alpha — Phases 1 & 2 complete.** The Rust crawler emits a correct,
> deterministic `registry.json` and fails the build on broken references
> (verified against the bundled fixture oracle and a real monorepo). The React
> UI now reads that registry and renders the interactive dependency graph
> (React Flow + dagre) with a sandboxed Manager/Preview split and shareable
> URL state. Watch mode (P3) and npm packaging (P4) are still ahead. Track
> progress on the
> [Linear project](https://linear.app/heli0sa/project/documentation-viewer-doc-karta-a6f6a319479d)
> — see the [roadmap](#roadmap) below.

---

## How it works

doc-karta is a five-stage pipeline. Each MDX file is discovered, parsed,
validated, and resolved into a graph, which is emitted as one JSON artifact the
UI reads.

```
.docviz/config.ts          *.mdx files               registry.json
       │                        │                          │
       ▼                        ▼                          ▼
  ┌─────────┐   ┌────────┐  ┌────────┐  ┌───────────┐  ┌─────────┐
  │ config  │──▶│ crawl  │─▶│ parse  │─▶│ validate  │─▶│ resolve │──▶ registry.json
  │ (gl&os) │   │walkdir │  │ +YAML  │  │ per-type  │  │ + graph │
  └─────────┘   └────────┘  └────────┘  └───────────┘  └─────────┘
                                              │
                                     broken ref / bad type
                                              ▼
                                        non-zero exit
```

The crawled fixture models a real slice of a product — a dashboard page backed by
two BFFs, one of which calls a downstream service:

```
dashboard-page (page)
  ├── calls ──▶ get-portfolio (bff) ── calls ──▶ get-positions (api)
  └── calls ──▶ get-prices    (bff)
```

---

## Anatomy of a doc

A doc is plain MDX. The YAML frontmatter is **typed** — the Rust core knows what
a `page`, `component`, `bff`, and `api` are allowed to contain, and rejects
anything that doesn't fit. Here is a real page from the fixture:

```mdx
---
docviz_version: "1.0"
id: dashboard-page
type: page
title: Dashboard
status: stable
audience: [business, tech]
owner: squad-wealth
calls:
  - bff: get-portfolio
  - bff: get-prices
---

# Dashboard

The authenticated landing screen. Shows the user's portfolio summary and live
market prices, fed by the portfolio and prices BFFs.
```

Each `calls` entry references another node by its bare `id`. The crawler resolves
those into fully-qualified ids and turns them into graph edges — and if a
referenced id doesn't exist, the crawl fails:

```
$ karta-core crawl ./repo
crawl failed:
libs/touchpoints/dashboard/docs/dashboard-page.mdx: reference to unknown node `get-prices`
```

### The id convention

Every node has a globally-unique, **non-retrofittable** id:

```
{project}/{library}/{node-id}     e.g.  chirp/portfolio-bff/get-portfolio
```

`project` comes from `.docviz/config.ts`; `library` is the directory that
contains the `docs/` folder; `node-id` is the frontmatter `id`. This convention
is frozen — see [`docs/specs/id-namespacing.md`](docs/specs/id-namespacing.md).

---

## The registry

`registry.json` is the **single interface** between the Rust core and the UI —
a stable, versioned `{ version, nodes, edges }` document with deterministic
ordering (nodes by `id`, edges by `(from, to)`). The page above resolves to:

```json
{
  "id": "chirp/dashboard/dashboard-page",
  "type": "page",
  "title": "Dashboard",
  "status": "stable",
  "project": "chirp",
  "library": "dashboard",
  "owner": "squad-wealth",
  "audience": ["business", "tech"],
  "source_path": "libs/touchpoints/dashboard/docs/dashboard-page.mdx"
}
```

The full contract — node fields, edge kinds, and stability guarantees — is in
[`docs/specs/registry-format.md`](docs/specs/registry-format.md).

---

## Quick start

> Requires **Rust** (`rustup`), **Node 22+**, and **pnpm 11+**.

Clone, install, and crawl the bundled fixture to see a real `registry.json`:

```bash
pnpm install

# Crawl the synthetic fixture repo and print its registry to stdout.
cargo run -p karta-core -- crawl fixtures/sample-repo
```

You'll get the four nodes and three edges of the dashboard slice, sorted
deterministically. Point `crawl` at any directory containing a `.docviz/config.ts`
to crawl your own docs.

Then launch the UI to explore the graph visually:

```bash
# Renders packages/karta/public/registry.json as an interactive graph.
pnpm --filter karta dev
```

To view your own docs, write the crawler's output there and reload:

```bash
cargo run -p karta-core -- crawl <your-repo> > packages/karta/public/registry.json
```

---

## Project layout

```
packages/
  karta-core/          Rust core — crawl · parse · validate · resolve → registry.json
    src/config.rs        read project + include globs from .docviz/config.ts
    src/crawler.rs       discover *.mdx via walkdir + globset
    src/parser.rs        split YAML frontmatter, deserialize to typed structs
    src/validator.rs     per-type required fields; broken refs are errors
    src/graph.rs         qualified ids + edge resolution, deterministic output
    src/schema.rs        the canonical contracts (serde structs)
    tests/fixture.rs     acceptance test: output == expected-registry.json
  karta/               TypeScript package users install (CLI + dev server + UI)
    src/server/          Elysia dev server (serves UI, watches MDX) — stub
    src/ui/              Manager: React Flow + dagre graph, sidebar, toolbar, panels
    src/preview/         Sandboxed Preview frame (preview.html) — selected-node content
    src/channel/         Typed channel bus + postMessage transport (Manager ↔ Preview)
    src/addons/          Addon API (registerPanel/…/useRegistry) + built-in addons
    src/styling/         StyleX design tokens
    src/types/           TS mirror of the registry/config contracts
    public/registry.json Demo registry served to the UI (captured Chirp slice)
fixtures/sample-repo   Synthetic crawl target + expected-registry.json oracle
schemas/               JSON Schema for MDX frontmatter (editor integration)
docs/specs/            Frozen contracts: id namespacing, registry format,
                       plugin/channel API, URL state
```

---

## Roadmap

doc-karta ships in phases. Each is a milestone on the
[Linear project](https://linear.app/heli0sa/project/documentation-viewer-doc-karta-a6f6a319479d).

| Phase  | Goal                                              | Status         |
| ------ | ------------------------------------------------- | -------------- |
| **P1** | Rust CLI → static `registry.json`                 | ✅ Complete     |
| **P2** | React shell — read-only dependency graph          | ✅ Complete     |
| **P3** | Watch mode + live HMR over WebSocket              | 🚧 Next         |
| **P4** | npm packaging (cross-compiled binaries + WASM)    | ⏳ Planned      |
| **P5** | WASM / fully static hosting                        | ⏳ Planned      |

P1 and P2 are done: the crawler emits a verified `registry.json`, and the React
UI reads it to render the interactive dependency graph (React Flow + dagre) with
a sandboxed Manager/Preview split, an addon API, and shareable URL state. Next up
is P3 — watch mode that re-crawls on save and hot-reloads the graph over a
WebSocket.

---

## Development

```bash
pnpm install

# JS workspace — lint / typecheck / test / build via Turborepo
pnpm lint
pnpm turbo typecheck test build

# UI shell dev server (Vite + React + StyleX)
pnpm --filter karta dev

# Elysia dev server stub (health check on :4317)
pnpm --filter karta serve

# Rust core
cargo build -p karta-core
cargo test  -p karta-core                              # runs the fixture acceptance test
cargo run   -p karta-core -- crawl fixtures/sample-repo
```

CI (`.github/workflows/ci.yml`) runs the same JS pipeline and the Rust
build/test on every push.

---

## Tech stack

**Core** — Rust: `serde` · `serde_yaml` · `walkdir` · `globset` ·
`pulldown-cmark` · `petgraph` · `rayon` · `clap`.

**Package & UI** — TypeScript · React 19 · TanStack Router/Query ·
React Flow (`@xyflow/react`) · dagre · StyleX · Elysia · Vite. Tooling:
pnpm workspaces · Turborepo · Biome · Vitest · Playwright.

---

## License

MIT
