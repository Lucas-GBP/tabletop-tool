# Audio Mixer

The **Audio Mixer** is a runtime service responsible for executing playable
audio and managing active playback instances for one owning context.

It is not a persistent domain entity. A running Session and an editor preview
may own separate mixers so their playbacks and disposal remain isolated.

```text
Application
    ↓
AudioMixer
    ↓
PlaybackInstances
    ↓
Audio Engine
    ↓
Audio Output
```

## Responsibilities

The Audio Mixer has a deliberately small set of responsibilities:

- execute an `AudioCue`;
- resolve an `AudioList` to an `AudioObject` when necessary;
- create and retain active `Playback Instance`s;
- remove playback instances after they finish;
- control individual playbacks through `PlaybackId`;
- provide aggregate operations over active playbacks;
- apply application audio-output settings such as master volume.

The Audio Mixer does **not** own scene logic, composition scheduling, or Scene Level state.

Higher-level runtime objects such as `Audio Composition Instance` send commands to the Mixer.

## Audio Cue

The Mixer accepts an `AudioCue` rather than requiring callers to distinguish between concrete playable types.

```text
AudioCue
├── AudioObject
└── AudioList
```

This is an architectural invariant for ordinary playback consumers:

> Components requesting playable audio should depend on `AudioCue`, not on whether the source is concretely an `AudioObject` or `AudioList`.

When the cue is an `AudioObject`:

```text
AudioMixer.play(AudioObject)
    ↓
create PlaybackInstance
```

When the cue is an `AudioList`:

```text
AudioMixer.play(AudioList)
    ↓
select AudioObject according to list policy
    ↓
create PlaybackInstance
```

`AudioComposition` is not an `AudioCue`. Compositions have their own lifecycle and runtime state.

## Playback Identity

Executing a cue returns a lightweight runtime identifier:

```text
play(AudioCue) -> PlaybackId
```

`PlaybackId` identifies one active `Playback Instance`.

It is intentionally not a controlling object or handle. Keeping only an identifier avoids retaining an object whose underlying playback may already have finished.

If a playback no longer exists, an operation using its old `PlaybackId` must report that the playback was not found rather than keeping the playback alive.

## Active Playback Storage

The Mixer owns the active playback instances:

```text
AudioMixer
└── active_playbacks
    ├── PlaybackInstance A
    ├── PlaybackInstance B
    └── PlaybackInstance C
```

When a playback reaches its terminal state:

```text
PlaybackInstance
    ↓ Finished
remove from active_playbacks
```

No finished playback is retained merely because another component still holds its old `PlaybackId`.

## Conceptual Runtime API

The exact Rust API is intentionally deferred, but the runtime contract is conceptually:

```text
play(AudioCue) -> PlaybackId

pause(PlaybackId)
resume(PlaybackId)
stop(PlaybackId)
finish(PlaybackId)

active_playbacks() -> PlaybackInfo[]

pause_all()
resume_all()
stop_all()
```

Additional aggregate operations may be added only when concrete use cases require them.

## Playback Information

External consumers should not receive mutable access to internal `Playback Instance`s.

When inspection is needed, the Mixer returns read-only information/snapshots such as:

```text
PlaybackInfo
├── id
├── source
├── state
└── current_position
```

The exact fields remain deferred until the runtime UI requires them.

The important distinction is:

```text
PlaybackId
    runtime identity

PlaybackInstance
    internal mutable runtime state

PlaybackInfo
    external read-only view
```

## Relationship with Audio Composition

An `Audio Composition Instance` is a higher-level runtime object that coordinates
layers and sends playback commands to the Mixer owned by the same runtime context.

```text
AudioCompositionInstance
    ↓
AudioMixer.play(AudioCue)
    ↓
PlaybackId
```

The composition instance may retain `PlaybackId`s when it needs to later pause, stop, or finish those executions.

The IDs do not keep playback instances alive.

RandomInterval scheduling, enabled/disabled layers, and composition reconciliation remain responsibilities of the composition runtime, not the Mixer.

## Application Audio Settings

Application settings provide the initial configuration for each Mixer.

Initial settings include:

```text
master_volume_db
output_device
```

### Master Volume

Master volume is represented in decibels, consistently with `AudioObject.volume_db`.

It applies globally on top of per-object gain.

`master_volume_db` is persistent application configuration and must survive application restarts.

Conceptually:

```text
SQLite
  ↓
AudioMixerSettings
  ↓
AudioMixer
```

Changes to master volume must update both the active Mixer state and persisted settings.
Interactive changes update the active gain immediately. Persistence is debounced
until the value settles, avoiding an IPC write for every slider pixel. Runtime
UI exposes the current value and the last persisted default separately while a
save is pending.

### Output Device

The selected output device belongs to application audio configuration.

The concrete device identifier may depend on the audio backend and operating system, so the domain-facing representation must not unnecessarily expose backend-specific types.

