//! karta-core CLI — crawls a repo's MDX docs into a `registry.json`.
//!
//! Thin wrapper over [`karta_core::crawl`]: the whole pipeline lives in the
//! library so the CLI and the tests share one code path.

use clap::{Parser, Subcommand};
use karta_core::emitter;
use karta_core::schema::Registry;
use std::io::Write;
use std::path::PathBuf;
use std::process::exit;

#[derive(Parser)]
#[command(name = "karta-core", version, about = "doc-karta Rust core")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Crawl a repo's docs and emit registry.json to stdout.
    Crawl {
        /// Root of the repo to crawl.
        root: PathBuf,
    },
    /// Watch a repo and stream registry updates as newline-delimited JSON.
    ///
    /// Each line is `{"ok":true,"registry":{…}}` on success or
    /// `{"ok":false,"error":"…"}` when the crawl fails (a broken reference is a
    /// build error). Emits the initial crawl immediately, then on every change.
    Watch {
        /// Root of the repo to watch.
        root: PathBuf,
    },
    /// Scan a repo's docs for likely secrets. Exits non-zero if any are found.
    Scan {
        /// Root of the repo to scan.
        root: PathBuf,
    },
}

fn main() {
    let cli = Cli::parse();
    match cli.command {
        Command::Crawl { root } => match karta_core::crawl(&root) {
            Ok(registry) => match emitter::to_json(&registry) {
                Ok(json) => println!("{json}"),
                Err(err) => {
                    eprintln!("emit failed: {err}");
                    exit(1);
                }
            },
            Err(err) => {
                eprintln!("crawl failed:\n{err}");
                exit(1);
            }
        },
        Command::Watch { root } => {
            let emit = |res: Result<Registry, String>| {
                let line = match res {
                    Ok(registry) => serde_json::json!({ "ok": true, "registry": registry }),
                    Err(error) => serde_json::json!({ "ok": false, "error": error }),
                };
                println!("{line}");
                // stdout is piped to the dev server — flush so updates arrive live.
                let _ = std::io::stdout().flush();
            };
            if let Err(err) = karta_core::watch(&root, emit) {
                eprintln!("watch failed: {err}");
                exit(1);
            }
        }
        Command::Scan { root } => match karta_core::scan(&root) {
            Ok(()) => println!("✓ no secrets detected"),
            Err(findings) => {
                eprintln!("secrets detected ({}):", findings.len());
                for f in &findings {
                    eprintln!("  {f}");
                }
                exit(1);
            }
        },
    }
}
