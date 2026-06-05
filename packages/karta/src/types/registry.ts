/**
 * TypeScript mirror of the canonical contracts in
 * `packages/karta-core/src/schema.rs`. The Rust struct is the source of truth;
 * keep these in sync. The UI consumes `Registry` (the emitted `registry.json`);
 * `Frontmatter` is included for editor tooling and the detail panel.
 *
 * Keys are snake_case to match the Rust/serde wire format and the MDX YAML
 * frontmatter verbatim — one casing across core, registry, and UI, no transform
 * layer. See `docs/specs/registry-format.md`.
 */

/** Current schema version declared by every MDX file via `docviz_version`. */
export const SCHEMA_VERSION = '1.0' as const

export type NodeType = 'page' | 'component' | 'bff' | 'api'
export type Status = 'stable' | 'draft' | 'deprecated'
export type Audience = 'business' | 'tech'
export type EdgeKind = 'renders' | 'calls'

/** A reference from one node to another. Exactly one of `bff` / `api` is set. */
export interface CallRef {
  bff?: string
  api?: string
  /** environment -> URL */
  env?: Record<string, string>
}

/** Request/response descriptor for a BFF node. */
export interface IoSpec {
  schema?: string
  example?: string
  estimated_kb?: number
}

/** A documented error path for a BFF node. */
export interface ErrorSpec {
  code: number
  condition: string
  fallback?: string
}

/**
 * Parsed YAML frontmatter of a single MDX doc. Type-specific fields are
 * optional here; the Rust validator enforces which are required per `type`.
 */
export interface Frontmatter {
  docviz_version: string
  /** Library-local node id (e.g. `get-portfolio`), namespaced at build time. */
  id: string
  type: NodeType
  title: string
  status?: Status
  audience?: Audience[]
  owner?: string

  // page
  renders?: string[]
  // page + bff
  calls?: CallRef[]

  // bff
  method?: string
  path?: string
  runtime?: string
  timeout_ms?: number
  request?: IoSpec
  response?: IoSpec
  environments?: Record<string, string>
  errors?: ErrorSpec[]
}

/** A resolved node in the registry. `id` is fully qualified. */
export interface RegistryNode {
  /** Fully-qualified id: `{project}/{library}/{node-id}`. */
  id: string
  type: NodeType
  title: string
  status: Status
  project: string
  library: string
  owner?: string
  audience?: Audience[]
  /** Path to the source MDX file, relative to the crawl root. */
  source_path: string
}

/** A resolved, directed edge between two fully-qualified node ids. */
export interface RegistryEdge {
  from: string
  to: string
  kind: EdgeKind
}

/** The emitted registry — the sole interface between the Rust core and the UI. */
export interface Registry {
  version: string
  nodes: RegistryNode[]
  edges: RegistryEdge[]
}

/** Compose the fully-qualified, non-retrofittable node id. */
export function qualifiedId(project: string, library: string, nodeId: string): string {
  return `${project}/${library}/${nodeId}`
}
