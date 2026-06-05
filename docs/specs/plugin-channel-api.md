# Spec: Plugin/Channel API + Manager/Preview Split

**Status:** Frozen (v1.0). This is a load-bearing contract: panels, toolbar
items, and the future BFF request simulator are all built against it. Changing
the channel protocol or the Manager/Preview boundary later is a migration tax on
every addon, so it is settled before P2 UI features land. (PER-6)

## Why split Manager from Preview

The UI is two cooperating surfaces, borrowed from Storybook's manager/preview
model:

- **Manager** — the persistent chrome that never reloads: sidebar, graph canvas,
  toolbar, and addon panels. Owns navigation and selection state (mirrored to the
  URL — see [`url-state.md`](url-state.md)).
- **Preview** — a **sandboxed `<iframe>`** that renders the content of the
  selected node and nothing else. It is isolated on purpose: P3+ will run a BFF
  request simulator in here (live `fetch` against documented endpoints), and that
  must never share a DOM, a global scope, or a crash with the graph canvas.

The two frames share no JavaScript memory. They communicate **only** over the
channel, which means the boundary is honest from day one: if an addon works
across the channel, it works regardless of which frame it runs in.

```
┌─ Manager frame (index.html) ───────────────────────────────┐
│  toolbar        ┌───────────────┐   ┌─ panels ───────────┐  │
│  sidebar ─────▶ │ graph canvas  │   │ detail / addons    │  │
│                 └───────────────┘   └────────────────────┘  │
│                         │  ▲                                 │
│                  node:select │ node:navigate                 │
│                         ▼  │                                 │
│  ┌─ Preview frame (preview.html, sandboxed iframe) ───────┐  │
│  │  renders selected-node content (+ future simulator)    │  │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
        ▲ postMessage transport bridges the two channels ▲
```

## The channel

The channel is a **typed event bus**. Every meaningful interaction is a message
on it — never a direct function call across the Manager/Preview boundary, and
never a shared mutable object. One logical bus spans both frames; a postMessage
transport relays events across the iframe so a message emitted on either side is
observed on both.

### Message protocol (frozen)

```ts
type ChannelEvents = {
  // Core → everyone. Fired once the registry.json finishes loading.
  'registry:loaded': { version: string; node_count: number; edge_count: number }

  // Selection changed (graph click, sidebar click, or URL navigation).
  // Manager is the source of truth; Preview receives it.
  'node:select': { id: string | null }

  // Preview → Manager. A link inside the preview asks to focus another node.
  'node:navigate': { id: string }

  // Toolbar → everyone. Active environment for BFF endpoint display.
  'env:change': { env: string }

  // Toolbar → everyone. Layer filter for the graph (or 'all').
  'layer:filter': { layer: 'page' | 'component' | 'bff' | 'api' | 'all' }
}
```

Rules:

- **Payloads are plain JSON.** They cross a postMessage boundary, so no
  functions, class instances, or DOM nodes.
- **Selection is one-way.** Only the Manager emits `node:select`; the Preview
  reacts. The Preview requests a change with `node:navigate`, which the Manager
  may honour by emitting a new `node:select`. This keeps a single source of
  truth and prevents selection ping-pong across the bridge.
- **Adding an event is backwards-compatible; changing an existing payload is
  not.** New events may be added in a v1.x; payload changes wait for v2.0.

### Transport

- In a single frame the channel is a plain listener map (`emit`/`on`/`off`).
- Across frames, `connectPostMessage(channel, targetWindow, origin)` subscribes
  to the channel and `postMessage`s each event to the other frame, and listens
  for inbound `message` events and re-emits them locally. Every message is
  tagged with a transport id; a frame ignores messages it sent itself, so the
  bridge never echoes.
- `origin` is pinned (same-origin in P2; the dev/static server serves both
  `index.html` and `preview.html`). Messages from any other origin are dropped.

## Addon API surface (frozen)

The five calls any addon (built-in or third-party) may rely on:

| API                                  | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `registerPanel(id, component)`       | Mount a React panel in the Manager's panel area.                   |
| `registerToolbarItem(id, component)` | Mount a control in the Manager toolbar.                            |
| `subscribeToChannel(event, handler)` | Listen to a typed channel event. Returns an unsubscribe function.  |
| `emitToChannel(event, payload)`      | Emit a typed channel event (relayed across frames by the transport). |
| `useRegistry()`                      | React hook → `{ registry, isLoading, error }` for the loaded `registry.json`. |

- `registerPanel` / `registerToolbarItem` write into a module-level registry
  read by the Manager shell at render time. Registration must happen at import
  time (before first render), the same way Storybook addons self-register.
- `subscribeToChannel` / `emitToChannel` are thin, type-checked wrappers over the
  singleton channel; their event names and payloads are constrained to
  `ChannelEvents` above.
- `useRegistry` reads the TanStack Query cache. The registry is fetched once and
  is read-only in P2 (no watch mode until P3).

## What P2 actually builds against this

The read-only graph is the **first consumer**, deliberately kept thin to prove
the contract carries real weight:

- The graph canvas emits `node:select` on click and `layer:filter` from the
  toolbar; it is itself a Manager-side feature, not yet an addon.
- The Preview frame subscribes to `node:select` and renders the node's registry
  detail (title, type, status, owner, audience, source path, and incident
  edges). Rendering the raw MDX **body** is deferred until the core emits it
  (registry.json carries metadata only today).
- A built-in **detail panel** is registered via `registerPanel` to exercise the
  addon path end to end.

Everything else the issue anticipates — third-party addons, the BFF request
simulator inside the Preview — is unblocked by this contract without being built
now.
