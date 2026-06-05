//! karta-core CLI — crawls a repo's MDX docs into a `registry.json`.
//!
//! Thin wrapper over [`karta_core::crawl`]: the whole pipeline lives in the
//! library so the CLI and the tests share one code path.

use clap::{Parser, Subcommand};
use karta_core::emitter;
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
    }
}
