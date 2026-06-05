//! Load the crawl config from `.docviz/config.ts`.
//!
//! Phase-1 shortcut: `config.ts` is TypeScript, but the only values the Rust
//! core needs (`project` and `include`) are simple literals in the exported
//! object. Rather than embed a JS engine, we extract them with lightweight
//! string scanning. Full `config.ts` evaluation belongs in the JS wrapper, which
//! can `import` the file natively and pass resolved values in later.

use std::fs;
use std::path::Path;

/// The crawl inputs the core needs from `.docviz/config.ts`.
pub struct CrawlConfig {
    pub project: String,
    pub include: Vec<String>,
}

/// Read and extract `{root}/.docviz/config.ts`.
pub fn load(root: &Path) -> Result<CrawlConfig, String> {
    let path = root.join(".docviz/config.ts");
    let src =
        fs::read_to_string(&path).map_err(|e| format!("failed to read {}: {e}", path.display()))?;

    // Only scan the exported object, so the `DocvizConfig` interface declaration
    // above it (which also has `project:` / `include:`) is ignored.
    let body = src
        .split_once("export default")
        .map(|(_, rest)| rest)
        .unwrap_or(&src);

    let project = string_after(body, "project")
        .ok_or_else(|| format!("`project` not found in {}", path.display()))?;
    let include = string_array_after(body, "include")
        .ok_or_else(|| format!("`include` not found in {}", path.display()))?;
    if include.is_empty() {
        return Err(format!("`include` is empty in {}", path.display()));
    }

    Ok(CrawlConfig { project, include })
}

/// Read the first quoted string in `s`, returning it plus the byte offset just
/// past the closing quote.
fn first_quoted(s: &str) -> Option<(String, usize)> {
    let start = s.find(['\'', '"'])?;
    let quote = &s[start..start + 1];
    let rest = &s[start + 1..];
    let end = rest.find(quote)?;
    Some((rest[..end].to_string(), start + 1 + end + 1))
}

/// The first quoted string appearing after `key:`.
fn string_after(src: &str, key: &str) -> Option<String> {
    let pos = src.find(&format!("{key}:"))?;
    first_quoted(&src[pos..]).map(|(val, _)| val)
}

/// Every quoted string inside the `[ ... ]` array literal following `key:`.
fn string_array_after(src: &str, key: &str) -> Option<Vec<String>> {
    let pos = src.find(&format!("{key}:"))?;
    let after = &src[pos..];
    let open = after.find('[')?;
    let close = after[open..].find(']')? + open;
    let mut inner = &after[open + 1..close];

    let mut out = Vec::new();
    while let Some((val, next)) = first_quoted(inner) {
        out.push(val);
        inner = &inner[next..];
    }
    Some(out)
}
