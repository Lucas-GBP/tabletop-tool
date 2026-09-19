# Session

## Purpose

A Session represents a play session inside a Campaign.

It provides a temporal context in which one or more reusable Scenes are used.

## Relationships

A Session:

- belongs to exactly one [Campaign](./campaign.md);
- uses one or more [Scenes](./scene.md);
- may use a Scene that also appears in other Sessions.

## Invariants

- Every Session belongs to exactly one Campaign.
- A Session currently uses at least one Scene.

## Lifecycle

The initial Session is created automatically when its Campaign is created.

## Architectural Boundary

Session is part of the Core Domain and must remain independent from individual
Scene Tools.

Tool-specific state related to a Session should be owned by the tool itself.

## Related Components

- [Campaign](./campaign.md)
- [Scene](./scene.md)

## Open Questions

- Can an empty Session exist while it is being prepared?
- Should the use of a Scene within a Session become a distinct domain concept?
- Where should state produced during a specific play session be stored?
