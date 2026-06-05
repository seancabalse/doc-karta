/**
 * Live reload. Registry updates stream in and are applied to the TanStack Query
 * cache so the graph hot-reloads with no page refresh and no flash. A failed
 * crawl keeps the last good graph and surfaces the error via
 * `subscribeLiveStatus` (broken reference is a build error — shown, not swallowed).
 *
 * Two transports:
 *   - When developing doc-karta itself, the Vite plugin pushes over the HMR
 *     socket (`import.meta.hot`).
 *   - When served by the shipped dev server (`npx karta dev`), the client opens
 *     a plain WebSocket — gated on `window.__KARTA_LIVE__`, which the dev server
 *     injects. A purely static host omits the marker and this stays inert.
 */
import type { QueryClient } from '@tanstack/react-query'
import type { Registry } from '../types/registry'

declare global {
  interface Window {
    __KARTA_LIVE__?: boolean
  }
}

type Envelope = { ok: true; registry: Registry } | { ok: false; error: string }

let liveError: string | null = null
const listeners = new Set<(error: string | null) => void>()

/** Subscribe to the live-crawl status. Fires immediately with the current value. */
export function subscribeLiveStatus(fn: (error: string | null) => void): () => void {
  listeners.add(fn)
  fn(liveError)
  return () => {
    listeners.delete(fn)
  }
}

function setLiveError(next: string | null) {
  liveError = next
  for (const fn of listeners) fn(next)
}

export function connectLiveRegistry(queryClient: QueryClient): void {
  const apply = (msg: Envelope) => {
    if (msg.ok) {
      queryClient.setQueryData(['registry'], msg.registry)
      setLiveError(null)
    } else {
      setLiveError(msg.error)
    }
  }

  // Monorepo dev: updates ride Vite's HMR socket.
  if (import.meta.hot) {
    import.meta.hot.on('karta:registry', apply)
    return
  }

  // Shipped dev server: a plain WebSocket carries the same envelope.
  if (!window.__KARTA_LIVE__) return
  const ws = new WebSocket(`ws://${window.location.host}/__karta_live`)
  ws.onmessage = (ev) => {
    try {
      apply(JSON.parse(ev.data) as Envelope)
    } catch {
      // Ignore malformed frames.
    }
  }
}
