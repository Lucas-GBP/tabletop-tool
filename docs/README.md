# Tabletop Tools Documentation

This directory contains the architectural and domain documentation for
`tabletop-tools`.

The project is currently in the architecture and domain-design phase. The
documentation therefore focuses on concepts, responsibilities, boundaries,
dependencies, invariants, and open questions rather than implementation details.

## Architecture

Start with:

- [Architecture Overview](./ARCHITECTURE/ARCHITECTURE.md)
- [Core Domain](./ARCHITECTURE/domain/README.md)
- [Scene Tools](./ARCHITECTURE/tools/README.md)
- [Audio Mixer](./ARCHITECTURE/tools/audio-mixer/README.md)
- [Persistence](./ARCHITECTURE/persistence/README.md)
- [Frontend Architecture](./ARCHITECTURE/frontend/README.md)

## Documentation Principles

The documentation is written in portable Markdown so it can be read in Obsidian,
GitHub, VS Code, and other Markdown-compatible tools.

The current architecture documentation distinguishes:

- **Domain concepts** — what exists in the problem space.
- **Architectural boundaries** — which parts of the system may depend on which.
- **Invariants** — conditions that must always remain valid.
- **Lifecycle rules** — how valid states are created and changed.
- **Tool-specific concepts** — functionality that belongs to a Scene Tool rather
  than to the Core Domain.
- **Open questions** — decisions intentionally left unresolved until there is
  enough information to make them responsibly.

Implementation choices such as concrete database tables, Rust modules, frontend
components, and IPC contracts should be derived from these documents rather than
treated as part of the domain model itself.

## Current Solution Decisions

`tabletop-tools` is a strictly local application.

- Structured application data is persisted locally in SQLite through SeaORM.
- Binary files such as audio, images, and videos are stored in the local filesystem.
- SQLite stores structured metadata and references needed to locate and manage those files; binary assets are not stored as database blobs.
- The application does not require a remote application backend or remote database.

See [Persistence](./ARCHITECTURE/persistence/README.md).

## Current Frontend Decisions

- Vite + React + TypeScript are used for the frontend.
- Components are styled with SCSS Modules and a primitive-component design system.
- Rust IPC contracts are exported to TypeScript with Specta + tauri-specta instead of being manually duplicated.
- Frontend quality tooling uses `tsc --noEmit`, ESLint + typescript-eslint, Stylelint + `stylelint-config-standard-scss`, and Prettier.
- Rust quality tooling uses rustfmt, Clippy with warnings denied in CI, and `cargo test`.
