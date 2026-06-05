//! File discovery: locate MDX doc files under a crawl root.

use globset::{Glob, GlobSetBuilder};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Find all MDX doc files under `root` whose path (relative to `root`) matches
/// one of the config's `include` globs. The result is sorted for determinism.
///
/// TODO(later): respect `.gitignore` and config `exclude` globs.
pub fn find_mdx_files(root: &Path, include: &[String]) -> Vec<PathBuf> {
    let mut builder = GlobSetBuilder::new();
    for pattern in include {
        if let Ok(glob) = Glob::new(pattern) {
            builder.add(glob);
        }
    }
    let set = match builder.build() {
        Ok(set) => set,
        Err(_) => return Vec::new(),
    };

    let mut files: Vec<PathBuf> = WalkDir::new(root)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file())
        .filter(|entry| {
            entry
                .path()
                .strip_prefix(root)
                .map(|rel| set.is_match(rel))
                .unwrap_or(false)
        })
        .map(walkdir::DirEntry::into_path)
        .collect();
    files.sort();
    files
}
