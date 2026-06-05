//! Per-node-type validation of parsed frontmatter.

use crate::schema::{Frontmatter, NodeType, SCHEMA_VERSION};

/// Validate that `fm` satisfies the contract for its node type. All violations
/// are collected so a single run reports every problem.
pub fn validate(fm: &Frontmatter) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    // Reject docviz_version majors newer than what we support.
    match major(&fm.docviz_version) {
        Some(found) => {
            let supported = major(SCHEMA_VERSION).expect("SCHEMA_VERSION has a major");
            if found > supported {
                errors.push(format!(
                    "docviz_version {} is newer than supported {SCHEMA_VERSION}",
                    fm.docviz_version
                ));
            }
        }
        None => errors.push(format!("invalid docviz_version `{}`", fm.docviz_version)),
    }

    match fm.node_type {
        NodeType::Bff => {
            if fm.method.is_none() {
                errors.push("bff requires `method`".into());
            }
            if fm.path.is_none() {
                errors.push("bff requires `path`".into());
            }
            if fm.runtime.is_none() {
                errors.push("bff requires `runtime`".into());
            }
            if fm.timeout_ms.is_none() {
                errors.push("bff requires `timeout_ms`".into());
            }
        }
        NodeType::Page => {
            if fm.renders.is_empty() && fm.calls.is_empty() {
                errors.push("page requires at least one of `renders` or `calls`".into());
            }
        }
        NodeType::Component | NodeType::Api => {}
    }

    // Every call must reference exactly one of `bff` / `api`.
    for (i, call) in fm.calls.iter().enumerate() {
        match (&call.bff, &call.api) {
            (Some(_), None) | (None, Some(_)) => {}
            _ => errors.push(format!("calls[{i}] must set exactly one of `bff` or `api`")),
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

/// Parse the major component of a `"major.minor"` version string.
fn major(version: &str) -> Option<u32> {
    version.split('.').next()?.parse().ok()
}
