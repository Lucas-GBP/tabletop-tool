# Scene Level

## Purpose

A Scene Level represents one structural level or layer within a Scene.

It is part of the Core Domain and belongs structurally to a Scene.

## Relationships

A Scene Level:

- belongs to exactly one [Scene](./scene.md);
- may be referenced by Scene Tools.

For example, the Audio Mixer may associate Audio Triggers with a Scene Level.

The dependency direction is:

```text
Audio Trigger ───────▶ Scene Level
```

not:

```text
Scene Level ───────▶ Audio Trigger
```

## Invariants

- Every Scene Level belongs to exactly one Scene.

## Lifecycle

The initial Scene Level is created automatically together with its Scene.

Additional Scene Levels may be added later.

## Architectural Boundary

Scene Level must remain tool-agnostic.

It must not require knowledge of:

- audio playback;
- initiative;
- encounters;
- other future Scene Tools.

## Related Components

- [Scene](./scene.md)
- [Audio Trigger](../tools/audio-mixer/audio-trigger.md)

## Open Questions

- What differentiates one Scene Level from another in the final product?
- Which Core Domain concepts, if any, may belong directly to a Scene Level?
