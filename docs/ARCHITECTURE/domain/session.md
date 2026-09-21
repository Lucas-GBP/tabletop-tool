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

- A Session has a non-empty display name.
- Every Session belongs to exactly one Campaign.
- A Session currently uses at least one Scene.
- A Scene cannot appear more than once in the same Session.
- `SessionScene` associations have dense integer positions starting at zero.

## Lifecycle

The initial Session is created automatically when its Campaign is created. That
application operation also creates an independent initial Scene and establishes
the first `SessionScene` association atomically.

A Session is never created empty. Creating an additional Session requires an
existing Scene to establish its first `SessionScene` association.

Removing a Scene association is rejected when it is the Session's last Scene.
Likewise, deleting a reusable Scene is rejected before mutation when removing its
associations would leave any Session empty.

## Architectural Boundary

Session is part of the Core Domain and must remain independent from individual
Scene Tools.

Tool-specific state related to a Session should be owned by the tool itself.

## Execution

Starting a Session is a frontend execution workflow; it does not create another
persistent Session definition. The ordered `SessionScene` associations determine
the available execution sequence. Entering a Scene creates a transient
`SceneRuntime`, changing SceneLevel reconciles that same runtime, and leaving the
Scene discards it. Ending the Session discards its active runtime state.

See [Scene Runtime](../runtime/scene-runtime.md) for the complete lifetime and
persistence boundary.

## Related Components

- [Campaign](./campaign.md)
- [Scene](./scene.md)
