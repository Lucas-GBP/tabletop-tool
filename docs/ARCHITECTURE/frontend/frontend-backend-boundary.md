# Frontend / Backend Responsibility Boundary

Tabletop Tools uses a deliberate architectural split between persistent definitions and volatile runtime execution.

The default responsibility boundary is:

```text
Rust / Backend
──────────────
Persistent definitions
Persistence
Filesystem management
Application invariants
IPC contracts

TypeScript / Frontend Runtime
─────────────────────────────
Scene execution state
Tool runtime state
Audio playback state
Interaction-driven transient state
Web Audio API
```

This split is based on **lifetime and responsibility**, not on the assumption that all business logic belongs to one language.

## Core Rule

> Rust is the authority over persistent definitions. TypeScript is the authority over transient Scene execution state.

Conceptually:

```text
SQLite / Filesystem
        ↑↓
       Rust
        │
        │ Tauri IPC
        ▼
   TypeScript Runtime
        │
        ▼
      WebView
```

## Rust Responsibilities

Rust owns data that must remain correct across application restarts.

Examples:

```text
Campaign
Session
Scene
SceneLevel

AppSettings asset root
AudioObject
AudioList
AudioComposition

SceneAudioConfiguration
SceneLevelAudioConfiguration
```

Rust is responsible for:

- persistence through SeaORM and SQLite;
- configured-root scanning, media probing, and safe relative-path resolution;
- domain invariants;
- creation/deletion/reordering rules;
- validation before persistent mutation;
- stable IPC DTOs and commands.

The frontend must not modify SQLite directly.

## TypeScript Runtime Responsibilities

TypeScript owns state whose lifetime is limited to a running Scene or application process.

Examples:

```text
SceneRuntime
SceneAudioRuntime
AudioCompositionInstance
PlaybackInstance
AudioMixer
runtime layer overrides
active PlaybackIds
```

This runtime state is intentionally not persisted in the initial architecture.

Changing runtime state must not implicitly mutate persistent definitions.

```text
Runtime State ─X→ Persistent Definition
```

## Audio Runtime

Audio playback uses the Web Audio API in the WebView.

```text
Rust
├── transient AudioAsset catalog
├── AudioObject definitions with relative paths
├── AudioObject definitions
├── AudioList definitions
├── AudioComposition definitions
└── persistent Scene audio configuration

            ↓ Tauri IPC

TypeScript
├── SceneAudioRuntime
├── AudioCompositionInstance
├── AudioMixer
└── PlaybackInstance
            ↓
      Web Audio API
```

The Web Audio API is the initial audio engine.

No native Rust audio engine is required for the first implementation.

## Why the Audio Mixer Lives in TypeScript

The Mixer manages transient playback state:

```text
AudioMixer
└── Map<PlaybackId, PlaybackInstance>
```

Its responsibilities include:

- playing an `AudioCue`;
- managing active playback instances;
- pause/resume/stop/finish;
- master runtime gain;
- scheduling and fades;
- removing finished instances.

These operations map directly to Web Audio primitives and do not need a Rust round-trip for every runtime interaction.

## Access to audio assets

The user selects one filesystem directory as the application's asset root:

```text
configured asset root/
├── ambience.ogg
└── music/
    └── theme.flac
```

Rust scans supported files recursively and returns a transient catalog with
relative paths and probed metadata. SQLite stores the absolute root once and
each owning definition stores its relative path. There is no persistent
`AudioFile` entity. The files remain in place; the application does not copy,
rename, or delete them.

When TypeScript needs to play a file, Rust safely resolves the definition's
relative path below the configured root and Tauri provides a frontend-readable
asset URL.

The user owns the physical file lifecycle. A referenced file that disappears
remains as a relative path in its `AudioObject`; availability and warnings are
derived from the current catalog.

## IPC Boundary

IPC transports definitions and explicit application commands.

Typical direction:

```text
TypeScript
    ↓ request persistent data
Rust
    ↓ DTO
TypeScript runtime
```

Persistent mutation:

```text
TypeScript UI intent
    ↓
Tauri command
    ↓
Rust application/domain validation
    ↓
SeaORM / filesystem
```

Runtime-only mutation:

```text
TypeScript UI intent
    ↓
TypeScript runtime object
    ↓
Web Audio / runtime state
```

No IPC is required when a change is purely volatile and frontend-owned.

## DTO Boundary

SeaORM entities, domain entities, and IPC DTOs remain distinct concepts.

```text
SeaORM Entity
      ↓
Domain / Application
      ↓
IPC DTO
      ↓
generated TypeScript contract
```

Specta + `tauri-specta` remain the intended mechanism for generating TypeScript IPC contracts from Rust.

The frontend must not manually duplicate Rust contracts when generation is possible.

## This Is a Default, Not an Absolute Rule

The architecture should not become dogmatic.

If a future runtime feature genuinely requires native capabilities, deterministic native processing, or OS-level integration, that runtime component may live in Rust.

Therefore:

```text
Persistent → Rust      # strong default
Runtime    → TypeScript # strong default
```

not:

```text
Persistent == always Rust
Runtime    == always TypeScript
```

A deviation should be justified by a concrete requirement.

## Examples

### Editing an AudioObject

```text
React form
    ↓
Tauri command
    ↓
Rust validates
    ↓
SQLite updated
```

Persistent.

### Muting a Composition Layer During a Session

```text
React interaction
    ↓
SceneAudioRuntime
    ↓
runtime override
    ↓
AudioMixer reconciliation
```

Volatile.

No SQLite update occurs.

### Damaging a Monster During an Encounter

```text
EncounterRuntime
current_hp: 12 → 4
```

Volatile.

The persistent encounter definition remains unchanged.

## Architectural Consequence

Configuration mode and execution mode are different application workflows.

```text
CONFIGURATION
─────────────
edit persistent definitions
        ↓
       Rust
        ↓
SQLite / filesystem

EXECUTION
─────────
instantiate definitions
        ↓
TypeScript runtime
        ↓
volatile interaction state
```

The UI may expose both workflows, but they must not blur their state semantics.
