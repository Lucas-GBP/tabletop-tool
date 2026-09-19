# Architecture

## Purpose

`tabletop-tools` is structured around a system-agnostic Core Domain and a set of
specialized tools that operate on top of that domain.

The central architectural decision is that Campaign, Session, Scene, and
Scene Level are fundamental concepts of the application and must remain
independent from any individual tool or tabletop ruleset.

Specialized capabilities such as audio mixing, initiative tracking, and combat
encounter preparation belong to separate Scene Tools.

## Architectural Overview

```text
Tabletop Tools
│
├── Core Domain
│   ├── Campaign
│   ├── Session
│   ├── Scene
│   └── Scene Level
│
└── Scene Tools
    ├── Audio Mixer
    ├── Initiative Tracker
    ├── Encounter Builder
    └── ...
```

The dependency direction is one-way:

```text
Scene Tools
    │
    │ depend on
    ▼
Core Domain
```

The Core Domain must not depend on Scene Tools.

## Core Domain

The [Core Domain](./domain/README.md) defines the stable concepts used to
organize tabletop content.

Current concepts:

- [Campaign](./domain/campaign.md)
- [Session](./domain/session.md)
- [Scene](./domain/scene.md)
- [Scene Level](./domain/scene-level.md)

These concepts are intentionally independent from:

- audio playback;
- initiative rules;
- encounter-building rules;
- game-system-specific mechanics;
- frontend technologies;
- persistence technologies.

A Scene must remain a valid Scene even when no specialized Scene Tool is
configured for it.

## Scene Tools

[Scene Tools](./tools/README.md) provide capabilities for preparing, composing,
or running Scenes.

Current and anticipated examples include:

- [Audio Mixer](./tools/audio-mixer/README.md)
- Initiative Tracker
- Encounter Builder

A Scene Tool may reference Core Domain concepts and keep tool-specific state
associated with them.

A Scene Tool must not redefine the meaning of Campaign, Session, Scene, or
Scene Level.

## Dependency Rule

Tool-specific concepts point toward the Core Domain.

For example, an Audio Trigger associated with a Scene Level should conceptually
reference that Scene Level:

```text
Audio Trigger ───────▶ Scene Level
```

The Scene Level should not need to know that Audio Trigger exists:

```text
Scene Level ──X──▶ Audio Trigger
```

This prevents the Core Domain from accumulating tool-specific properties.

For example, the following kind of structure should be avoided conceptually:

```text
Scene
├── audio_config
├── initiative_config
├── encounter_config
├── lighting_config
└── ...
```

Instead, each tool should own its own concepts and data.

## Ruleset Independence

The Core Domain is ruleset-agnostic.

Rules such as:

- initiative modifiers;
- armor class;
- challenge rating;
- action economy;
- spell slots;
- conditions specific to one game system;

must not become properties of the Core Domain merely because one Scene Tool
needs them.

Ruleset-specific behavior belongs to the relevant tool or to a future
ruleset-specific extension.

## Solution Architecture

`tabletop-tools` is a strictly local desktop application. It does not require a
remote application backend or remote database.

The current solution architecture is:

```text
Presentation
    Vite + React + TypeScript + SCSS Modules
         │
         ▼
 Typed Tauri IPC (Specta + tauri-specta)
         │
         ▼
Rust Application Layer
    ├── Core Domain
    ├── Scene Tools
    ├── Audio Engine
    └── Persistence
         ├── SeaORM → SQLite
         │      structured application data
         │
         └── Local Filesystem
                audio, images, videos, and other binary assets
```

All application data that is not itself a file is persisted in SQLite through
SeaORM. Binary assets are stored in the local filesystem rather than as database
blobs. SQLite stores the structured metadata and references required to locate
and manage those files.

See [Persistence](./persistence/README.md) and [Frontend Architecture](./frontend/README.md).

These are solution-level decisions. The Core Domain remains independent from
Tauri, SeaORM, SQLite, and filesystem details.

## Architectural Invariants

- Campaign, Session, Scene, and Scene Level are tool-agnostic.
- The Core Domain does not depend on Scene Tools.
- Scene Tools may depend on the Core Domain.
- A Scene remains valid without any Scene Tool configured.
- Tool-specific data belongs to the tool that owns the behavior.
- Ruleset-specific concepts do not leak into the Core Domain.
- New Scene Tools should be introducible without changing the fundamental Scene
  model.
- Implementation technologies must not define the meaning of domain concepts.
- The application is local-first by construction and requires no remote backend.
- Structured data is persisted through SeaORM in SQLite.
- Binary assets are stored in the local filesystem, not as SQLite blobs.
- Rust is the source of truth for Tauri IPC contracts; TypeScript bindings are generated with Specta + tauri-specta.

## Extensibility

The architecture should support additional built-in Scene Tools without requiring
changes to the Core Domain.

This does **not** currently imply a dynamic plugin architecture.

A plugin system should only be introduced if there is a concrete requirement
for independently developed or dynamically loaded tools.

## Persistence Boundary

The persistence technologies are decided, while the logical and physical schemas
are still to be designed.

- **SeaORM + SQLite** persist all structured application data.
- **Local filesystem** stores binary files such as audio, images, and videos.
- SQLite stores file metadata and references, not the binary asset contents.

The persistence model must preserve the architectural boundaries defined above.
Tool-specific data should remain owned by its tool instead of accumulating as
unrelated fields in Core Domain records.

The filesystem layout and database schema are implementation concerns and should
be derived from domain lifecycles, ownership rules, and access patterns.

See [Persistence](./persistence/README.md).

## Open Questions

- How should Scene Tools attach persistent state to Scene or Scene Level?
- Should a tool be enabled globally, per Campaign, per Scene, or per Scene Level?
- Which future tools are entirely system-agnostic?
- How should ruleset-specific extensions interact with generic tools?
- Should reusable Scene state be separated from state produced during a specific
  Session or Campaign?
- How should database records reference managed files without coupling domain concepts to filesystem paths?
- What ownership and cleanup rules prevent orphaned database records or orphaned files?
