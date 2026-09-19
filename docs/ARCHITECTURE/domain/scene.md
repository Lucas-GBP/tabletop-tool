# Scene

## Purpose

A Scene represents reusable tabletop content such as an encounter, location,
situation, or prepared sequence.

For example, a Scene could represent a goblin encounter on a road.

A Scene is deliberately reusable and therefore does not belong exclusively to a
single Campaign or Session.

## Relationships

A Scene:

- may be used by multiple [Campaigns](./campaign.md);
- may be used by multiple [Sessions](./session.md);
- contains one or more [Scene Levels](./scene-level.md).

## Invariants

- A Scene always contains at least one Scene Level.

## Lifecycle

When a Scene is created, its initial Scene Level is created automatically.

## Architectural Boundary

Scene is part of the Core Domain.

It defines the context in which Scene Tools may operate, but it must not know
about those tools.

For example, a Scene must not require properties such as:

```text
audio_mixer
initiative
encounter_builder
```

Instead, those tools may reference the Scene externally.

## Related Components

- [Campaign](./campaign.md)
- [Session](./session.md)
- [Scene Level](./scene-level.md)

## Open Questions

- Is a Scene only a reusable definition?
- If a Scene changes during play, should that change the reusable definition?
- Should a separate Scene Instance or Scene State concept represent changes made
  during a Campaign or Session?
