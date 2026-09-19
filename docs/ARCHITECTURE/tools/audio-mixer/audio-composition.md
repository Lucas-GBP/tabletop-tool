# Audio Composition

An **Audio Composition** is a reusable definition of an ambient soundscape composed of multiple automatically managed audio layers.

A composition may reference multiple `Audio Object`s and `Audio List`s. It coordinates **when** those sources are active or automatically executed, while each referenced source remains responsible for its own playback or selection behavior.

A composition is intended for ambient and continuously managed sound, not for one-off manually triggered effects.

Example:

```text
Tavern Ambience
├── Music
│   ├── AudioObject
│   └── Continuous
├── Fireplace
│   ├── AudioObject
│   └── Continuous
├── Mug Clanks
│   ├── AudioList
│   └── Periodic
├── Coins
│   ├── AudioList
│   └── Periodic
└── Laughter
    ├── AudioList
    └── Periodic
```

## Responsibility

The Audio Composition answers:

> Which ambient sources belong together, and when should each source run automatically?

It does **not** decide:

- how an `Audio Object` itself plays;
- which entry an `Audio List` selects;
- how an active playback is rendered by the audio engine.

Those responsibilities remain separated:

```text
Composition Layer
    → decides WHEN a source is active/executed

Audio List
    → decides WHICH Audio Object is selected

Audio Object
    → defines HOW one file is reproduced

Playback Instance
    → represents one concrete runtime execution
```

## Composition Layers

An Audio Composition contains one or more `Composition Layer`s.

```text
AudioComposition
└── CompositionLayer: 1..*
```

Each layer references exactly one source:

```text
source = AudioObject XOR AudioList
```

Nested Audio Compositions are not supported in the initial model.

A layer is not directly triggerable. Its source is executed automatically according to the layer's execution policy.

The same `Audio Object` or `Audio List` may still be referenced elsewhere, including by scene-level triggers. A composition references sources; it does not own them exclusively.

## Execution Modes

A layer has one execution mode:

```text
Continuous
Periodic
```

### Continuous

When a continuous layer is enabled, its source is executed.

For an `Audio Object`, the object's own configuration determines whether it loops, naturally ends, fades, and so on.

A continuous layer does not impose looping by itself.

Conceptually:

```text
enable
  ↓
execute source
  ↓
source continues according to its own behavior
```

### Periodic

A periodic layer automatically executes its source repeatedly at independently sampled intervals.

It stores:

```text
min_interval_us
max_interval_us
```

with:

```text
0 <= min_interval_us <= max_interval_us
```

When enabled, the layer does **not** execute immediately.

Instead:

```text
enable
  ↓
sample delay in [min_interval, max_interval]
  ↓
wait
  ↓
execute source
  ↓
sample a new independent delay
  ↓
wait
  ↓
execute source
  ↓
...
```

The interval is measured from the moment the previous execution begins, not from when that playback ends.

Therefore, periodic executions may overlap.

## Periodic Scheduling

Each delay is sampled uniformly from the configured interval.

Conceptually:

```text
Δt ~ Uniform(min_interval, max_interval)

next_execution_at = current_execution_time + Δt
```

When an execution occurs, the previous scheduling window is discarded. The next delay is sampled from that execution time.

Example:

```text
interval = 10s..30s

t = 0
sample 15s

t = 15
execute
sample 23s

t = 38
execute
sample 11s

t = 49
execute
```

There is no persistent or cumulative probability state.

### Enabling

Enabling a periodic layer always starts a new schedule:

```text
OFF
 ↓ enable
sample new delay
 ↓
wait
 ↓
execute
```

It does not execute immediately.

### Disabling

Disabling a periodic layer cancels its pending schedule.

If later re-enabled, the layer samples a new interval from scratch. It does not resume a partially elapsed delay.

## Overlapping Executions

Periodic layers explicitly allow overlapping executions.

If a new scheduled execution occurs while a previous `Playback Instance` created by the same layer is still active, another playback may be created.

Example:

```text
first playback:
t=15 ├───────────────────────┤ t=35

second playback:
t=27             ├─────────────────────...
```

This behavior is deliberate for ambient sounds such as laughter, coins, mugs, footsteps, or similar environmental activity.

## Disable Behavior

Each layer defines how already-active playback should behave when the layer is disabled.

Initial options:

```text
Stop
Finish
```

### Stop

The active playback is stopped according to normal `Playback Instance` semantics:

```text
disable
  ↓
stop()
  ↓
immediate fade-out
  ↓
Finished
```

### Finish

The active playback is asked to finish naturally:

```text
disable
  ↓
finish()
```

For a looping `Audio Object`, this means:

```text
finish current loop iteration
  ↓
leave loop
  ↓
continue to end_time
  ↓
natural fade-out
  ↓
Finished
```

For periodic layers, disabling also cancels all future scheduled executions.

The configured `Stop` or `Finish` behavior applies to playback instances already active when the layer is disabled.

## Runtime Composition Instance

`Audio Composition` is persistent configuration.

An active execution is represented conceptually by an `Audio Composition Instance`:

```text
AudioComposition
        ↓ activate
AudioCompositionInstance
```

The runtime instance may manage:

