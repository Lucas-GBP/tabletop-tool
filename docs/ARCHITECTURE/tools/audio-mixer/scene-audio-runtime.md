# Scene Audio Runtime

`SceneAudioRuntime` represents transient Audio Mixer Tool state associated with the Scene currently being executed.

It is separate from persistent Scene and Scene-Level audio configuration.

```text
Persistent
──────────
SceneAudioConfiguration
SceneLevelAudioConfiguration

        ↓ execute

Runtime
───────
SceneAudioRuntime
├── AudioCompositionInstances
├── PlaybackIds
└── runtime layer overrides
```

## Lifetime

`SceneAudioRuntime` is created when a Scene begins execution.

It survives changes between Scene Levels.

It is discarded when:

- the application leaves the current Scene; or
- the application closes.

It is not persisted in the initial architecture.

## Runtime Layer Overrides

Every Composition layer is ON by default.

A Scene Level may persist overrides for layers that should be OFF.

During execution, the user may also apply a volatile runtime override.

```text
effective_state(layer) =
    runtime_override
    ?? scene_level_override
    ?? ON
```

Runtime overrides survive Scene Level changes.

For example:

```text
runtime:
Fireplace = OFF

Level A → Level B

Fireplace remains OFF.
```

Leaving the Scene discards that runtime override.

## Scene Level Reconciliation

Changing Scene Level does not rebuild the entire audio runtime.

Instead, `SceneAudioRuntime` reconciles the desired state of each Composition layer.

```text
Scene Level changed
        ↓
read new persistent level overrides
        ↓
combine with existing runtime overrides
        ↓
derive effective layer states
        ↓
reconcile AudioCompositionInstances
        ↓
send commands to AudioMixer
```

Layers whose effective state remains ON should continue rather than restart.

Layers transitioning ON → OFF apply their configured disable behavior.

Layers transitioning OFF → ON activate according to their layer activation policy.

## Relationship with AudioMixer

`SceneAudioRuntime` coordinates Scene-specific audio behavior. The global `AudioMixer` remains responsible for actual playback instances.

```text
SceneAudioRuntime
        ↓
AudioCompositionInstance
        ↓
AudioMixer
        ↓
PlaybackInstance
```

The Audio Mixer does not know about `Scene`, `SceneLevel`, or runtime override semantics.

## Implementation Location

`SceneAudioRuntime` is implemented in TypeScript.

It consumes persistent definitions supplied by Rust and coordinates volatile audio behavior without modifying those definitions.

```text
Rust persistent definitions
        ↓
TypeScript SceneAudioRuntime
        ↓
AudioCompositionInstance
        ↓
AudioMixer
        ↓
Web Audio API
```
