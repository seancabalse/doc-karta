# @doc-karta/karta

**A living, graph-based documentation viewer for monorepos.**

Your docs are MDX files with typed frontmatter. A fast Rust core crawls them into
a single `registry.json`, and a React canvas renders the
**page → component → BFF → service-API** dependency graph. A broken reference is
a *build error* — not a wiki page that quietly went stale.

> Part of [doc-karta](https://github.com/seancabalse/doc-karta). This package is
> the CLI + dev server + UI; the native `karta-core` binary ships prebuilt per
> platform as an optional dependency (no Rust toolchain, no postinstall download).

## Install

```bash
npm install -g @doc-karta/karta
```

The native core ships prebuilt for macOS (arm64/x64), Linux (x64/arm64), and
Windows (x64) via npm `optionalDependencies` — nothing to compile.

## Usage

```bash
karta init           # scaffold .docviz/config.ts (+ example if you have no docs yet)
karta dev [dir]      # serve the UI + watch [dir]; the graph hot-reloads on save
karta build [dir]    # crawl [dir] into a static site (default out: karta-dist/)
karta scan [dir]     # fail if any doc contains a likely secret (also gates build)
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

## Anatomy of a doc

A doc is plain MDX with **typed** YAML frontmatter. Each `calls` entry references
another node by its bare `id`; the crawler resolves those into graph edges, and a
reference to a node that doesn't exist **fails the crawl**.

```mdx
---
docviz_version: "1.0"
id: dashboard-page
type: page
title: Dashboard
status: stable
audience: [business, tech]
calls:
  - bff: get-portfolio
  - bff: get-prices
---

# Dashboard

The authenticated landing screen, fed by the portfolio and prices BFFs.
```

## Secrets scanning

Every `karta build` first scans the raw `.mdx` sources and **fails the build**
(errors, not warnings) if it finds a likely secret — credentialed URLs
(`scheme://user:pass@host`), AWS access keys (`AKIA…`/`ASIA…`), JWTs, or base64
blobs over 50 chars. Findings are redacted in the output so a CI log never
reprints the secret. Run it standalone with `karta scan [dir]`.

For an intentional example, add `<!-- karta-allow-secret -->` on the line — or the
line directly above — to suppress that finding.

## Documentation

Full docs, the registry format contract, and the development guide live in the
[doc-karta repository](https://github.com/seancabalse/doc-karta).

## License

[MIT](./LICENSE) © Sean Cabalse
