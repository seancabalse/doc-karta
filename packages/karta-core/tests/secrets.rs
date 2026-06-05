//! Integration test for the secrets scanner against a dedicated fixture with
//! planted (fake) secrets. Kept separate from `fixtures/sample-repo` so the
//! crawl oracle test stays unaffected.

use std::path::Path;

#[test]
fn flags_planted_secrets_and_honors_inline_ignore() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/secrets-scan");
    let findings = match karta_core::scan(&fixture) {
        Ok(()) => panic!("expected the planted secrets to be flagged"),
        Err(f) => f,
    };

    // The AWS key and the credentialed env URL in leaky.mdx are flagged.
    assert!(
        findings.iter().any(|f| f.contains("docs/leaky.mdx") && f.contains("aws-access-key")),
        "expected an aws-access-key finding, got: {findings:?}"
    );
    assert!(
        findings.iter().any(|f| f.contains("docs/leaky.mdx") && f.contains("url-credentials")),
        "expected a url-credentials finding, got: {findings:?}"
    );

    // The base64 blob carries an inline-ignore marker, so it must not appear.
    assert!(
        !findings.iter().any(|f| f.contains("base64-blob")),
        "inline-ignored base64 blob should be suppressed, got: {findings:?}"
    );

    // The clean doc contributes nothing.
    assert!(
        !findings.iter().any(|f| f.contains("docs/clean.mdx")),
        "clean.mdx should have no findings, got: {findings:?}"
    );
}
