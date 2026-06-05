# Spec: registry.json Format

`registry.json` is the **sole interface** between the Rust core and the React UI.
The core produces it; the UI consumes it. No runtime MDX parsing happens in the
browser.

Canonical definition: `packages/karta-core/src/schema.rs`.
TypeScript mirror: `packages/karta/src/types/registry.ts`.

## Conventions

- **Casing:** snake_case everywhere — Rust field names, JSON keys, and the MDX
  YAML frontmatter all match verbatim. There is intentionally no camelCase
  transform layer. The one rename is `node_type` → `type` (a reserved-ish word
  in both YAML and the UI).
- **Versioning:** the top-level `version` is the *registry format* version
  ("1.0"), independent of each file's `docviz_version`.

## Shape

```jsonc
{
  "version": "1.0",
  "nodes": [
    {
      "id": "chirp/portfolio-bff/get-portfolio", // fully-qualified
      "type": "bff",                              // page | component | bff | api
      "title": "GET /portfolio",
      "status": "stable",                         // stable | draft | deprecated
      "project": "chirp",
      "library": "portfolio-bff",
      "owner": "squad-wealth",                    // optional
      "audience": ["tech"],                       // optional
      "source_path": "libs/bffs/portfolio-bff/docs/get-portfolio.mdx"
    }
  ],
  "edges": [
    {
      "from": "chirp/touchpoints/dashboard-page",
      "to": "chirp/portfolio-bff/get-portfolio",
      "kind": "calls"                             // renders | calls
    }
  ]
}
```

## Edge semantics

| kind      | from → to                  |
| --------- | -------------------------- |
| `renders` | page → component           |
| `calls`   | page → bff, or bff → api   |

Edges are directed and always connect two fully-qualified node ids that exist in
`nodes`. The builder fails if an edge would dangle.
