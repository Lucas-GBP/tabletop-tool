# Error Model

Tabletop Tools distinguishes errors that happen while **configuring persistent definitions** from errors that happen while **executing a Scene**.

The governing principle is:

> **Fail fast while configuring; fail gracefully while executing.**

## Configuration / Planning

Persistent data must be valid before it is written.

```text
UI intent
    ↓
Rust command
    ↓
validation
├── valid   → persist
└── invalid → structured error
              no persistence
```

Known-invalid definitions must never be written to SQLite.

Examples include:

- invalid playback region;
- invalid loop region;
- invalid loop crossfade;
- invalid fade duration;
- unsupported or invalid audio file;
- missing referenced entity;
- violated Core invariant.

## Runtime / Session

Runtime errors are non-fatal by default.

```text
runtime operation
    ↓
error
    ↓
report
    ↓
isolate failure
    ↓
continue Scene when possible
```

A failed audio file, playback, Composition layer, or scheduled execution must not automatically terminate:

- `SceneRuntime`;
- `SceneAudioRuntime`;
- `AudioMixer`;
- unrelated playbacks.

A structural runtime failure such as the Web Audio subsystem being unavailable may disable audio, but the Scene itself should remain usable.

## Structured Error Contract

Errors exposed across application boundaries must be structured.

Conceptually:

```text
AppError
├── code
├── message
├── operation?
├── entity_id?
├── details?
└── recoverable
```

### code

A stable machine-readable error identifier.

Examples:

```text
AUDIO_INVALID_LOOP_REGION
AUDIO_DECODE_FAILED
PLAYBACK_NOT_FOUND
DATABASE_ERROR
```

### message

A user-facing description suitable for the application UI.

### operation

Optional name of the operation that failed.

Example:

```text
play
update_audio_object
import_audio
```

### entity_id

Optional UUID of the related persistent entity.

### details

Optional technical diagnostic information.

This field is for logs and debugging rather than primary user messaging.

### recoverable

Indicates whether the current execution can reasonably continue.

## Rust Errors

Rust should use typed internal errors rather than one generic string error.

Conceptually:

```text
AudioValidationError
├── InvalidPlaybackRegion
├── InvalidLoopRegion
├── InvalidCrossfadeDuration
├── InvalidFadeDuration
├── UnsupportedAudioFormat
└── MissingAudioFile
```

Persistence and infrastructure errors remain distinguishable:

```text
PersistenceError
├── Database
└── FileSystem
```

At the Tauri IPC boundary, internal errors are converted to stable error DTOs.

Raw SeaORM, filesystem, or library error strings must not become the public application contract.

## TypeScript Runtime Errors

Runtime-only errors belong to TypeScript.

The shared `RuntimeError` contract contains `code`, `message`, `recoverable`,
and optional `operation`, `entityId`, and `details`. Tool-specific runtime
errors use this structure without requiring a generic ToolRuntime abstraction.

Initial audio examples:

```text
AudioRuntimeError
├── PlaybackNotFound
├── AudioLoadFailed
├── AudioDecodeFailed
├── AudioContextUnavailable
├── PlaybackFailed
└── SchedulingFailed
```

These errors should use the same structured feedback principles as backend errors while remaining a distinct runtime error family.

## Feedback

Errors must be visible and diagnosable from the beginning.

```text
Tool Runtime / Rust command
          ↓
     structured error
          ↓
    application layer
      ├── user feedback
      └── diagnostic log
```

The project should not rely on scattered `console.error()` calls or generic `"something went wrong"` messages as its primary error handling strategy.

The Session runtime orchestration boundary catches transition failures, keeps
the active Session mounted when possible, and exposes both the current
user-facing error and a bounded in-memory diagnostic history to the UI. A
successful later transition clears the current message without persisting or
silently discarding the diagnostic history.

## Persistence Rule

Runtime failures are not persisted as domain state.

Diagnostic logging may be implemented separately, but a failed runtime operation must not mutate persistent definitions unless an explicit persistent command succeeds.
