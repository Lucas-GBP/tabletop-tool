# Audio Object

## Purpose

An Audio Object is the smallest directly playable persistent concept in the
Audio Mixer domain.

It stores exactly one relative [audio asset reference](./audio-file.md) and
defines how a specific region of that file should behave when reproduced.

An Audio Object is a reusable playback definition. It is **not** an active
playback instance and does not store transient runtime state such as the
current playback position, whether it is paused, or the progress of an active
fade.

## Properties

Conceptually, an Audio Object contains:

```text
Audio Object
├── asset_path
├── volume_db
│
├── playback_region
│   ├── start_time_us
│   └── end_time_us
│
├── loop_region [optional]
│   ├── start_loop_time_us
│   └── end_loop_time_us
│
├── fade_in_duration_us
├── fade_out_duration_us
└── loop_crossfade_duration_us [optional]
```

### Asset path

Every Audio Object stores one normalized path relative to the configured asset
root. The path is persistent; the discovered file metadata is transient.

Multiple Audio Objects may store the same asset path while selecting
different playback regions or applying different playback behavior.

For example, a single source file may be reused as an intro, a looping section,
or another independently configured playable object without duplicating the
underlying file.

### Volume

`volume_db` is expressed in decibels (dB).

Both positive and negative values are valid. `0 dB` represents the nominal
reference level of the Audio Object; negative values attenuate it and positive
values apply gain.

The persistent/domain representation remains in decibels. Conversion to a
linear gain factor is an Audio Engine concern and should only occur where the
playback implementation requires it.

### Time Representation

Persistent time positions and durations are represented as integer
microseconds.

This applies to:

- `start_time_us`;
- `end_time_us`;
- `start_loop_time_us`;
- `end_loop_time_us`;
- `fade_in_duration_us`;
- `fade_out_duration_us`;
- `loop_crossfade_duration_us`.

The UI may display or accept friendlier units such as seconds, but conversions
must occur at the application boundary rather than changing the canonical
persistent representation.

## Playback Region

The playback region defines the portion of the resolved asset file that belongs to the
Audio Object:

```text
Asset file
0 ------------------------------------------------ duration

Audio Object
        start_time ---------------- end_time
```

The Audio Object never intentionally plays outside this region.

## Optional Loop Region

Looping is optional. An Audio Object without a loop region plays from
`start_time` to `end_time` once.

When a loop region exists, playback proceeds from `start_time` toward
`start_loop_time`, then repeatedly reproduces the region between
`start_loop_time` and `end_loop_time` until the active playback is instructed
to finish or is interrupted.

```text
start       loop start            loop end       end
  │             │                    │            │
  ▼             ▼                    ▼            ▼
  ├── intro ────┼══════ loop ════════┼── outro ───┤
                ▲                    │
                └────────────────────┘
```

The region after `end_loop_time` is therefore available as a natural outro when
the playback is allowed to finish.

The loop region is conceptually one optional value containing both boundaries;
the two boundaries must not be independently optional.

## Fades

### Fade In

`fade_in_duration` defines the fade applied when playback starts at
`start_time`.

The same fade is applied when a paused playback resumes from its preserved
position.

### Fade Out

`fade_out_duration` defines the standard fade used when playback ends or is
interrupted.

For a natural ending, the fade completes exactly at `end_time`:

```text
end_time - fade_out_duration                 end_time
               │                                │
               ▼                                ▼
              100% ---------------------------> 0%
```

For `pause` or `stop`, the fade begins immediately from the current playback
position rather than waiting for `end_time`.

### Loop Crossfade

`loop_crossfade_duration` is optional and is only valid when a loop region
exists.

It defines a crossfade between the end and beginning of consecutive loop
iterations, allowing the transition from `end_loop_time` back to
`start_loop_time` to be smoothed.

This is a crossfade rather than a single fade: the outgoing end of the loop is
faded out while the incoming beginning of the loop is faded in over the same
transition interval.

## Playback Semantics

The Audio Object defines the behavior that an active playback instance must
follow. The commands themselves operate on the runtime playback instance, not
on the persistent Audio Object.

### Start

Starting an Audio Object:

1. begins at `start_time`;
2. applies `fade_in_duration`;
3. continues normally;
4. enters the loop region if one exists;
5. otherwise continues toward its natural end.

### Pause

Pausing an active playback:

1. starts `fade_out_duration` immediately from the current position;
2. stops audible playback after the fade;
3. preserves the playback position for a later resume.

### Resume

Resuming a paused playback:

1. continues from the preserved position;
2. applies `fade_in_duration` again;
3. resumes the normal playback/loop behavior from that position.

### Stop

Stopping an active playback:

1. starts `fade_out_duration` immediately from the current position;
2. terminates the playback after the fade;
3. discards the current playback position.

A later start begins again from `start_time`.

### Finish

Finishing represents a natural or musical ending rather than an immediate
interruption.

If the playback is currently looping:

1. it completes the current loop iteration through `end_loop_time`;
2. it does not begin another loop iteration;
3. it continues through the outro region toward `end_time`;
4. `fade_out_duration` completes exactly at `end_time`;
5. the playback terminates.

For an Audio Object without a loop, reaching `end_time` naturally follows the
same ending behavior: the fade out completes at `end_time` and playback
terminates.

## Runtime Boundary

An Audio Object is persistent configuration. Runtime playback state belongs to
a separate playback-instance concept managed by the Audio Engine / Audio Mixer.

For example, the same Audio Object may have multiple simultaneous playback
instances with different positions or states:

```text
Audio Object
├── Playback Instance A @ position X
└── Playback Instance B @ position Y
```

Therefore the following do **not** belong to Audio Object persistence:

- current playback position;
- playing/paused/stopped state;
- active fade progress;
- current loop iteration;
- runtime scheduling state.

The runtime model is specified in [Playback Instance](./playback-instance.md).

## Relationships

An Audio Object:

- stores exactly one relative [audio asset reference](./audio-file.md);
- may appear in multiple [Audio Lists](./audio-list.md);
- may be used by multiple [Audio Compositions](./audio-composition.md);
- may be exposed directly as an [Audio Cue](./audio-cue.md) in a Scene.

## Invariants

At the conceptual level:

```text
0 <= start_time < end_time <= discovered_asset.duration
```

If a loop region exists:

```text
start_time <= start_loop_time
start_loop_time < end_loop_time
end_loop_time <= end_time
```

Additionally:

- all durations must be non-negative;
- a loop region is either completely present or absent;
- `loop_crossfade_duration` may only exist when a loop region exists;
- runtime playback state must not be persisted as part of the Audio Object.

Further implementation-level validation may constrain fade/crossfade durations
when the Audio Engine requirements are known.

## Audio Cue

Audio Object is one kind of [Audio Cue](./audio-cue.md).

## Architectural Boundary

Audio Object belongs entirely to the Audio Mixer tool.

Its playback behavior is domain configuration. Implementation details such as
sample buffers, decoder state, linear gain values, output devices, and active
playback handles belong to the Audio Engine and must not leak into the
persistent Audio Object model.

## Related Components

- [Audio Asset Reference](./audio-file.md)
- [Playback Instance](./playback-instance.md)
- [Audio List](./audio-list.md)
- [Audio Composition](./audio-composition.md)
- [Audio Cue](./audio-cue.md)

## Open Questions

None currently for the initial Audio Object model.

## Editor UX

The persistent model does not prescribe a numeric-only editor.

The intended frontend provides direct waveform manipulation for playback and loop regions, synchronized numeric inputs, and preview of the unsaved draft.

See [Audio Object Editor UX](../../frontend/audio-object-editor.md).
