//! Canonical data contracts for doc-karta.
//!
//! This module is the single source of truth for the documentation schema.
//! The TypeScript types in `packages/karta/src/types/registry.ts` and the JSON
//! Schema in `schemas/` mirror these definitions and must be kept in sync.
//!
//! Two shapes live here:
//!   * `Frontmatter` — what the crawler parses out of each MDX file's YAML head.
//!   * `Registry` (+ `RegistryNode`, `RegistryEdge`) — the emitted `registry.json`
//!     that the UI consumes. This is the only interface between core and UI.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Current schema version. Every MDX file declares `docviz_version`; the
/// validator rejects unknown majors so future migrations are explicit.
pub const SCHEMA_VERSION: &str = "1.0";

/// The kinds of artifact a node can represent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Page,
    Component,
    Bff,
    Api,
}

/// Lifecycle status of a documented artifact.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Stable,
    #[default]
    Draft,
    Deprecated,
}

/// Who a piece of documentation is written for.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Audience {
    Business,
    Tech,
}

/// A reference from one node to another. Exactly one of `bff` / `api` must be
/// set (enforced by the validator); `env` optionally maps environment -> URL.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CallRef {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bff: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api: Option<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub env: BTreeMap<String, String>,
}

/// Request/response descriptor for a BFF node.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IoSpec {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub schema: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub example: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub estimated_kb: Option<f32>,
}

/// A documented error path for a BFF node.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ErrorSpec {
    pub code: u16,
    pub condition: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback: Option<String>,
}

/// The parsed YAML frontmatter of a single MDX doc.
///
/// This is intentionally a single wide struct: every type-specific field is
/// optional here and the *validator* enforces which fields are required for a
/// given `node_type`. Keeping one parse target avoids tagged-enum edge cases
/// and keeps the per-type contract in one readable place (`validator.rs`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Frontmatter {
    pub docviz_version: String,
    /// Library-local node id (e.g. `get-portfolio`). Combined with project +
    /// library into the fully-qualified registry id. See `qualified_id`.
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub title: String,

    #[serde(default)]
    pub status: Status,
    #[serde(default)]
    pub audience: Vec<Audience>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,

    // --- page-specific ---
    /// Component node-ids this page renders.
    #[serde(default)]
    pub renders: Vec<String>,

    // --- page + bff: outbound calls ---
    #[serde(default)]
    pub calls: Vec<CallRef>,

    // --- bff-specific ---
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub request: Option<IoSpec>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response: Option<IoSpec>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub environments: BTreeMap<String, String>,
    #[serde(default)]
    pub errors: Vec<ErrorSpec>,
}

/// The emitted registry — the sole interface between the Rust core and the UI.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Registry {
    /// Registry format version (independent of per-file `docviz_version`).
    pub version: String,
    pub nodes: Vec<RegistryNode>,
    pub edges: Vec<RegistryEdge>,
}

/// A resolved node in the registry. `id` is fully qualified.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RegistryNode {
    /// Fully-qualified id: `{project}/{library}/{node-id}`.
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub title: String,
    pub status: Status,
    pub project: String,
    pub library: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub audience: Vec<Audience>,
    /// Path to the source MDX file, relative to the crawl root.
    pub source_path: String,
}

/// A resolved, directed edge between two fully-qualified node ids.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RegistryEdge {
    pub from: String,
    pub to: String,
    pub kind: EdgeKind,
}

/// What an edge represents.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EdgeKind {
    /// A page renders a component.
    Renders,
    /// A page calls a BFF, or a BFF calls a service API.
    Calls,
}

/// Compose the fully-qualified, non-retrofittable node id.
///
/// Format: `{project}/{library}/{node-id}` — e.g. `chirp/portfolio-bff/get-portfolio`.
/// This convention is frozen; see `docs/specs/id-namespacing.md`.
pub fn qualified_id(project: &str, library: &str, node_id: &str) -> String {
    format!("{project}/{library}/{node_id}")
}
