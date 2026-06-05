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
pub mod secrets;
pub mod validator;

use notify::{recommended_watcher, Event, RecursiveMode, Watcher};
use schema::Registry;
use std::path::Path;
use std::sync::mpsc::{channel, RecvTimeoutError};
use std::time::Duration;

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

/// Scan every doc matched by the config's `include` globs for likely secrets.
///
/// Returns the list of findings (`Err`) so the caller can fail the build, or
/// `Ok(())` when the docs are clean. Separate from [`crawl`] on purpose: it
/// gates `build` and the pre-commit hook, not interactive `watch`.
pub fn scan(root: &Path) -> Result<(), Vec<String>> {
    let config = config::load(root).map_err(|e| vec![e])?;
    let findings = secrets::scan_files(root, &config.include);
    if findings.is_empty() {
        Ok(())
    } else {
        Err(findings)
    }
}

/// Debounce window: editors emit several filesystem events per save, so a burst
/// is coalesced into one re-crawl once things go quiet.
const DEBOUNCE: Duration = Duration::from_millis(150);

/// Watch `root` and re-crawl on every relevant change, blocking forever.
///
/// `on_event` is called once up front with the initial crawl, then again after
/// each debounced burst of `.mdx`/`.docviz` changes. The watcher re-crawls
/// in-process — no per-change subprocess — so steady-state cost is just the
/// crawl itself.
pub fn watch(root: &Path, mut on_event: impl FnMut(Result<Registry, String>)) -> Result<(), String> {
    on_event(crawl(root));

    let (tx, rx) = channel::<notify::Result<Event>>();
    let mut watcher = recommended_watcher(move |res| {
        let _ = tx.send(res);
    })
    .map_err(|e| e.to_string())?;
    watcher
        .watch(root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    loop {
        // Block until something happens, then drain the burst within the window.
        let mut relevant = match rx.recv() {
            Ok(ev) => is_relevant(&ev),
            Err(_) => return Ok(()), // watcher dropped
        };
        loop {
            match rx.recv_timeout(DEBOUNCE) {
                Ok(ev) => relevant |= is_relevant(&ev),
                Err(RecvTimeoutError::Timeout) => break,
                Err(RecvTimeoutError::Disconnected) => return Ok(()),
            }
        }
        if relevant {
            on_event(crawl(root));
        }
    }
}

/// Only doc sources move the graph — ignore editor swap files, build output, etc.
fn is_relevant(ev: &notify::Result<Event>) -> bool {
    let Ok(ev) = ev else { return false };
    ev.paths.iter().any(|p| {
        p.extension().is_some_and(|ext| ext == "mdx")
            || p.components().any(|c| c.as_os_str() == ".docviz")
    })
}
