#!/usr/bin/env node
/**
 * Thin entry point for `npx karta`. Skeleton only.
 *
 * TODO(P4): locate and invoke the platform-specific `karta-core` binary
 * (shipped via optionalDependencies, esbuild-style) and, for `dev`, start the
 * Elysia dev server (src/server) with the Vite UI + WebSocket watcher.
 */
const cmd = process.argv[2] ?? 'help'

const help = `karta <command>

Commands (skeleton):
  dev      Start the dev server + graph UI  (not wired yet)
  build    Crawl docs into registry.json     (not wired yet)
  help     Show this message

For local development of the UI shell, run:
  pnpm --filter karta dev
`

switch (cmd) {
  case 'help':
  case '--help':
  case '-h':
    process.stdout.write(help)
    break
  default:
    process.stdout.write(`karta: "${cmd}" is not wired up yet (skeleton).\n\n${help}`)
}
