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

AudioFile
AudioObject
AudioList
AudioComposition

SceneAudioConfiguration
SceneLevelAudioConfiguration
```

Rust is responsible for:

- persistence through SeaORM and SQLite;
- filesystem import and management;
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
├── AudioFile definitions
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

## Access to Imported Audio Files

Imported audio files are managed by Rust under application data storage:

```text
AppData/
└── media/
    └── audio/
        └── <uuid>.<extension>
```

Rust owns import, validation, naming, and persistent metadata.

When TypeScript needs to play a file, Rust exposes the persistent definition/path information through the application contract and Tauri provides a frontend-readable asset URL.

The frontend does not own the physical file lifecycle.

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
