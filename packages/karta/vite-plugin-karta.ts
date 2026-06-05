import { type ChildProcess, spawn } from 'node:child_process'
import path from 'node:path'
import { createInterface } from 'node:readline'
import type { Plugin } from 'vite'

// This file lives in packages/karta; the workspace root is two levels up.
const REPO_ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Dev-only live reload (P3). Spawns `karta-core watch` once and streams its
 * newline-delimited registry updates to the browser over Vite's existing HMR
 * socket (custom `karta:registry` event). The latest crawl is also served at
 * `/registry.json`, so the initial page load and live updates agree — the
 * committed `public/registry.json` stays the no-server fallback.
 *
 * Watched directory: `KARTA_WATCH_DIR` (relative to the repo root), defaulting
 * to the bundled fixture. The re-crawl runs in-process inside the long-lived
 * Rust watcher — no subprocess per save.
 */
export function kartaWatch(): Plugin {
  const watchDir = path.resolve(REPO_ROOT, process.env.KARTA_WATCH_DIR ?? 'fixtures/sample-repo')
  let child: ChildProcess | null = null
  let latest: string | null = null

  return {
    name: 'karta-watch',
    apply: 'serve',
    configureServer(server) {
      // Vitest instantiates the Vite config too — don't spawn the watcher there.
      if (process.env.VITEST) return
      const log = server.config.logger

      // Serve the freshest crawl; fall back to public/registry.json until the
      // first crawl lands (configureServer middleware runs before Vite's static).
      server.middlewares.use((req, res, next) => {
        if (latest && req.url?.split('?')[0] === '/registry.json') {
          res.setHeader('Content-Type', 'application/json')
          res.end(latest)
          return
        }
        next()
      })

      child = spawn('cargo', ['run', '-q', '-p', 'karta-core', '--', 'watch', watchDir], {
        cwd: REPO_ROOT,
        env: process.env,
      })

      child.on('error', (err) => {
        log.error(`[karta] failed to start watcher (is cargo on PATH?): ${err.message}`)
      })
      // Cargo build output + the watcher's own diagnostics.
      child.stderr?.on('data', (chunk) => process.stderr.write(chunk))

      if (child.stdout) {
        const rl = createInterface({ input: child.stdout })
        rl.on('line', (line) => {
          if (!line.trim()) return
          let msg: {
            ok: boolean
            registry?: { nodes: unknown[]; edges: unknown[] }
            error?: string
          }
          try {
            msg = JSON.parse(line)
          } catch {
            return
          }
          if (msg.ok && msg.registry) {
            latest = JSON.stringify(msg.registry)
            log.info(
              `[karta] registry updated — ${msg.registry.nodes.length} nodes, ${msg.registry.edges.length} edges`,
            )
          } else {
            log.warn(`[karta] crawl failed:\n${msg.error}`)
          }
          server.ws.send({ type: 'custom', event: 'karta:registry', data: msg })
        })
      }

      const stop = () => {
        child?.kill()
        child = null
      }
      server.httpServer?.once('close', stop)
      process.once('exit', stop)
    },
  }
}
