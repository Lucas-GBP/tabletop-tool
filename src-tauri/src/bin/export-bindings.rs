use std::{env, error::Error, io, path::PathBuf};

fn main() -> Result<(), Box<dyn Error>> {
    let mut args = env::args_os().skip(1);
    let output = args.next().map(PathBuf::from).unwrap_or_else(|| {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../src/shared/api/bindings.ts")
    });

    if args.next().is_some() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "usage: export-bindings [output-path]",
        )
        .into());
    }

    tabletop_tool_lib::ipc::builder().export(specta_typescript::Typescript::default(), &output)?;
    println!("Generated {}", output.display());
    Ok(())
}
