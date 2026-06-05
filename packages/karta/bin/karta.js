#!/usr/bin/env node
/**
 * Entry point for `npx karta`.
 *
 *   init    Scaffold .docviz/config.ts + a runnable example (zero-config).
 *   dev     Serve the UI + watch the repo; the graph hot-reloads on save.
 *   build   Crawl the repo into a self-contained static site.
 *   scan    Fail if any doc contains a likely secret (also gates build).
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { resolveCore } from './resolve-core.js'

const cmd = process.argv[2] ?? 'help'

const help = `karta <command> [dir]

Commands:
  init     Scaffold .docviz/config.ts + a runnable example in this project
  dev      Serve the UI and watch [dir] (default: .) — graph hot-reloads on save
  build    Crawl [dir] (default: .) into a static site (default out: karta-dist)
  scan     Scan [dir] (default: .) for likely secrets — exits non-zero if found
  help     Show this message

For local development of the UI shell, run:
  pnpm --filter karta dev
`

// --- init --------------------------------------------------------------------

/** Derive a project namespace from the target dir's package.json, or its name. */
function inferProject(cwd) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
    if (typeof pkg.name === 'string' && pkg.name) {
      // Strip an `@scope/` prefix; lowercase for the id convention.
      return pkg.name.replace(/^@[^/]+\//, '').toLowerCase()
    }
  } catch {
    // No (readable) package.json — fall back to the directory name.
  }
  return path.basename(cwd).toLowerCase()
}

/** Find existing `*.mdx` files that live under a `docs/` folder (PER-9). */
function findExistingDocs(cwd) {
  const ignore = new Set(['node_modules', 'dist', 'target', 'karta-dist', 'build'])
  const out = []
  const walk = (dir, depth) => {
    if (depth > 7 || out.length > 50) return
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (ignore.has(e.name) || e.name.startsWith('.')) continue
        walk(full, depth + 1)
      } else if (e.name.endsWith('.mdx')) {
        const rel = path.relative(cwd, full)
        if (rel.split(path.sep).includes('docs')) out.push(rel)
      }
    }
  }
  walk(cwd, 0)
  return out
}

/**
 * Decide `include` globs so the first crawl is never empty (PER-9):
 *   - existing docs → narrow globs to their top-level roots (faster on big repos),
 *     and skip the example;
 *   - none → universal `**​/docs/**​/*.mdx` + scaffold the example.
 */
function inferInclude(cwd) {
  const existing = findExistingDocs(cwd)
  if (existing.length) {
    const tops = new Set(existing.map((rel) => rel.split(path.sep)[0]))
    const include = tops.has('docs')
      ? ['**/docs/**/*.mdx']
      : [...tops].map((t) => `${t}/**/docs/**/*.mdx`)
    return {
      include,
      scaffoldExample: false,
      note: `found ${existing.length} existing doc(s) → ${include.join(', ')}`,
    }
  }
  const markers = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json'].filter((m) =>
    fs.existsSync(path.join(cwd, m)),
  )
  const note = markers.length ? `monorepo detected (${markers.join(', ')})` : null
  return { include: ['**/docs/**/*.mdx'], scaffoldExample: true, note }
}

const configTs = (project, include) => `interface DocvizConfig {
  project: string
  include: string[]
  exclude?: string[]
  environments?: Record<string, string>
}

export default {
  project: '${project}',
  // Globs (relative to this repo's root) locating your MDX docs.
  include: [${include.map((g) => `'${g}'`).join(', ')}],
} satisfies DocvizConfig
`

const welcomePage = `---
docviz_version: "1.0"
id: welcome-page
type: page
title: Welcome
status: draft
audience: [tech]
renders:
  - welcome-card
---

# Welcome

Your first doc-karta page. It renders the Welcome card. Edit this file (or add a
\`calls:\` to a BFF) and the graph hot-reloads. Delete the \`example/\` folder once
you've authored your own docs.
`

