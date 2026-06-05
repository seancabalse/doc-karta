//! Resolve parsed docs into a node/edge registry.

use crate::parser::ParsedDoc;
use crate::schema::{
    qualified_id, EdgeKind, Registry, RegistryEdge, RegistryNode, SCHEMA_VERSION,
};
use std::collections::HashMap;

/// Resolve `docs` into a [`Registry`]: build fully-qualified node ids, turn
/// `renders` / `calls` into edges, and fail on dangling or duplicate references
/// — a broken reference is a build error, not a warning.
///
/// Nodes are sorted by `id` and edges by `(from, to)` for a deterministic
/// output that matches the hand-authored oracle.
pub fn build_registry(project: &str, docs: &[ParsedDoc]) -> Result<Registry, Vec<String>> {
    let mut errors = Vec::new();

    // Build nodes and a lookup from bare node-id -> fully-qualified id. Bare ids
    // are what `calls` / `renders` reference; they must be unique within a project.
    let mut nodes = Vec::with_capacity(docs.len());
    let mut lookup: HashMap<&str, String> = HashMap::new();
    for doc in docs {
        let fm = &doc.frontmatter;
        let qid = qualified_id(project, &doc.library, &fm.id);
        if let Some(existing) = lookup.insert(&fm.id, qid.clone()) {
            errors.push(format!(
                "duplicate node id `{}` ({existing} and {qid})",
                fm.id
            ));
        }
        nodes.push(RegistryNode {
            id: qid,
            node_type: fm.node_type,
            title: fm.title.clone(),
            status: fm.status,
            project: project.to_string(),
            library: doc.library.clone(),
            owner: fm.owner.clone(),
            audience: fm.audience.clone(),
            source_path: doc.source_path.clone(),
        });
    }

    // Resolve edges. A bare id absent from the lookup is a dangling reference.
    let mut edges = Vec::new();
    for doc in docs {
        let fm = &doc.frontmatter;
        let from = qualified_id(project, &doc.library, &fm.id);

        for target in &fm.renders {
            push_edge(&lookup, &from, target, EdgeKind::Renders, doc, &mut edges, &mut errors);
        }
        for call in &fm.calls {
            // The validator guarantees exactly one of bff/api is set.
            if let Some(target) = call.bff.as_deref().or(call.api.as_deref()) {
                push_edge(&lookup, &from, target, EdgeKind::Calls, doc, &mut edges, &mut errors);
            }
        }
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    nodes.sort_by(|a, b| a.id.cmp(&b.id));
    edges.sort_by(|a, b| (&a.from, &a.to).cmp(&(&b.from, &b.to)));

    Ok(Registry {
        version: SCHEMA_VERSION.to_string(),
        nodes,
        edges,
    })
}

#[allow(clippy::too_many_arguments)]
fn push_edge(
    lookup: &HashMap<&str, String>,
    from: &str,
    target: &str,
    kind: EdgeKind,
    doc: &ParsedDoc,
    edges: &mut Vec<RegistryEdge>,
    errors: &mut Vec<String>,
) {
    match lookup.get(target) {
        Some(to) => edges.push(RegistryEdge {
            from: from.to_string(),
            to: to.clone(),
            kind,
        }),
        None => errors.push(format!(
            "{}: reference to unknown node `{target}`",
            doc.source_path
        )),
    }
}
