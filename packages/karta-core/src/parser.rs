//! Parse a single MDX file into typed frontmatter + body.

use crate::schema::Frontmatter;
use std::fs;
use std::path::Path;

/// Parsed result of one MDX doc, plus the path context the resolver needs.
pub struct ParsedDoc {
    pub frontmatter: Frontmatter,
    pub body: String,
    /// Source path relative to the crawl root, with `/` separators.
    pub source_path: String,
    /// The library this doc belongs to: the directory containing `docs/`.
    pub library: String,
}

/// Read `path`, split the leading `---` fenced YAML frontmatter from the MDX
/// body, deserialize the frontmatter, and derive its `source_path`/`library`.
pub fn parse_file(root: &Path, path: &Path) -> Result<ParsedDoc, String> {
    let raw = fs::read_to_string(path).map_err(|e| format!("read failed: {e}"))?;
    let (yaml, body) = split_frontmatter(&raw)?;
    let frontmatter: Frontmatter =
        serde_yaml::from_str(yaml).map_err(|e| format!("invalid frontmatter: {e}"))?;

    let source_path = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/");
    let library =
        library_name(path).ok_or_else(|| "could not derive library (no `docs/` ancestor)".to_string())?;

    Ok(ParsedDoc {
        frontmatter,
        body: body.trim_start().to_string(),
        source_path,
        library,
    })
}

/// Split `---`-fenced YAML frontmatter from the markdown body.
fn split_frontmatter(raw: &str) -> Result<(&str, &str), String> {
    let raw = raw.strip_prefix('\u{feff}').unwrap_or(raw);
    let after_open = raw
        .strip_prefix("---\n")
        .or_else(|| raw.strip_prefix("---\r\n"))
        .ok_or("missing opening `---` fence")?;
    let end = after_open
        .find("\n---")
        .ok_or("missing closing `---` fence")?;
    let yaml = &after_open[..end];
    let body = &after_open[end + "\n---".len()..];
    Ok((yaml, body))
}

/// The library name: the path component immediately before the `docs/` segment.
fn library_name(path: &Path) -> Option<String> {
    let comps: Vec<&str> = path.iter().filter_map(|c| c.to_str()).collect();
    let docs_idx = comps.iter().position(|&c| c == "docs")?;
    if docs_idx == 0 {
        return None;
    }
    Some(comps[docs_idx - 1].to_string())
}
