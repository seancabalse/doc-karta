//! Parse a single MDX file into typed frontmatter + body.

use crate::schema::Frontmatter;
use std::path::Path;

/// Parsed result of one MDX doc.
pub struct ParsedDoc {
    pub frontmatter: Frontmatter,
    pub body: String,
}

/// Read `path`, split the `---` fenced YAML frontmatter from the MDX body, and
/// deserialize the frontmatter into [`Frontmatter`].
///
/// TODO(P1): extract the leading YAML fence, `serde_yaml::from_str` it, and
/// return the remaining markdown body.
pub fn parse_file(_path: &Path) -> Result<ParsedDoc, String> {
    Err("parser not yet implemented".into())
}
