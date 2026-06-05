# Spec: Node ID Namespacing

**Status:** Frozen (v1.0). This convention cannot be retrofitted without a
painful repo-wide migration — it is decided before any docs are authored.

## Format

```
{project}/{library}/{node-id}
```

Example: `chirp/portfolio-bff/get-portfolio`

| Segment     | Source                                                        | Rules                                  |
| ----------- | ------------------------------------------------------------- | -------------------------------------- |
| `project`   | `.docviz/config.ts` → `project`                               | `[a-z0-9][a-z0-9-]*`                   |
| `library`   | The library a doc belongs to (derived from its path / config) | `[a-z0-9][a-z0-9-]*`                   |
| `node-id`   | MDX frontmatter `id`                                          | `[a-z0-9][a-z0-9-]*`, unique per library |

## Where it lives

- **Frontmatter `id`** holds only the **library-local** node id (e.g. `get-portfolio`).
  Authors never write the full path.
- The crawler composes the **fully-qualified id** via
  `schema::qualified_id(project, library, node_id)` and stores it on every
  `RegistryNode.id` and on both ends of every `RegistryEdge`.

## Why it must be frozen now

References (`renders`, `calls`) resolve by id. Cross-project federation (Phase 5)
merges multiple `registry.json` files and resolves references **across** projects
by their namespace prefix. If ids are not namespaced from day one, the first
multi-project merge produces collisions that can only be fixed by editing every
existing MDX file. Namespacing now makes that merge a no-op.

## Resolution rules (for `renders` / `calls`)

- A bare id in `renders` / `calls.bff` / `calls.api` resolves **within the same
  project** first: `{this-project}/{library-of-target}/{id}`.
- A value already containing `/` is treated as fully qualified (cross-library or
  cross-project) and used as-is.
- Unresolvable references are a **build error** (this is the documentation-honesty
  guarantee), not a warning.
