# Implementation Readiness

Status: **READY FOR IMPLEMENTATION**

The initial architecture for the Core Domain and Audio Mixer is sufficiently defined to begin implementation.

Further architecture-first modeling should stop unless implementation reveals a concrete ambiguity or missing requirement.

## Core Domain

- `Campaign`, `Session`, `Scene`, and `SceneLevel` defined.
- Entity identity uses UUID.
- User-visible Core definitions have a non-empty display name; surrounding
  whitespace is removed before persistence.
- Campaign, Session, Scene, and SceneLevel expose basic create, read,
  rename, and delete operations.
- SessionScene associations can be added and removed without deleting their
  reusable Scene.
- `Session` belongs to exactly one `Campaign`.
- A `Campaign` always contains at least one `Session`.
- Creating a `Campaign` creates its first `Session`.
- Creating a `Campaign` atomically creates an independent initial `Scene`,
  its first `SceneLevel`, and the initial `SessionScene` association.
- Creating an additional `Session` requires an existing `Scene` for that
  Session's initial `SessionScene` association.
- `Scene` is reusable across Sessions.
- `Session` and `Scene` have an N:N relationship through `SessionScene`.
- The same `Scene` cannot appear more than once in the same `Session`.
- A `Scene` always contains at least one `SceneLevel`.
- Creating a `Scene` creates its first `SceneLevel`.
- Deleting a `Campaign` deletes its Sessions and their `SessionScene` associations.
- Deleting a `Session` does not delete Scenes.
- The last `Session` of a Campaign cannot be deleted directly.
- Deleting a `Scene` deletes its SceneLevels and Session associations.
- Deleting a `Scene` is rejected before mutation if an affected `Session`
  would otherwise become empty.
- The last `SceneLevel` of a Scene cannot be deleted directly.
- Ordering uses dense integer `position` values starting at zero.
- Insert, remove, and reorder operations keep positions normalized.

## Persistence

- SQLite is the structured-data store.
- SeaORM is the Rust persistence layer.
- Migrations are used from the beginning.
- Binary files are not stored as SQLite BLOBs.
- The user configures one general asset root for the application.
- Supported audio files are discovered recursively and referenced in place.
- The application does not copy, rename, or delete source asset files.
- Rust owns directory scanning, media probing, and safe relative-path resolution.
- The absolute asset root is stored once; persistent definitions store relative paths.
- The discovered file catalog is transient and has no persistent `AudioFile` entity.
- Referenced missing files remain in their owning definitions and are reported as unavailable.

## Persistent vs Runtime Boundary

- Persistent definitions and runtime state are separate concepts.
- Rust is the default authority over persistent definitions.
- TypeScript is the default authority over volatile Scene execution.
- Runtime changes never implicitly modify persistent definitions.
- `SceneRuntime` survives SceneLevel changes.
- `SceneRuntime` is discarded when leaving the Scene.
- Application shutdown discards runtime state.
- Core Domain never depends on Tools.
- Tools may depend on Core Domain.
- No generic `ToolRuntime` Rust trait is introduced before multiple Tools demonstrate a stable shared API.

## Persistent Audio Model

- Transient audio-asset discovery defined for WAV, MP3, OGG, FLAC, M4A, AAC, and WebM.
- `AudioObject` defined.
- `AudioObject` stores a normalized path relative to the configured asset root.
- `AudioList` defined.
- `AudioCue = AudioObject | AudioList`.
- `AudioComposition` is not an AudioCue.
- Volume is stored in dB.
- Time values are stored as integer microseconds.
- Playback region defined.
- Optional loop region defined.
- Fade-in and fade-out defined.
- Loop crossfade is a required first-version feature.
- `AudioList` supports Sequential, Random, and WeightedRandom.
- Random modes allow immediate repetition.
- WeightedRandom uses positive relative integer weights.
- Sequential cursor is runtime-only.
- Composition layers use Continuous or RandomInterval activation.
- RandomInterval allows overlapping executions.
- Layer disable behavior is Stop or Finish.
- All Composition layers are ON by default.

## Scene Audio Configuration

