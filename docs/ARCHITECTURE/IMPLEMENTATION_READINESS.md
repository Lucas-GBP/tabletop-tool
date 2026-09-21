# Implementation Readiness

Status: **READY FOR IMPLEMENTATION**

The initial architecture for the Core Domain and Audio Mixer is sufficiently defined to begin implementation.

Further architecture-first modeling should stop unless implementation reveals a concrete ambiguity or missing requirement.

## Core Domain

- [x] `Campaign`, `Session`, `Scene`, and `SceneLevel` defined.
- [x] Entity identity uses UUID.
- [x] User-visible Core definitions have a non-empty display name; surrounding
      whitespace is removed before persistence.
- [x] `Session` belongs to exactly one `Campaign`.
- [x] A `Campaign` always contains at least one `Session`.
- [x] Creating a `Campaign` creates its first `Session`.
- [x] Creating a `Campaign` atomically creates an independent initial `Scene`,
      its first `SceneLevel`, and the initial `SessionScene` association.
- [x] Creating an additional `Session` requires an existing `Scene` for that
      Session's initial `SessionScene` association.
- [x] `Scene` is reusable across Sessions.
- [x] `Session` and `Scene` have an N:N relationship through `SessionScene`.
- [x] The same `Scene` cannot appear more than once in the same `Session`.
- [x] A `Scene` always contains at least one `SceneLevel`.
- [x] Creating a `Scene` creates its first `SceneLevel`.
- [x] Deleting a `Campaign` deletes its Sessions and their `SessionScene` associations.
- [x] Deleting a `Session` does not delete Scenes.
- [x] The last `Session` of a Campaign cannot be deleted directly.
- [x] Deleting a `Scene` deletes its SceneLevels and Session associations.
- [x] Deleting a `Scene` is rejected before mutation if an affected `Session`
      would otherwise become empty.
- [x] The last `SceneLevel` of a Scene cannot be deleted directly.
- [x] Ordering uses dense integer `position` values starting at zero.
- [x] Insert, remove, and reorder operations keep positions normalized.

## Persistence

- [x] SQLite is the structured-data store.
- [x] SeaORM is the Rust persistence layer.
- [x] Migrations are used from the beginning.
- [x] Binary files are not stored as SQLite BLOBs.
- [x] User audio is imported into application-managed storage.
- [x] Initial audio storage path is conceptually `AppData/media/audio/`.
- [x] Each import creates a new physical copy.
- [x] Physical filenames are UUID-based.
- [x] No content deduplication is performed.
- [x] Rust owns filesystem import and persistent metadata.

## Persistent vs Runtime Boundary

- [x] Persistent definitions and runtime state are separate concepts.
- [x] Rust is the default authority over persistent definitions.
- [x] TypeScript is the default authority over volatile Scene execution.
- [x] Runtime changes never implicitly modify persistent definitions.
- [x] `SceneRuntime` survives SceneLevel changes.
- [x] `SceneRuntime` is discarded when leaving the Scene.
- [x] Application shutdown discards runtime state.
- [x] Core Domain never depends on Tools.
- [x] Tools may depend on Core Domain.
- [x] No generic `ToolRuntime` Rust trait is introduced before multiple Tools demonstrate a stable shared API.

## Persistent Audio Model

- [x] `AudioFile` defined.
- [x] `AudioObject` defined.
- [x] `AudioList` defined.
- [x] `AudioCue = AudioObject | AudioList`.
- [x] `AudioComposition` is not an AudioCue.
- [x] Volume is stored in dB.
- [x] Time values are stored as integer microseconds.
- [x] Playback region defined.
- [x] Optional loop region defined.
- [x] Fade-in and fade-out defined.
- [x] Loop crossfade is a required first-version feature.
- [x] `AudioList` supports Sequential, Random, and WeightedRandom.
- [x] Random modes allow immediate repetition.
- [x] WeightedRandom uses positive relative integer weights.
- [x] Sequential cursor is runtime-only.
- [x] Composition layers use Continuous or RandomInterval activation.
- [x] RandomInterval allows overlapping executions.
- [x] Layer disable behavior is Stop or Finish.
- [x] All Composition layers are ON by default.

