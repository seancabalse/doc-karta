//! File discovery: locate MDX doc files under a crawl root.

use std::path::{Path, PathBuf};

/// Find all candidate MDX doc files under `root`.
///
/// TODO(P1): walk the tree with `walkdir`, filter by the config's doc globs
/// (`globset`, default `**/docs/**/*.mdx`), and respect `.gitignore`.
pub fn find_mdx_files(_root: &Path) -> Vec<PathBuf> {
    Vec::new()
}
