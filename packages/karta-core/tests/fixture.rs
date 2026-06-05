//! Phase-1 acceptance test (PER-5): the crawler reproduces the hand-authored
//! oracle for the synthetic fixture repo.

use std::path::Path;

#[test]
fn crawl_matches_expected_registry() {
    // CARGO_MANIFEST_DIR is packages/karta-core; the fixture is at the repo root.
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/sample-repo");

    let registry = karta_core::crawl(&fixture).expect("crawl should succeed");
    let actual = serde_json::to_value(&registry).expect("serialize registry");

    let oracle = std::fs::read_to_string(fixture.join("expected-registry.json"))
        .expect("read expected-registry.json");
    let expected: serde_json::Value = serde_json::from_str(&oracle).expect("parse oracle");

    assert_eq!(actual, expected);
}
