//! Serialize a [`Registry`] to JSON.

use crate::schema::Registry;

/// Serialize `registry` to pretty-printed JSON.
pub fn to_json(registry: &Registry) -> Result<String, String> {
    serde_json::to_string_pretty(registry).map_err(|err| err.to_string())
}
