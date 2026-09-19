# Runtime Model

Tabletop Tools distinguishes explicitly between **persistent definition** and **runtime state**.

```text
Persistent Definition
        │
        │ instantiate / execute
        ▼
Runtime State
```

Persistent definition describes what the user prepared. Runtime state describes what is happening while a Scene is being run.

## Architectural Rule

> Runtime state must not implicitly modify persistent definitions.

A Tool may read persistent configuration to create or reconcile runtime state, but execution changes remain transient unless the user explicitly performs a future action that promotes runtime state into configuration.

```text
Runtime State ─X→ Persistent Definition
```

## Configuration / Preparation

The user edits persistent definitions, for example:

- Scenes and Scene Levels;
- Audio Cues and Audio Compositions associated with a Scene;
- Scene-Level audio overrides;
- encounter definitions;
- a creature's initial or maximum hit points.

These changes are intended to survive application restarts.

## Execution / Session

The user runs a Scene during a Session. Examples:

- changing the current Scene Level;
- manually enabling or disabling an audio layer;
- active audio playback and timers;
- reducing a monster's current hit points;
- temporary encounter state.

These changes belong to runtime state.

## Scene Runtime

A running Scene has a transient execution context, conceptually `SceneRuntime`.

```text
Scene
  │ execute
  ▼
SceneRuntime
├── scene_id
├── current_scene_level
└── tool runtime state
```

`SceneRuntime` is not the persistent `Scene`. It represents one active execution of that Scene.

## Lifetime

```text
enter Scene
    ↓
create SceneRuntime
    ↓
run / modify transient state
    ↓
change Scene Level
    ↓
same SceneRuntime continues
    ↓
leave Scene
    ↓
discard SceneRuntime
```

Application shutdown also discards runtime state.

Therefore:

- changing Scene Level does **not** reset Scene runtime;
- changing Scene does reset Scene-specific runtime state;
- closing the application resets runtime state.

Runtime-session persistence is outside the initial architecture.

## Scene Level Changes

Changing `SceneLevel` changes the persistent configuration currently applied, but does not create a new Scene runtime.

Each Tool reconciles its runtime state with the newly active Scene Level. Core Domain contains no tool-specific reconciliation logic.

## Tool Runtime State

A Tool may have:

- persistent Scene configuration;
- persistent Scene-Level configuration;
- transient runtime state.

Tool-specific runtime structures remain owned by their Tools. Core `Scene` and `SceneLevel` do not acquire audio-, encounter-, or other tool-specific fields.

## Audio Example

```text
Persistent:
SceneAudioConfiguration
SceneLevelAudioConfiguration

Runtime:
SceneAudioRuntime
├── AudioCompositionInstances
├── PlaybackIds
└── runtime layer overrides
```

Runtime audio overrides survive Scene Level changes.

Effective layer state:

```text
runtime override
      ↓
SceneLevel override
      ↓
default = ON
```

```text
effective_state(layer) =
    runtime_override
    ?? scene_level_override
    ?? ON
```

Runtime overrides are discarded when leaving the Scene or closing the application.

## Encounter Example

```text
Persistent:
EncounterDefinition
└── Goblin
    ├── max_hp = 12
    └── initial_hp = 12

Runtime:
EncounterRuntime
└── GoblinInstance
    └── current_hp = 4
```

Reducing `current_hp` must not alter the persistent Goblin definition.

## Shared Tool Pattern

At the architectural level, Tools participating in Scene execution may need to:

- read persistent Scene configuration;
- read persistent Scene-Level configuration;
- create transient runtime state;
- react to Scene-Level changes;
- discard runtime state when leaving the Scene.

This is a shared architectural pattern, **not yet a shared Rust trait or framework abstraction**. A generic interface should only be introduced after multiple concrete Tools demonstrate a stable common API.

## Dependency Direction

```text
Tools → Core Domain
```

Never:

```text
Core Domain → Tools
```

`SceneRuntime` coordinates execution context without making the persistent Core Domain aware of Tool-specific runtime details.

## Persistence Summary

Persisted:

```text
Scene
SceneLevel
tool definitions
tool Scene configuration
tool SceneLevel configuration
```

Transient:

```text
SceneRuntime
tool runtime state
active playback instances
runtime layer overrides
current encounter HP
timers / schedulers
```

A future explicit command may promote selected runtime state into configuration, but runtime mutation must never silently become configuration mutation.

## Implementation Boundary

For the initial implementation, the conceptual `SceneRuntime` lives in TypeScript.

```text
Rust
└── persistent Scene / SceneLevel definitions
        ↓ Tauri IPC
TypeScript
└── SceneRuntime
    └── Tool runtime state
```

This keeps transient execution state close to the UI and to runtime-only engines such as Web Audio.

Rust remains authoritative over persistent configuration. Runtime changes in TypeScript do not implicitly write back to Rust or SQLite.

## Scene as an Execution Boundary

A `Scene` is a complete runtime boundary.

Leaving a Scene discards its transient runtime state.

If state is expected to continue across a transition, that transition should generally be represented as a change of `SceneLevel` within the same Scene rather than as a transition between two separate Scenes.

This rule applies to Tool runtime state such as audio overrides and future encounter execution state.