## Scene Audio Configuration

- [x] A Scene may expose zero or more AudioCues.
- [x] A Scene may expose zero or more AudioCompositions.
- [x] Audio resources may be reused across Scenes.
- [x] Direct Scene AudioCues are available during every SceneLevel.
- [x] Every Composition belonging to a Scene is available to every SceneLevel.
- [x] SceneLevel configuration stores only Composition-layer overrides from the default ON state.
- [x] Runtime layer overrides take precedence over SceneLevel overrides.
- [x] Runtime overrides survive SceneLevel changes.
- [x] Runtime overrides are discarded when leaving the Scene or closing the application.

## Audio Runtime

- [x] The initial audio engine is the Web Audio API.
- [x] No native Rust audio engine is required initially.
- [x] `AudioMixer` lives in TypeScript.
- [x] `PlaybackInstance` lives in TypeScript.
- [x] `AudioCompositionInstance` lives in TypeScript.
- [x] `SceneAudioRuntime` lives in TypeScript.
- [x] `AudioMixer.play(AudioCue) -> PlaybackId`.
- [x] Mixer owns active PlaybackInstances.
- [x] Finished PlaybackInstances are removed.
- [x] `PlaybackId` does not retain playback ownership.
- [x] `PlaybackInfo` is a read-only runtime snapshot.
- [x] Pause/resume semantics defined.
- [x] Stop semantics defined.
- [x] Finish semantics defined.
- [x] Fade-in/fade-out required.
- [x] Loop region required.
- [x] Loop crossfade required.
- [x] Crossfade loops may use overlapping scheduled Web Audio sources.
- [x] Master volume is persistent configuration represented in dB.
- [x] Initial output uses the system/default WebView audio output.
- [x] No global audio scope exists initially.
- [x] All runtime audio belongs to the current Scene.
- [x] Leaving a Scene stops its audio, cancels timers, discards CompositionInstances and runtime overrides.
- [x] Continuous state that must survive a transition should normally be modeled as SceneLevels of the same Scene rather than separate Scenes.

## Error Handling

- [x] Invalid persistent configuration is rejected before saving.
- [x] Rust uses typed validation/persistence errors.
- [x] IPC exposes structured stable error DTOs.
- [x] Runtime errors are non-fatal by default.
- [x] A failed playback or layer does not terminate unrelated Scene runtime.
- [x] Runtime errors are structured and diagnosable.
- [x] User-facing feedback and technical diagnostic context are distinct.
- [x] Rust persistent errors and TypeScript runtime errors remain distinguishable.
- [x] General policy: **fail fast while configuring; fail gracefully while executing**.

## Open but Non-Blocking

These decisions intentionally remain open and must not delay implementation:

- [ ] explicit output-device selection;
- [ ] persistence of output-device selection;
- [ ] Scene export/import format;
- [ ] restoring runtime state after application restart;
- [ ] global audio spanning multiple Scenes;
- [ ] common generic Tool runtime abstraction;
- [ ] Encounter Tool implementation details;
- [ ] final shape of individual IPC DTOs;
- [ ] future native-audio backend if a concrete requirement appears.

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
6. Audio-file import/storage
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

- [x] available AudioFiles are listed from persistent application data;
- [x] selected audio is represented by a waveform;
- [x] playback region can be created and edited directly by dragging over the waveform;
- [x] optional loop region can be created and edited directly by dragging;
- [x] region edges resize the selection;
- [x] dragging a selected region moves it;
- [x] numeric inputs remain synchronized with visual regions;
- [x] unsaved draft can be previewed;
- [x] preview respects region, loop, crossfade, fades, and volume;
- [x] preview displays a playback playhead;
- [x] pointer edits remain frontend-local until explicit Save;
- [x] Rust validates the final draft before persistence.

These are UX/implementation requirements and do not reopen the architectural readiness decision.
