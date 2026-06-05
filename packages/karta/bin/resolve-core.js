/**
 * Locate the `karta-core` binary. Single source of truth for `dev`, `build`,
 * and the Elysia dev server.
 *
 * Resolution order:
 *   1. The platform-specific optional dependency `@doc-karta/core-<platform>-<arch>`
 *      (shipped prebuilt, esbuild-style — no postinstall download).
 *   2. Dev fallback inside this monorepo: `target/release|debug/karta-core`.
 *   3. Last resort: `cargo run -q -p karta-core --` (requires a Rust toolchain).
 *
 * Returns `{ cmd, args, mode }` so callers spawn uniformly:
 *   spawn(cmd, [...args, ...subcommandArgs])
 */

import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

// packages/karta/bin → repo root is three levels up.
const REPO_ROOT = path.resolve(import.meta.dirname, '../../..')

/** npm package + binary file name for the current platform. */
function platformTarget() {
  const ext = process.platform === 'win32' ? '.exe' : ''
  return {
    pkg: `@doc-karta/core-${process.platform}-${process.arch}`,
    bin: `karta-core${ext}`,
  }
}

export function resolveCore() {
  const { pkg, bin } = platformTarget()

  // 1. Prebuilt platform package.
  try {
    const binPath = require.resolve(`${pkg}/${bin}`)
    return { cmd: binPath, args: [], mode: 'prebuilt' }
  } catch {
    // Not installed (e.g. running from source) — fall through.
  }

  // 2. Locally-built binary (monorepo dev).
  for (const profile of ['release', 'debug']) {
    const local = path.join(REPO_ROOT, 'target', profile, bin)
    if (fs.existsSync(local)) {
      return { cmd: local, args: [], mode: profile }
    }
  }

  // 3. Build-and-run via cargo.
  return { cmd: 'cargo', args: ['run', '-q', '-p', 'karta-core', '--'], mode: 'cargo' }
}
