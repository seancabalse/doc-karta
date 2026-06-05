/**
 * Prepare the `karta` package + its per-platform core packages for `npm publish`.
 *
 * Run in CI only (the release workflow), never committed back. It:
 *   - sets every package's version to the release version,
 *   - flips `karta` to public (`private: false`),
 *   - injects `optionalDependencies` on the platform packages.
 *
 * Kept out of the committed manifest so `pnpm install` stays green against the
 * not-yet-published `@doc-karta/core-*` names during normal development.
 *
 * Usage: node scripts/prepare-publish.mjs <version>
 */
import fs from 'node:fs'
import path from 'node:path'

const version = process.argv[2]
if (!version) {
  console.error('usage: node scripts/prepare-publish.mjs <version>')
  process.exit(1)
}

const ROOT = path.resolve(import.meta.dirname, '..')
const KARTA = path.join(ROOT, 'packages/karta')
const TARGETS = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'linux-arm64', 'win32-x64']

const writeJson = (file, obj) => fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`)
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))

// Per-platform packages: bump version.
const optionalDependencies = {}
for (const target of TARGETS) {
  const file = path.join(KARTA, 'npm', target, 'package.json')
  const pkg = readJson(file)
  pkg.version = version
  writeJson(file, pkg)
  optionalDependencies[`@doc-karta/core-${target}`] = version
}

// Main package: bump, publish-able, wire the optional deps.
const mainFile = path.join(KARTA, 'package.json')
const main = readJson(mainFile)
main.version = version
main.private = false
main.optionalDependencies = optionalDependencies
writeJson(mainFile, main)

console.log(`prepared karta@${version} with ${TARGETS.length} platform packages`)