- A Scene may expose zero or more AudioCues.
- A Scene may expose zero or more AudioCompositions.
- Audio resources may be reused across Scenes.
- Direct Scene AudioCues are available during every SceneLevel.
- Every Composition belonging to a Scene is available to every SceneLevel.
- SceneLevel configuration stores only Composition-layer overrides from the default ON state.
- Runtime layer overrides take precedence over SceneLevel overrides.
- Runtime overrides survive SceneLevel changes.
- Runtime overrides are discarded when leaving the Scene or closing the application.

## Audio Runtime

- The initial audio engine is the Web Audio API.
- No native Rust audio engine is required initially.
- `AudioMixer` lives in TypeScript.
- `PlaybackInstance` lives in TypeScript.
- `AudioCompositionInstance` lives in TypeScript.
- `SceneAudioRuntime` lives in TypeScript.
- `AudioMixer.play(AudioCue) -> PlaybackId`.
- Mixer owns active PlaybackInstances.
- Finished PlaybackInstances are removed.
- `PlaybackId` does not retain playback ownership.
- `PlaybackInfo` is a read-only runtime snapshot.
- Pause/resume semantics defined.
- Stop semantics defined.
- Finish semantics defined.
- Fade-in/fade-out required.
- Loop region required.
- Loop crossfade required.
- Crossfade loops may use overlapping scheduled Web Audio sources.
- Master volume is persistent configuration represented in dB.
- Initial output uses the system/default WebView audio output.
- No global audio scope exists initially.
- All runtime audio belongs to the current Scene.
- Leaving a Scene stops its audio, cancels timers, discards CompositionInstances and runtime overrides.
- Continuous state that must survive a transition should normally be modeled as SceneLevels of the same Scene rather than separate Scenes.

## Error Handling

- Invalid persistent configuration is rejected before saving.
- Rust uses typed validation/persistence errors.
- IPC exposes structured stable error DTOs.
- Runtime errors are non-fatal by default.
- A failed playback or layer does not terminate unrelated Scene runtime.
- Runtime errors are structured and diagnosable.
- User-facing feedback and technical diagnostic context are distinct.
- Rust persistent errors and TypeScript runtime errors remain distinguishable.
- General policy: **fail fast while configuring; fail gracefully while executing**.

## Open but Non-Blocking

These decisions intentionally remain open and must not delay implementation:

- explicit output-device selection;
- persistence of output-device selection;
- Scene export/import format;
- restoring runtime state after application restart;
- global audio spanning multiple Scenes;
- common generic Tool runtime abstraction;
- Encounter Tool implementation details;
- final shape of individual IPC DTOs;
- future native-audio backend if a concrete requirement appears.

## Development Process From This Point

The project now moves from architecture-first design to implementation-driven refinement:

```text
current documentation
        ↓
implementation
        ↓
tests
        ↓
concrete ambiguity/problem
        ↓
small architectural decision or ADR
        ↓
continue implementation
```

Do not continue speculative modeling when no implementation requirement demands it.

## Initial Implementation Order

```text
1. Workspace and project skeleton
2. Core Domain
3. Core tests and invariants
4. SeaORM entities and migrations
5. Persistent audio definitions
6. General asset-root settings and transient audio discovery
7. IPC DTOs and generated TypeScript bindings
8. TypeScript runtime foundations
9. Web Audio PlaybackInstance
10. AudioMixer
11. AudioComposition runtime
12. SceneAudioConfiguration / SceneLevelAudioConfiguration integration
13. SceneAudioRuntime
14. SceneRuntime integration
```

## Audio Object Editor UX

The initial AudioObject editor has the following implementation requirements:

- available audio assets come from a recursive scan of the configured asset root;
- one searchable, folder-filterable, refreshable picker creates an object or replaces its asset;
- choosing an asset for creation immediately persists the object and opens its editor;
- missing assets remain replaceable and display warnings on affected definitions and Scenes;
- selected audio is represented by a waveform;
- playback region can be created and edited directly by dragging over the waveform;
- optional loop region can be created and edited directly by dragging;
- region edges resize the selection;
- dragging a selected region moves it;
- numeric inputs remain synchronized with visual regions;
- unsaved draft can be previewed;
- preview respects region, loop, crossfade, fades, and volume;
- preview displays a playback playhead;
- pointer edits remain frontend-local until explicit Save;
- Rust validates the final draft before persistence.

These are UX/implementation requirements and do not reopen the architectural readiness decision.
