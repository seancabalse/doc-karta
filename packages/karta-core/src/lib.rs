//! karta-core: crawl a repo's MDX docs into a `registry.json`.
//!
//! The pipeline runs `config -> crawl -> parse -> validate -> resolve`. It is
//! exposed as the [`crawl`] function so both the CLI (`main.rs`) and the
//! integration tests drive the exact same path.

pub mod config;
pub mod crawler;
pub mod emitter;
pub mod graph;
pub mod parser;
pub mod schema;
pub mod validator;

use schema::Registry;
use std::path::Path;

/// Run the full crawl pipeline against `root` and return the resolved registry.
///
/// Parse/validate/resolve errors across all files are collected and returned as
/// a single newline-joined message. A dangling reference is an error — "a broken
/// reference is a build error".
pub fn crawl(root: &Path) -> Result<Registry, String> {
    let config = config::load(root)?;
    let files = crawler::find_mdx_files(root, &config.include);

    let mut docs = Vec::new();
    let mut errors: Vec<String> = Vec::new();
    for path in &files {
        match parser::parse_file(root, path) {
            Ok(doc) => match validator::validate(&doc.frontmatter) {
                Ok(()) => docs.push(doc),
                Err(errs) => errors.extend(errs.into_iter().map(|e| format!("{}: {e}", doc.source_path))),
            },
            Err(err) => errors.push(format!("{}: {err}", path.display())),
        }
    }

    if !errors.is_empty() {
        return Err(errors.join("\n"));
    }

    graph::build_registry(&config.project, &docs).map_err(|errs| errs.join("\n"))
}
