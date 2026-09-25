# Playback Instance

## Purpose

A Playback Instance represents one concrete, active runtime execution of an
[Audio Object](./audio-object.md).

It is a transient Audio Mixer / Audio Engine concept. It is created when an
Audio Object starts playing and is discarded when that playback finishes.

A Playback Instance is **not persisted** in SQLite.

The same Audio Object may produce multiple simultaneous Playback Instances:

```text
Audio Object "Sword Hit"
├── Playback Instance A
├── Playback Instance B
└── Playback Instance C
```

This distinction allows overlapping playback without placing transient state on
the persistent Audio Object itself.

## Conceptual State

A Playback Instance conceptually owns or exposes:

```text
Playback Instance
├── playback_id
├── audio_object
├── current_position
└── runtime state
```

The exact Rust representation is intentionally left open until the Audio Engine
implementation is selected.

In particular, conceptual playback states do not require a literal one-to-one
Rust enum if the selected audio engine can represent the same semantics more
naturally.

## Identity

Each active Playback Instance has a runtime-only `playback_id`.

The identifier exists so that commands can address one execution independently
of other executions of the same Audio Object.

For example:

```text
pause(playback_id)
stop(playback_id)
finish(playback_id)
```

A Playback Instance identifier does not need persistent identity and does not
need to survive application restarts.

## Source

Each Playback Instance is created from exactly one Audio Object.

The Audio Object remains the source of persistent playback configuration,
including:

- playback region;
- optional loop region;
- volume in decibels;
- fade-in duration;
- fade-out duration;
- optional loop crossfade duration.

The Playback Instance must not duplicate these values as independent persistent
configuration.

## Runtime Position

A Playback Instance has a current playback position within the source Audio
Object's playback region.

Conceptually, this position is expressed using the same microsecond-based time
model used by Audio Object configuration.

The Audio Engine should remain authoritative for the effective playback
position whenever possible. The application should avoid maintaining an
independent software timer that can drift away from the actual audio stream.

## Playback Behavior

The following states describe required behavior conceptually:

```text
Playing
Pausing
Paused
Finishing
Stopping
Finished
```

These names define semantics rather than requiring an exact implementation.

### Start

Starting an Audio Object creates a new Playback Instance:

```text
Audio Object
    │ start
    ▼
Playback Instance
    ├── position = AudioObject.start_time
    └── state = Playing
```

The Audio Object's configured fade-in is applied while playback begins.

## Pause

Calling `pause()` while a Playback Instance is actively playing or finishing:

1. enters a pausing transition;
2. starts the Audio Object's configured fade-out immediately;
3. continues advancing playback while the fade-out is running;
4. preserves the position reached at the end of the fade;
5. becomes paused and silent.

Therefore the preserved position is **not** the position at which the pause
command was initially issued.

Example:

```text
pause requested at 32 s
fade out duration = 2 s

preserved position ≈ 34 s
```

The exact final position remains subject to Audio Engine timing.

## Resume

Calling `resume()` on a paused Playback Instance:

1. continues from the preserved position;
2. applies the Audio Object's configured fade-in again;
3. restores the playback intent that existed before pausing.

If the Playback Instance was finishing before it was paused, resuming continues
in finishing mode. It must not re-enter a loop that had already been scheduled
to end.

Conceptually:

```text
Playing ──pause──> Paused ──resume──> Playing

Finishing ──pause──> Paused ──resume──> Finishing
```

The runtime therefore needs to retain enough information to know which mode
must be restored after a pause.

## Stop

Calling `stop()` while a Playback Instance is audible:

1. immediately starts the configured fade-out;
2. transitions toward termination;
3. becomes finished after the fade;
4. is then discarded.

Conceptually:

```text
Playing / Finishing
        │ stop
        ▼
     Stopping
        │ fade out
        ▼
     Finished
        │
        ▼
     discarded
```

If `stop()` is called while the Playback Instance is already paused, the
instance is already silent and may be terminated and discarded immediately,
without running another fade.

## Finish

`finish()` requests a natural or musical ending rather than an immediate
interruption.

### While Playing

For a looping Audio Object:

1. the current loop iteration is completed through `end_loop_time`;
2. no new loop iteration begins;
3. playback continues through the Audio Object's outro region;
4. the configured fade-out completes at `end_time`;
5. the Playback Instance becomes finished and is discarded.

For an Audio Object without a loop, playback simply continues toward its
natural end using the same fade-out semantics.

### While Paused

If `finish()` is requested while the Playback Instance is already paused, the
instance does not need to resume in order to reach the Audio Object's natural
ending.

Because it is already silent, it may be terminated gracefully and discarded.

This is intentionally different from pausing a Playback Instance that was
already in finishing mode and later calling `resume()`: in that case the prior
finishing intent is preserved unless `finish()` itself is invoked while paused.

## Natural Completion

When playback reaches the Audio Object's `end_time` naturally:

1. the configured natural fade-out has completed;
2. the Playback Instance becomes finished;
3. the Playback Instance is discarded.

There is no persistent history of completed Playback Instances in the initial
model.

## Lifetime

Playback Instances exist only for the lifetime of active or paused playback.

```text
created
   ↓
active / paused
   ↓
finished
   ↓
discarded
```

When the application closes, all Playback Instances disappear.

A later application launch starts with no active Playback Instances.

Persisting or restoring active playback state is explicitly outside the initial
scope.

## Memory and Resource Cleanup

A finished Playback Instance is disposable.

The Audio Engine should release the instance and any runtime resources owned
exclusively by it once completion is reached and no engine-level cleanup remains
pending.

"Graceful" disposal means required audio-engine cleanup must be completed; it
does not imply persistence or retention of the instance after playback has
ended.

Every completed or cancelled Web Audio source is disconnected together with
any gain node owned only by that source. Timers are cancelled on pause, stop,
finish, or disposal as appropriate, preventing nodes and callbacks from growing
without bound during long-running crossfade loops.

## Scope Boundary

A Playback Instance controls exactly one execution of one Audio Object.

It does not know about:

- Audio List;
- Audio Composition;
- Audio Trigger;
- Scene;
- Scene Level.

Higher-level Audio Mixer concepts may create or control Playback Instances, but
the Playback Instance itself remains independent of those concepts.

For example:

```text
Audio List
    │ selects
    ▼
Audio Object
    │ creates
    ▼
Playback Instance
```

and later:

```text
Audio Composition
├── Audio Object A ──> Playback Instance A
├── Audio Object B ──> Playback Instance B
└── Audio List ──────> selected Audio Object ──> Playback Instance C
```

## Persistence Boundary

The following are runtime-only and must not be stored as Audio Object data:

- current position;
- current playback state;
- active fade progress;
- loop iteration state;
- finish request state;
- resume mode;
- decoder or output handles;
- sample-buffer state.

These values belong to the Playback Instance and/or Audio Engine.

## Implementation Boundary

Playback Instance semantics are part of the Audio Mixer runtime model, but
implementation details remain Audio Engine concerns.

The domain documentation should not require a specific representation for:

- decoder state;
- audio buffers;
- output-device handles;
- scheduler internals;
- fade automation primitives;
- loop implementation;
- thread/task synchronization.

The selected audio library may implement these mechanisms differently as long
as the observable Playback Instance semantics remain equivalent.

## Related Components

- [Audio Object](./audio-object.md)
- [Audio Asset Reference](./audio-file.md)
- [Audio List](./audio-list.md)
- [Audio Composition](./audio-composition.md)

## Open Questions

None currently for the initial Playback Instance model.