const welcomeCard = `---
docviz_version: "1.0"
id: welcome-card
type: component
title: Welcome Card
status: draft
audience: [tech]
---

# Welcome Card

A component rendered by the Welcome page. Components are the leaves of the graph.
`

/** Write `content` to `rel` under `cwd` unless it exists; report either way. */
function scaffoldFile(cwd, rel, content) {
  const abs = path.join(cwd, rel)
  if (fs.existsSync(abs)) {
    process.stdout.write(`  • skipped ${rel} (exists)\n`)
    return
  }
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content)
  process.stdout.write(`  ✓ created ${rel}\n`)
}

function init() {
  const cwd = process.cwd()
  const project = inferProject(cwd)
  const { include, scaffoldExample, note } = inferInclude(cwd)
  process.stdout.write(`Scaffolding doc-karta (project: ${project})\n`)
  if (note) process.stdout.write(`  ${note}\n`)
  scaffoldFile(cwd, '.docviz/config.ts', configTs(project, include))
  if (scaffoldExample) {
    scaffoldFile(cwd, 'example/docs/welcome-page.mdx', welcomePage)
    scaffoldFile(cwd, 'example/docs/welcome-card.mdx', welcomeCard)
  }
  process.stdout.write('\nNext: npx karta dev   (in this repo: pnpm --filter karta dev)\n')
}

// --- dev ---------------------------------------------------------------------

function dev() {
  const dir = path.resolve(process.argv[3] ?? '.')
  const server = path.join(import.meta.dirname, 'dev-server.js')
  const child = spawn(process.execPath, [server], {
    stdio: 'inherit',
    env: { ...process.env, KARTA_WATCH_DIR: dir },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

// --- scan --------------------------------------------------------------------

/** Scan `dir` for secrets via the core; returns the child exit status. */
function runScan(dir) {
  const core = resolveCore()
  const res = spawnSync(core.cmd, [...core.args, 'scan', dir], { encoding: 'utf8' })
  if (res.stdout) process.stdout.write(res.stdout)
  if (res.stderr) process.stderr.write(res.stderr)
  return res.status ?? 1
}

function scan() {
  const dir = path.resolve(process.argv[3] ?? '.')
  process.exit(runScan(dir))
}

// --- build -------------------------------------------------------------------

function build() {
  const dir = path.resolve(process.argv[3] ?? '.')
  const out = path.resolve(process.argv[4] ?? 'karta-dist')
  const distDir = path.resolve(import.meta.dirname, '../dist')
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    process.stderr.write('karta: built UI not found — run `pnpm --filter karta build` first.\n')
    process.exit(1)
  }

  // Secrets are a build error in stakeholder-facing output — gate before crawl.
  if (runScan(dir) !== 0) process.exit(1)

  const core = resolveCore()
  const res = spawnSync(core.cmd, [...core.args, 'crawl', dir], { encoding: 'utf8' })
  if (res.status !== 0) {
    // Broken reference / bad type is a build error — pass it through.
    process.stderr.write(res.stderr || 'karta: crawl failed\n')
    process.exit(1)
  }

  fs.cpSync(distDir, out, { recursive: true })
  fs.writeFileSync(path.join(out, 'registry.json'), res.stdout)

  const reg = JSON.parse(res.stdout)
  const rel = path.relative(process.cwd(), out) || out
  process.stdout.write(`✓ built ${rel} — ${reg.nodes.length} nodes, ${reg.edges.length} edges\n`)
  process.stdout.write(`  serve it: npx serve ${rel}\n`)
}

// --- dispatch ----------------------------------------------------------------

switch (cmd) {
  case 'init':
    init()
    break
  case 'dev':
    dev()
    break
  case 'build':
    build()
    break
  case 'scan':
    scan()
    break
  case 'help':
  case '--help':
  case '-h':
    process.stdout.write(help)
    break
  default:
    process.stdout.write(`karta: "${cmd}" is not a command.\n\n${help}`)
}
