//! Resolve parsed docs into a node/edge registry.

use crate::parser::ParsedDoc;
use crate::schema::{Registry, SCHEMA_VERSION};

/// Resolve `docs` into a [`Registry`]: build fully-qualified ids, turn
/// `renders` / `calls` into edges, fail on dangling references, and detect
/// cycles (via `petgraph`).
///
/// TODO(P1): thread project/library context through and implement resolution +
/// reference checking. Currently returns an empty registry.
pub fn build_registry(_docs: &[ParsedDoc]) -> Registry {
    Registry {
        version: SCHEMA_VERSION.to_string(),
        nodes: Vec::new(),
        edges: Vec::new(),
    }
}
