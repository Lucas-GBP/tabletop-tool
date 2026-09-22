# Rust ↔ TypeScript IPC Contracts

## Decision

`tabletop-tools` uses **Specta + tauri-specta** for the contract boundary between
Rust and TypeScript.

Rust is the source of truth for Tauri IPC-facing types, commands, and events.
TypeScript bindings are generated from that Rust contract instead of being
manually duplicated.

```text
Rust IPC Contracts
      │
      ▼
Specta + tauri-specta
      │
      ▼
Generated TypeScript Bindings
      │
      ▼
React Frontend
```

## Motivation

The boundary between the Tauri backend and React frontend is statically typed on
both sides. Maintaining equivalent Rust and TypeScript definitions manually
would create two sources of truth and allow them to silently diverge.

Generated bindings make changes to the Rust contract visible to the TypeScript
compiler and reduce manual synchronization work.

## Boundary Rule

Only types that belong to the IPC/application contract should be exposed through
Specta.

The following concepts remain separate:

```text
Domain Model
     │
     ▼
Application / IPC Contract
     │
     ▼
Specta + tauri-specta
     │
     ▼
TypeScript Binding
```

A domain entity must not automatically become an IPC DTO merely because the
frontend needs related data. Likewise, SeaORM entities are persistence models
and must not define the frontend contract.

For example:

```text
Scene (Domain)
     │
     ▼
SceneDto / CreateSceneInput (IPC Contract)
     │
     ▼
Generated TypeScript
```

This avoids coupling the domain model, persistence schema, IPC protocol, and
frontend representation into one structure.

## Frontend Usage

Frontend components should consume the generated typed API through a small
frontend service/API boundary rather than calling raw `invoke()` throughout the
component tree.

```text
React Component
      │
      ▼
Frontend Service / API
      │
      ▼
Generated tauri-specta Binding
      │
      ▼
Tauri IPC
```

This keeps IPC details out of visual components and gives the frontend one
consistent application-facing interface.

## Generated Code

Generated TypeScript bindings are build artifacts derived from the Rust
contract. They must not be hand-edited.

Generated bindings are committed at `src/api/bindings.ts`. The command
registry in `src-tauri/src/ipc/` is shared by the desktop invocation handler and
the headless `export-bindings` binary, enabled through the Rust `bindings` feature.

- Run `npm run bindings:generate` after changing an IPC contract.
- Run `npm run check:bindings` to generate a temporary copy and compare it with
  the committed file, without modifying that file. A mismatch fails the check.
- CI runs this check on Windows, Linux, and macOS. Line-ending differences are
  normalized; contract differences are not.
- Generated bindings are excluded from lint/format rewriting but remain part of
  TypeScript type checking.

The Core commands exercise this pipeline with generated DTOs for Campaign,
Session, Scene, SceneLevel, and SessionScene. See
[Development Setup](../../DEVELOPMENT.md).

## Persistent vs Runtime Commands

Tauri IPC is primarily used to cross the persistent-definition boundary.

Persistent operations flow through Rust:

```text
React intent
    ↓
generated IPC command
    ↓
Rust validation/application logic
    ↓
SeaORM / filesystem
```

Pure runtime operations should stay in TypeScript when they do not require native capabilities:

```text
React intent
    ↓
SceneRuntime / Tool runtime
    ↓
runtime state or Web Audio
```

For example, changing a persisted `SceneLevelAudioConfiguration` uses IPC. Temporarily muting a layer during Scene execution does not.

This distinction avoids unnecessary IPC traffic and prevents runtime state from accidentally becoming persistent state.
