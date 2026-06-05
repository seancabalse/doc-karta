/**
 * doc-karta dev server. Serves the prebuilt UI (`dist/`), runs `karta-core
 * watch` against the target repo, and pushes registry updates to the browser
 * over a WebSocket so the graph hot-reloads with no refresh — the consumer-side
 * equivalent of the Vite-plugin live reload used when developing doc-karta.
 *
 * Configured by env (set by `bin/karta.js dev`):
 *   KARTA_DIST_DIR   directory of the built UI   (default: ../dist)
 *   KARTA_WATCH_DIR  repo to crawl + watch        (default: the bundled fixture)
 *   PORT             listen port                  (default: 4317)
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'
import { resolveCore } from './resolve-core.js'

const PORT = Number(process.env.PORT) || 4317
const distDir = process.env.KARTA_DIST_DIR
  ? path.resolve(process.env.KARTA_DIST_DIR)
  : path.resolve(import.meta.dirname, '../dist')
const watchDir = process.env.KARTA_WATCH_DIR
  ? path.resolve(process.env.KARTA_WATCH_DIR)
  : path.resolve(import.meta.dirname, '../../..', 'fixtures/sample-repo')

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`[karta] no built UI at ${distDir} — run \`pnpm --filter karta build\` first.`)
  process.exit(1)
}

/** Freshest crawl, shared by the HTTP route and pushed over the socket. */
let latest = null
/** Connected live-reload sockets. */
const sockets = new Set()

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.map': 'application/json',
}

// Tell the client it's served live (so it opens the WS). Static hosts omit this
// marker and the client stays inert.
const LIVE_MARKER = '<script>window.__KARTA_LIVE__=true</script>'

/** Serve a file from dist, injecting the live marker into HTML. Null if absent. */
function serveStatic(urlPath, set) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
  const abs = path.join(distDir, rel)
  // Stay inside dist.
  if (!abs.startsWith(distDir) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return null
  }
  const ext = path.extname(abs)
  set.headers['content-type'] = CONTENT_TYPES[ext] ?? 'application/octet-stream'
  if (ext === '.html') {
    return fs.readFileSync(abs, 'utf8').replace('</head>', `${LIVE_MARKER}</head>`)
  }
  return fs.readFileSync(abs)
}

const app = new Elysia({ adapter: node() })
  .get('/health', () => ({ ok: true, service: 'karta' }))
  .get('/registry.json', ({ set }) => {
    set.headers['content-type'] = 'application/json'
    if (latest) return latest
    const fallback = path.join(distDir, 'registry.json')
    return fs.existsSync(fallback)
      ? fs.readFileSync(fallback, 'utf8')
      : '{"version":"1.0","nodes":[],"edges":[]}'
  })
  .ws('/__karta_live', {
    open(ws) {
      sockets.add(ws)
    },
    close(ws) {
      sockets.delete(ws)
    },
  })
  // Static UI + SPA fallback to index.html for extensionless routes.
  .get('*', ({ path: urlPath, set }) => {
    const file = serveStatic(urlPath, set)
    if (file !== null) return file
    if (!path.extname(urlPath)) return serveStatic('/', set)
    set.status = 404
    return 'Not found'
  })

// --- watcher: stream NDJSON registry updates, broadcast to sockets ----------
const core = resolveCore()
const child = spawn(core.cmd, [...core.args, 'watch', watchDir], { env: process.env })

child.on('error', (err) => {
  console.error(`[karta] failed to start watcher (mode: ${core.mode}): ${err.message}`)
})
child.stderr?.on('data', (chunk) => process.stderr.write(chunk))

if (child.stdout) {
  const rl = createInterface({ input: child.stdout })
  rl.on('line', (line) => {
    if (!line.trim()) return
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      return
    }
    if (msg.ok && msg.registry) {
      latest = JSON.stringify(msg.registry)
      console.log(
        `[karta] registry updated — ${msg.registry.nodes.length} nodes, ${msg.registry.edges.length} edges`,
      )
    } else {
      console.warn(`[karta] crawl failed:\n${msg.error}`)
    }
    for (const ws of sockets) ws.send(line)
  })
}

const stop = () => child.kill()
process.once('exit', stop)
process.once('SIGINT', () => process.exit(0))
process.once('SIGTERM', () => process.exit(0))

app.listen(PORT, () => {
  console.log(`\n  doc-karta  →  http://localhost:${PORT}`)
  console.log(`  watching   ${watchDir}\n`)
})
