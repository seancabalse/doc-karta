#!/usr/bin/env node
/**
 * Post-install hint. Prints a single line nudging the user to scaffold their
 * project with `npx karta init`. It writes nothing — scaffolding is explicit
 * and idempotent (see bin/karta.js `init`), never an install-time side effect.
 *
 * No-op outside a dependency install (e.g. local dev in this monorepo), so
 * `pnpm install` here stays quiet.
 */
if (import.meta.dirname.includes('node_modules')) {
  process.stdout.write(
    '\n👋 doc-karta installed — run `npx karta init` to scaffold .docviz/config.ts and a runnable example.\n\n',
  )
}
