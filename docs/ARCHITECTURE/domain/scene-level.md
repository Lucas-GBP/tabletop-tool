# Scene Level

## Purpose

A Scene Level represents one structural level or layer within a Scene.

It is part of the Core Domain and belongs structurally to a Scene.

## Relationships

A Scene Level:

- belongs to exactly one [Scene](./scene.md);
- may be referenced by Scene Tools.

For example, a Scene Tool may associate its own configuration with a Scene Level.

The dependency direction is:

```text
Tool Configuration ───────▶ Scene Level
```

not:

```text
Scene Level ───────▶ Tool Configuration
```

## Invariants

- Every Scene Level has a non-empty display name.
- Every Scene Level belongs to exactly one Scene.
- Scene Level positions are dense integers starting at zero within their Scene.

## Lifecycle

The initial Scene Level is created automatically together with its Scene.

Additional Scene Levels may be added later.

A Scene Level may be renamed or deleted. Direct deletion is rejected when it is
the last Scene Level of its Scene.

## Architectural Boundary

Scene Level must remain tool-agnostic.

It must not require knowledge of:

- audio playback;
- initiative;
- encounters;
- other future Scene Tools.

## Related Components

- [Scene](./scene.md)
- [Scene Tools](../tools/README.md)

## Open Questions

- What differentiates one Scene Level from another in the final product?
- Which Core Domain concepts, if any, may belong directly to a Scene Level?
