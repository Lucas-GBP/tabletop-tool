# Scene Audio Configuration

`SceneAudioConfiguration` is persistent Audio Mixer Tool configuration associated with a Core `Scene`.

It defines which reusable audio resources are available while that Scene is being used.

```text
Scene
  ↑
SceneAudioConfiguration
├── AudioCue*          0..*
└── AudioComposition*  0..*
```

The Core `Scene` contains no audio-specific fields.

## Audio Cues

Audio Cues associated with a Scene are available during every Scene Level.

Scene Levels do not add another configuration layer for direct `AudioCue` availability.

The same `AudioCue` may be associated with multiple Scenes.

## Audio Compositions

Every Audio Composition associated with a Scene is available to every Scene Level of that Scene.

The same `AudioComposition` may be associated with multiple Scenes.

A Scene Level does not decide whether a Composition belongs to the Scene. It may only override the enabled/disabled state of Composition layers.

## Default Layer State

All Composition layers are ON by default.

There is no additional persistent per-Scene default layer configuration.

```text
Composition layer default = ON
```

A Scene Level stores only deviations from this default.

## Empty Configuration

A Scene may contain:

```text
0 AudioCues
0 AudioCompositions
```

This is valid. Audio is optional Tool-specific configuration, not a Core Scene invariant.

## Persistence

`SceneAudioConfiguration` and its associations are persisted in SQLite.

Runtime playback state does not belong here.

See [Scene Audio Runtime](./scene-audio-runtime.md).
