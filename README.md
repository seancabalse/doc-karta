<div align="center">

# doc-karta

**A living, graph-based documentation viewer for monorepos.**

Your docs are MDX files with typed frontmatter. A fast Rust core crawls them into
a single `registry.json`, and a React canvas renders the
**page → component → BFF → service-API** dependency graph. A broken reference is
a *build error* — not a wiki page that quietly went stale.

![status](https://img.shields.io/badge/status-alpha%20%C2%B7%20P3%20complete-orange)
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
> **Status: alpha — Phases 1–3 complete, P4 in progress.** The Rust crawler emits
> a correct, deterministic `registry.json` and fails the build on broken
> references (verified against the bundled fixture oracle and a real monorepo).
> The React UI reads that registry and renders the interactive dependency graph
> (React Flow + dagre) with a sandboxed Manager/Preview split and shareable
> URL state. In dev, a `notify`-based Rust watcher re-crawls on save and the
> graph hot-reloads — no refresh, and a broken reference shows inline instead of
> crashing. A single `npx karta` now exposes `init`/`dev`/`build`, with the
> native core shipped prebuilt per platform; the first npm release is the
> remaining P4 step. Track progress on the
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
# Dev server with live reload: spawns `karta-core watch`, re-crawls on save,
# and hot-reloads the graph over Vite's socket. Defaults to the fixture.
pnpm --filter karta dev
```

Edit any `.mdx` under the watched directory and the graph updates instantly. To
point it at your own monorepo, set `KARTA_WATCH_DIR` (relative to the repo root):

```bash
KARTA_WATCH_DIR=path/to/your/repo pnpm --filter karta dev
```

The committed `packages/karta/public/registry.json` is the no-server fallback —
served by `vite preview` and the production build when no watcher is running. To
refresh that static snapshot:

```bash
cargo run -p karta-core -- crawl <your-repo> > packages/karta/public/registry.json
```

### Use it in your own repo

Install the package and scaffold a starting point. After install you'll see a
one-line hint; run `init` once, then `dev` or `build`:

```bash
npm install karta
npx karta init           # scaffold .docviz/config.ts (+ example if you have no docs yet)
npx karta dev [dir]      # serve the UI + watch [dir]; the graph hot-reloads on save
npx karta build [dir]    # crawl [dir] into a static site (default out: karta-dist/)
npx karta scan [dir]     # fail if any doc contains a likely secret (also gates build)
```

- **`init`** is idempotent (never overwrites) and **zero-config**: it scans for
  existing `docs/*.mdx` and narrows the `include` globs to where your docs live;
  if you have none yet it writes a self-contained page→component example so your
  first graph is never empty.
- **`dev`** serves the prebuilt UI and pushes updates over a WebSocket — edit any
  `.mdx` and the graph hot-reloads with no refresh; a broken reference shows
  inline and the last good graph stays.
- **`build`** emits a self-contained static site (UI + crawled `registry.json`)
  you can host anywhere: `npx serve karta-dist`.

The native `karta-core` binary ships prebuilt per platform (npm
`optionalDependencies`, esbuild-style) — **no Rust toolchain and no postinstall
download** for consumers. Supported: macOS (arm64/x64), Linux (x64/arm64),
Windows (x64).

### Secrets scanning

Docs describe real infra (env URLs, hostnames, header names) and authors paste
from `.env` — so every `karta build` first scans the raw `.mdx` sources and
**fails the build** (errors, not warnings) if it finds a likely secret:

- credentialed URLs (`scheme://user:pass@host`)
- AWS access keys (`AKIA…`/`ASIA…`)
- JWTs (`header.payload.signature`)
- base64 blobs over 50 chars

Findings are redacted in the output (`AKIA…MPLE`) so a CI log never reprints the
secret. Run it on its own with `npx karta scan [dir]`.

For an **intentional** example (a sample token, a base64 payload), add
`<!-- karta-allow-secret -->` on the line — or the line directly above — to
suppress that finding:

```mdx
<!-- karta-allow-secret -->
    eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZW1vIn0.demo-signature-for-docs
```

**Optional pre-commit hook** — the same engine, before code leaves your machine:

```bash
ln -s ../../scripts/hooks/pre-commit .git/hooks/pre-commit
```

Bypass a single commit with `git commit --no-verify`.

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
    src/secrets.rs       scan doc sources for likely secrets (gates build)
    src/schema.rs        the canonical contracts (serde structs)
    tests/fixture.rs     acceptance test: output == expected-registry.json
    tests/secrets.rs     secrets scanner against a planted-secrets fixture
  karta/               TypeScript package users install (CLI + dev server + UI)
    bin/karta.js         CLI entry — `init` · `dev` · `build` · `scan`
    bin/dev-server.js    Elysia dev server: serves dist + watch + WebSocket push
    bin/resolve-core.js  locate karta-core (prebuilt optional dep → local → cargo)
    bin/postinstall.js   non-intrusive "run npx karta init" hint
    npm/<platform-arch>/ per-platform binary packages (@doc-karta/core-*) — CI fills in
    vite-plugin-karta.ts dev live-reload: spawns `karta-core watch`, bridges → HMR socket
    src/ui/              Manager: React Flow + dagre graph, sidebar, toolbar, panels
    src/preview/         Sandboxed Preview frame (preview.html) — selected-node content
    src/channel/         Typed channel bus + postMessage transport (Manager ↔ Preview)
    src/addons/          Addon API (registerPanel/…/useRegistry) + built-in addons
    src/styling/         StyleX design tokens
    src/types/           TS mirror of the registry/config contracts
    public/registry.json Empty registry placeholder (the no-server fallback)
scripts/prepare-publish.mjs  CI-only: stamp versions + wire optionalDependencies
scripts/hooks/pre-commit     optional secrets-scan hook (opt-in; see Quick start)
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
| **P3** | Watch mode + live HMR over WebSocket              | ✅ Complete     |
| **P4** | npm packaging (`init`/`dev`/`build` + binaries)   | 🚧 In progress  |
| **P5** | WASM / fully static hosting                        | ⏳ Planned      |

P1–P3 are done. P4 is largely wired: a single `npx karta` exposes `init`
(zero-config scaffold), `dev` (serve the UI + watch + WebSocket hot-reload),
`build` (static site, gated by a secrets scan), and `scan` (the same gate, also
usable as a pre-commit hook). The native core ships prebuilt per platform via npm
`optionalDependencies`; the cross-compile + `npm publish` runs in CI
(`.github/workflows/release.yml`) on a `v*` tag. Remaining P4: the first real
release. Then P5 — a WASM core for fully static hosting.

### Releasing (maintainers)

Cross-compilation and publish are automated. Set the `NPM_TOKEN` repo secret,
then push a tag:

```bash
git tag v0.1.0 && git push --tags   # → release.yml builds all platforms, publishes
```

`release.yml` cross-compiles `karta-core` for every target, packs each into its
`@doc-karta/core-<platform>-<arch>` package, runs `scripts/prepare-publish.mjs` to
stamp versions + wire `optionalDependencies`, builds the UI, and publishes.

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
`pulldown-cmark` · `petgraph` · `rayon` · `notify` · `clap`.

**Package & UI** — TypeScript · React 19 · TanStack Router/Query ·
React Flow (`@xyflow/react`) · dagre · StyleX · Elysia · Vite. Tooling:
pnpm workspaces · Turborepo · Biome · Vitest · Playwright.

---

## License

MIT
