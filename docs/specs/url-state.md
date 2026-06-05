# Spec: URL-State Schema

**Status:** Frozen (v1.0). (PER-7)

Every meaningful view in the UI is a URL. A teammate can paste a link and land on
the exact node, layer, environment, and panel the sender was looking at;
back/forward and refresh restore state with no server round-trip. This is why the
UI is plain Vite + React with TanStack Router (no SSR) — the router's
`validateSearch` is the single, typed home for view state.

## The search params

State lives entirely in **typed search params** on the index route. There is no
separate client store for view state; the URL *is* the store, read through
`Route.useSearch()` and written with `navigate({ search })`.

```ts
// validateSearch schema for the index route ('/')
type GraphSearch = {
  /** Selected node — fully-qualified id. Drives the Preview + detail panel. */
  node?: string
  /** Focused subgraph root — isolate the graph to this node's neighborhood. */
  focus?: string
  /** Environment for BFF endpoint display. */
  env?: string
  /** Layer filter for the canvas. */
  layer: 'page' | 'component' | 'bff' | 'api' | 'all'
  /** Audience mode — dims nodes outside the chosen audience. */
  audience: 'business' | 'tech' | 'all'
  /** Active addon panel id (e.g. 'detail'). */
  panel?: string
}
```

| Param      | Type                                          | Default | Example                              |
| ---------- | --------------------------------------------- | ------- | ------------------------------------ |
| `node`     | fully-qualified id                            | absent  | `chirp/client-user/home-page`        |
| `focus`    | fully-qualified id                            | absent  | `chirp/client-user/get-home-feed`    |
| `env`      | string (key from `.docviz` `environments`)    | absent  | `staging`                            |
| `layer`    | `page \| component \| bff \| api \| all`      | `all`   | `bff`                                |
| `audience` | `business \| tech \| all`                     | `all`   | `business`                           |
| `panel`    | string (registered panel id)                  | absent  | `detail`                             |

Example URL:

```
/?node=chirp/client-user/get-home-feed&layer=bff&env=staging&panel=detail
```

## Rules

- **Defaults are not serialized.** `validateSearch` fills missing/invalid params
  with the defaults above (and drops unknown enum values back to the default), so
  a clean `/` is the canonical "everything, nothing selected" view. `layer=all`
  and `audience=all` never appear in the URL.
- **`validateSearch` is the only validator.** It coerces and bounds every param;
  components downstream receive an already-typed `GraphSearch` and never re-parse
  the query string. An out-of-range `layer` becomes `all` rather than throwing.
- **Unresolved `node` / `focus` ids are tolerated, not fatal.** A link to a node
  that no longer exists selects nothing and shows an inline "node not found"
  state — a stale link must not white-screen the app. (Contrast with the crawler,
  where a dangling *reference in a doc* is a build error; a dangling id in a
  *URL* is just a soft miss.)
- **Selection round-trips through the channel.** A graph/sidebar click calls
  `navigate({ search: s => ({ ...s, node: id }) })`; a `useEffect` on
  `search.node` emits `node:select` on the channel (see
  [`plugin-channel-api.md`](plugin-channel-api.md)). The URL is the source of
  truth; the channel is how the Preview frame hears about it.

## Why on the route, not a store

Putting view state in `validateSearch` makes shareability and history free, keeps
exactly one source of truth, and means addons read view state the same way the
shell does (`useSearch`) instead of reaching into a bespoke context. Ephemeral,
non-shareable UI state (hover, drag position, transient layout) stays in local
component state and is intentionally **not** in the URL.
