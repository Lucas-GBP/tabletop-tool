# Scene Level Audio Configuration

`SceneLevelAudioConfiguration` is persistent Audio Mixer Tool configuration associated with a Core `SceneLevel`.

It does not define which Audio Compositions belong to the Scene. All Compositions associated with the parent Scene are available to every Scene Level.

Its responsibility is limited to persistent Composition-layer overrides.

## Default

Every Composition layer is ON by default.

A Scene Level therefore persists only deviations from that default.

Example:

```text
Tavern Ambience

default:
Music       ON
Fireplace   ON
Mugs        ON
Coins       ON
Laughter    ON
```

For `The Bar Goes Silent`:

```text
persistent overrides:
Music       OFF
Mugs        OFF
Coins       OFF
Laughter    OFF
```

`Fireplace` needs no stored override because it remains ON.

## Runtime Overrides

Runtime changes are separate from persistent configuration.

During execution, the user may manually change a layer state without editing the Scene Level definition.

Effective state:

```text
runtime override
      ↓
SceneLevel override
      ↓
default = ON
```

Runtime overrides survive Scene Level changes and are discarded only when leaving the Scene or closing the application.

See [Scene Audio Runtime](./scene-audio-runtime.md).
