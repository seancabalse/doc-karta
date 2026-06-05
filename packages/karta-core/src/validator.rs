//! Per-node-type validation of parsed frontmatter.

use crate::schema::Frontmatter;

/// Validate that `fm` satisfies the contract for its node type.
///
/// TODO(P1): enforce required fields per type, e.g.
///   * `bff`  -> `method`, `path`, `runtime`, `timeout_ms` required; every
///     `calls[]` entry sets exactly one of `bff` / `api`.
///   * `page` -> at least one of `renders` / `calls`.
/// Also reject `docviz_version` majors newer than [`crate::schema::SCHEMA_VERSION`].
pub fn validate(_fm: &Frontmatter) -> Result<(), Vec<String>> {
    Ok(())
}
