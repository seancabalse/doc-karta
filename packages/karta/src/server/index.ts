/**
 * Dev server stub (Elysia). Skeleton only.
 *
 * TODO(P3): serve the built UI, watch MDX files (invoking karta-core in watch
 * mode), and push registry diffs to the UI over a WebSocket. For now it exposes
 * a single health route so the dependency is wired and runnable.
 */
import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

// Use the Node adapter — Elysia targets Bun by default.
export const app = new Elysia({ adapter: node() }).get('/health', () => ({
  ok: true,
  service: 'karta',
}))

const PORT = 4317

// Start when run directly (e.g. `pnpm --filter karta serve`).
app.listen(PORT, () => {
  console.log(`karta dev server stub listening on http://localhost:${PORT}`)
})
