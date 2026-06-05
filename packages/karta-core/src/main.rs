//! karta-core CLI — crawls a repo's MDX docs into a `registry.json`.
//!
//! Skeleton: the pipeline is wired end to end (crawl -> parse -> validate ->
//! resolve -> emit) but the stages are stubs. `crawl` currently emits an empty
//! registry. The Phase-1 issue fills in the stages against the fixture repo.

mod crawler;
mod emitter;
mod graph;
mod parser;
mod schema;
mod validator;

use clap::{Parser, Subcommand};
use std::path::PathBuf;

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
        Command::Crawl { root } => {
            let files = crawler::find_mdx_files(&root);
            let docs: Vec<parser::ParsedDoc> = files
                .iter()
                .filter_map(|path| match parser::parse_file(path) {
                    Ok(doc) => match validator::validate(&doc.frontmatter) {
                        Ok(()) => Some(doc),
                        Err(errs) => {
                            eprintln!("validation failed for {}: {errs:?}", path.display());
                            None
                        }
                    },
                    Err(err) => {
                        eprintln!("parse failed for {}: {err}", path.display());
                        None
                    }
                })
                .collect();

            let registry = graph::build_registry(&docs);
            match emitter::to_json(&registry) {
                Ok(json) => println!("{json}"),
                Err(err) => eprintln!("emit failed: {err}"),
            }
        }
    }
}
