//! Secrets scanner: flag likely-leaked credentials in doc sources.
//!
//! BFF docs describe real infra (env URLs, hostnames, header names) and authors
//! paste from `.env` — a key that lands in a stakeholder-facing build or in git
//! history is a security incident. The scanner reads the raw `.mdx` source
//! (frontmatter + body) and reports matches as errors.
//!
//! It is intentionally a separate pass from `crawl`: it gates `build` and the
//! optional pre-commit hook, but does not block `dev`/`watch` authoring.
//!
//! A line is skipped when it — or the line directly above it — contains the
//! marker `karta-allow-secret`, so authors can keep an intentional example
//! (a sample JWT, a base64 payload) without disabling the scanner.

use crate::crawler;
use regex::Regex;
use std::fs;
use std::path::Path;

/// One detected secret: its 1-based line, the rule that fired, and a redacted
/// preview (never the full match — scan output ends up in CI logs).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Finding {
    pub line: usize,
    pub rule: &'static str,
    pub redacted: String,
}

/// Marker that suppresses a finding on its own line or the line below it.
const IGNORE_MARKER: &str = "karta-allow-secret";

/// Detection rules, ordered most-specific first so a JWT/AWS key isn't also
/// double-reported as a generic base64 blob (see the overlap check below).
fn rules() -> Vec<(&'static str, Regex)> {
    vec![
        // scheme://user:pass@host
        (
            "url-credentials",
            Regex::new(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^\s/@:]+:[^\s/@]+@").unwrap(),
        ),
        // AWS access key id
        (
            "aws-access-key",
            Regex::new(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b").unwrap(),
        ),
        // JWT: header.payload.signature, both header and payload base64url `{"…`
        (
            "jwt",
            Regex::new(r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}").unwrap(),
        ),
        // Generic base64 blob (noisy — the inline-ignore marker is its release valve)
        ("base64-blob", Regex::new(r"[A-Za-z0-9+/]{50,}={0,2}").unwrap()),
    ]
}

/// Scan raw document text and return every finding, honoring the inline-ignore
/// marker and de-duplicating overlapping matches (most specific rule wins).
pub fn scan_text(text: &str) -> Vec<Finding> {
    let rules = rules();
    let lines: Vec<&str> = text.lines().collect();
    let mut findings = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if line.contains(IGNORE_MARKER) || (i > 0 && lines[i - 1].contains(IGNORE_MARKER)) {
            continue;
        }
        // Byte ranges already claimed by a more specific rule on this line.
        let mut claimed: Vec<(usize, usize)> = Vec::new();
        for (name, re) in &rules {
            for m in re.find_iter(line) {
                let (s, e) = (m.start(), m.end());
                if claimed.iter().any(|&(cs, ce)| s < ce && cs < e) {
                    continue;
                }
                claimed.push((s, e));
                findings.push(Finding {
                    line: i + 1,
                    rule: name,
                    redacted: redact(m.as_str()),
                });
            }
        }
    }
    findings
}

/// Mask the middle of a match: keep the first and last 4 chars so a human can
/// recognize it, but never reprint the full secret. Short matches are fully
/// masked.
fn redact(s: &str) -> String {
    let chars: Vec<char> = s.chars().collect();
    let n = chars.len();
    if n <= 8 {
        return "********".to_string();
    }
    let head: String = chars[..4].iter().collect();
    let tail: String = chars[n - 4..].iter().collect();
    format!("{head}…{tail}")
}

/// Scan every doc matched by `include` under `root`. Each finding is formatted
/// as `<source_path>:<line>: <rule>: <redacted>`.
pub fn scan_files(root: &Path, include: &[String]) -> Vec<String> {
    let mut out = Vec::new();
    for path in crawler::find_mdx_files(root, include) {
        let Ok(text) = fs::read_to_string(&path) else {
            continue;
        };
        let rel = path.strip_prefix(root).unwrap_or(&path);
        let source_path = rel.to_string_lossy().replace('\\', "/");
        for f in scan_text(&text) {
            out.push(format!("{source_path}:{}: {}: {}", f.line, f.rule, f.redacted));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn rules_hit(text: &str) -> Vec<&'static str> {
        scan_text(text).into_iter().map(|f| f.rule).collect()
    }

    #[test]
    fn flags_url_credentials() {
        assert_eq!(rules_hit("db at postgres://admin:hunter2@db.internal"), ["url-credentials"]);
    }

    #[test]
    fn ignores_url_without_credentials() {
        assert!(rules_hit("see https://api.example.com:8080/v1/portfolio").is_empty());
    }

    #[test]
    fn flags_aws_access_key() {
        assert_eq!(rules_hit("key AKIAIOSFODNN7EXAMPLE rotated"), ["aws-access-key"]);
    }

    #[test]
    fn flags_jwt_once_not_also_base64() {
        let jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        assert_eq!(rules_hit(&format!("token: {jwt}")), ["jwt"]);
    }

    #[test]
    fn flags_long_base64_blob() {
        let blob = "A".repeat(60);
        assert_eq!(rules_hit(&format!("payload {blob}")), ["base64-blob"]);
    }

    #[test]
    fn clean_text_has_no_findings() {
        let doc = "---\nid: get-portfolio\ntype: bff\n---\n\n# Get Portfolio\n\nAggregates holdings.";
        assert!(scan_text(doc).is_empty());
    }

    #[test]
    fn redaction_keeps_only_ends() {
        let f = &scan_text("key AKIAIOSFODNN7EXAMPLE here")[0];
        assert_eq!(f.redacted, "AKIA…MPLE");
    }

    #[test]
    fn inline_ignore_same_line_suppresses() {
        let doc = "key AKIAIOSFODNN7EXAMPLE <!-- karta-allow-secret -->";
        assert!(scan_text(doc).is_empty());
    }

    #[test]
    fn inline_ignore_line_above_suppresses() {
        let doc = "<!-- karta-allow-secret -->\nkey AKIAIOSFODNN7EXAMPLE";
        assert!(scan_text(doc).is_empty());
    }

    #[test]
    fn reports_line_numbers() {
        let doc = "clean line\nkey AKIAIOSFODNN7EXAMPLE";
        let findings = scan_text(doc);
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].line, 2);
    }
}
