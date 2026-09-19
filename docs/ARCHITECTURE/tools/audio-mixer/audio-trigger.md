# Audio Trigger

## Purpose

An Audio Trigger connects an event or interaction to an Audio Cue that should be
played.

Examples include:

- opening a door in a Scene Level;
- a Character performing a sword attack;
- entering an environment that starts an ambience composition.

## Ownership

An Audio Trigger belongs to exactly one conceptual owner.

Current candidate owners include:

- [Scene Level](../../domain/scene-level.md);
- Character.

Character is still an early domain concept and is not yet documented as a
complete Core Domain component.

The ownership relationship is exclusive:

```text
Scene Level XOR Character
```

An Audio Trigger cannot belong to both simultaneously.

## Dependency Direction

The Audio Mixer owns the relationship.

Conceptually:

```text
Audio Trigger ───────▶ Scene Level
```

The Core Domain must not depend on Audio Trigger.

This prevents Scene Level from acquiring Audio Mixer-specific fields or
dependencies.

## Target

An Audio Trigger targets exactly one [Audio Cue](./audio-cue.md).

Current target kinds:

- [Audio Object](./audio-object.md);
- [Audio List](./audio-list.md);
- [Audio Composition](./audio-composition.md).

The relationship is exclusive: exactly one target is active.

## Invariants

- Every Audio Trigger has exactly one owner.
- Every Audio Trigger has exactly one target Audio Cue.

## Related Components

- [Scene Level](../../domain/scene-level.md)
- [Audio Cue](./audio-cue.md)
- [Audio Object](./audio-object.md)
- [Audio List](./audio-list.md)
- [Audio Composition](./audio-composition.md)

## Open Questions

- Which event types can produce triggers?
- Should trigger conditions be modeled independently?
- Does Character belong to the Core Domain or to another future domain/tool?
- Can tools define new trigger owner types?