Whether the selected output device is persisted across application restarts is intentionally left open until device-discovery behavior is designed.

## Persistence Boundary

The Mixer itself and all active playback instances are runtime-only.

Persisted:

```text
AudioMixerSettings
└── master_volume_db
```

Runtime-only:

```text
AudioMixer
PlaybackInstance
PlaybackId
PlaybackInfo
active_playbacks
```

The selected output-device persistence policy remains undecided.

## Lifetime

Each active audio context owns one Audio Mixer. Creating a Session runtime or an
isolated preview may therefore create a separate Mixer.

```text
Owning context starts
    ↓
create AudioMixer
    ↓
load persistent settings
    ↓
run application
    ↓
owning context ends
    ↓
destroy AudioMixer and runtime playback state
```

Playback state is not restored after application restart.

## Architectural Boundary

The Mixer is intentionally a low-level runtime service.

It should remain unaware of:

- `Scene`;
- `Scene Level`;
- Campaign lifecycle;
- why a cue was requested;
- why a composition activated or deactivated;
- UI input mechanisms.

Those higher-level concerns issue commands to the Mixer.

```text
UI / Composition Runtime / Application Logic
                    ↓
                AudioMixer
                    ↓
              Audio Engine
```

## Explicitly Out of Scope

The initial Mixer model does not define:

- a universal event-to-audio binding system;
- Scene or Scene Level reconciliation;
- composition scheduling;
- persisted playback state;
- playback handles that own or retain instances;
- web/network audio synchronization;
- audio-bus/group architecture beyond a Mixer's master output.

## Direct Command Model

The initial architecture does not place an `AudioTrigger` abstraction between application events and the Mixer.

Consumers that need to execute playable audio call the Mixer directly:

```text
Button / UI handler
    ↓
AudioMixer.play(AudioCue)
```

Higher-level runtime components do the same:

```text
AudioCompositionInstance
    ↓
AudioMixer.play(AudioCue)
```

This keeps the Mixer API explicit and avoids introducing an intermediate abstraction without independent state or behavior.

If event-to-audio mappings later become user-configurable and persistent — for example keyboard, MIDI, or scene-event bindings — a dedicated binding model may be introduced at that time.

## Relationship with Scene Runtime

An `AudioMixer` is lower-level than Scene execution.

```text
SceneRuntime
    ↓
SceneAudioRuntime
    ↓
AudioCompositionInstance / direct AudioCue requests
    ↓
AudioMixer
    ↓
PlaybackInstance
```

Scene-specific volatile state, including runtime Composition-layer overrides, does not belong to the Mixer.

The Mixer remains unaware of `Scene` and `SceneLevel`.

## Implementation Location

The initial `AudioMixer` implementation lives in TypeScript and uses the Web Audio API.

```text
TypeScript
AudioMixer
    ↓
PlaybackInstance
    ↓
Web Audio API
```

Rust does not run a native audio engine in the initial architecture.

Rust remains responsible for persistent audio definitions, scanning the configured
asset root, returning transient metadata, and resolving relative paths safely.

The TypeScript Mixer receives the information required to execute an `AudioCue` through the application/IPC boundary.

This decision keeps high-frequency runtime operations such as pause, resume, gain changes, scheduling, and playback cleanup inside the frontend runtime instead of performing an IPC round-trip for each operation.

## Decoded Audio Cache

Each Mixer owns a cache of decoded `AudioBuffer`s. The cache has an explicit
byte limit calculated from decoded PCM size and evicts the least recently used
buffers first. A buffer used by an active Playback Instance stays pinned until
that playback finishes, so eviction never invalidates active audio. Streaming
and peak extraction outside the WebView remain future options that require
measurement before implementation.

## Loop Crossfade

Loop crossfade is required in the initial implementation.

When `loop_crossfade_duration_us` is zero or absent, normal Web Audio loop behavior may be used.

When crossfade is enabled, `PlaybackInstance` may schedule overlapping `AudioBufferSourceNode`s and automate their gains so that the outgoing loop iteration fades out while the next iteration begins at the loop start and fades in.

Scheduling and logical playback position use the same effective cycle:

```text
effective_loop_cycle = loop_region_duration - loop_crossfade_duration
```

This implementation detail is hidden from Mixer consumers.

The persistent invariant is:

```text
0 < loop_crossfade_duration < loop_region_duration
```

Additional implementation-level safety limits may be introduced if required to prevent invalid overlapping schedules.

## Scene Ownership

The initial architecture has no global playback scope.

Every runtime playback is associated with the currently executing Scene.

Leaving that Scene:

- stops its active playbacks using normal playback fade-out semantics;
- cancels Composition timers and schedulers;
- discards Composition runtime instances;
- discards Scene audio runtime overrides.

Audio that conceptually needs to continue through a transition should normally be modeled inside one Scene using multiple SceneLevels.