- enabled/disabled layer state;
- active `Playback Instance`s;
- periodic timers/schedulers;
- pending next execution times.

None of this runtime state is persisted in SQLite.

Closing the application discards active composition instances and their scheduling state.

## Scene Integration

A `Scene` may reference multiple compositions, audio lists, and audio objects.

A composition is not the only audio resource available to a scene.

For example:

```text
Scene: Tavern
├── AudioComposition: Tavern Ambience
├── AudioObject: Door Slam
└── AudioList: Punch Sounds
```

One-off actions such as a sword impact or a door slam may be directly associated with the Scene and executed through triggers rather than being modeled as composition layers.

## Scene Level Control

`Scene Level` belongs to the Core Domain and must remain unaware of the Audio Mixer.

Therefore the Audio Mixer stores tool-specific configuration that references a Scene Level:

```text
Core Domain                         Audio Mixer

SceneLevel  <------------------  SceneLevelAudioState
                                      │
                                      └── layer enabled/disabled state
```

The dependency direction remains:

```text
Audio Mixer → Core Domain
```

never:

```text
Core Domain → Audio Mixer
```

### Initial Scope

A Scene Level may only control whether composition layers are:

```text
Enabled
Disabled
```

Scene Levels do not initially override:

- volume;
- periodic intervals;
- Audio Object configuration;
- Audio List selection mode;
- fade durations;
- layer execution mode.

This keeps the composition itself as the authoritative definition of its behavior.

Example:

```text
Scene: Tavern

Composition: Tavern Ambience
├── Music
├── Fireplace
├── Mugs
├── Coins
└── Laughter
```

Scene Level: `Arriving at the Tavern`

```text
Music       ON
Fireplace   ON
Mugs        ON
Coins       ON
Laughter    ON
```

Scene Level: `The Bar Goes Silent`

```text
Music       OFF
Fireplace   ON
Mugs        OFF
Coins       OFF
Laughter    OFF
```

The Audio Mixer reconciles the desired state when the Scene Level changes.

Layers that remain enabled should continue naturally rather than being unnecessarily restarted.

## Runtime Reconciliation

When changing Scene Levels, the Audio Mixer compares the current composition state with the desired state.

Example:

```text
Music
ON → OFF
→ apply configured Stop/Finish behavior

Fireplace
ON → ON
→ keep existing playback running

Mugs
ON → OFF
→ cancel scheduler
→ apply configured Stop/Finish to active playbacks
```

This avoids audible discontinuities caused by destroying and recreating the entire composition on every Scene Level change.

## Persistent Model

Conceptually:

```text
AudioComposition
└── CompositionLayer: 1..*
    ├── source
    │   ├── AudioObject
    │   └── AudioList
    │
    ├── execution_mode
    │   ├── Continuous
    │   └── Periodic
    │       ├── min_interval_us
    │       └── max_interval_us
    │
    └── disable_behavior
        ├── Stop
        └── Finish
```

The exact persistence schema is intentionally deferred until logical/physical database modeling.

## Invariants

Initial invariants include:

```text
composition.layers.len() >= 1
```

For every layer:

```text
source is exactly one of:
- AudioObject
- AudioList
```

For periodic layers:

```text
0 <= min_interval_us <= max_interval_us
```

Periodic scheduling state is runtime-only.

## Explicitly Out of Scope

The initial Audio Composition model does not include:

- nested compositions;
- manual triggering of composition layers;
- Scene Level overrides beyond enable/disable;
- persisted runtime scheduling state;
- probability-based continuous polling;
- non-uniform interval distributions;
- synchronization with web/server state;
- composition-specific copies of Audio Objects or Audio Lists.

These may be added only if concrete use cases justify them.


## Relationship with the Global Audio Mixer

The runtime composition does not render audio itself.

When a layer needs to execute its source, the active `Audio Composition Instance` sends the source as an `AudioCue` to the global `AudioMixer`:

```text
AudioCompositionInstance
    ↓
AudioMixer.play(AudioCue)
    ↓
PlaybackId
```

The composition runtime may retain returned `PlaybackId`s when later control is necessary.

The global Mixer remains the owner of the actual `Playback Instance`s.


## Persistent Definition and Runtime Instance

`AudioComposition` exists as persistent configuration, while `AudioCompositionInstance` exists only while that composition is active at runtime.

```text
Persistent
──────────
AudioComposition
├── layers
├── AudioCue references
├── layer activation policies
└── disable behavior

Runtime
───────
AudioCompositionInstance
├── active layer state
├── periodic schedules
├── PlaybackIds
└── commands sent to AudioMixer
```

The runtime instance does not render audio itself. It coordinates composition behavior and delegates actual playback control to the global `AudioMixer`.

The initial architecture does not use an `AudioTrigger` between a composition and the Mixer.

## Scene Runtime Ownership

`AudioCompositionInstance` is runtime-only, but it does not represent all runtime state of the Scene.

Scene-wide volatile audio state belongs conceptually to `SceneAudioRuntime`.

```text
SceneAudioRuntime
├── runtime layer overrides
└── AudioCompositionInstances
```

This distinction matters because runtime layer overrides survive Scene Level changes.

An `AudioCompositionInstance` remains responsible for composition-local execution details such as active layers, timers, and the `PlaybackId`s it needs to manage.
