/**
 * The `.docviz/config.ts` contract. Drives `init`, the Rust crawler, and the
 * dev server. Authored at a repo's root; the crawler reads it to learn the
 * project namespace and where docs live.
 */
export interface DocvizConfig {
  /** Project namespace — the `{project}` segment of every fully-qualified id. */
  project: string
  /** Globs, relative to the repo root, locating MDX docs. */
  include: string[]
  /** Optional globs to exclude. */
  exclude?: string[]
  /** Default environment URLs merged into nodes that omit them. */
  environments?: Record<string, string>
}
