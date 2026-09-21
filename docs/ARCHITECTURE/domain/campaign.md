# Campaign

## Purpose

A Campaign represents the long-lived organizational context in which Sessions
are played and reusable Scenes are selected.

## Relationships

A Campaign:

- contains one or more [Sessions](./session.md);
- uses one or more [Scenes](./scene.md);
- may share the same Scene with other Campaigns.

Sessions are structurally part of a Campaign.

Scenes are not owned by the Campaign and have an independent lifecycle.

## Invariants

- A Campaign has a non-empty display name.
- A Campaign always contains at least one Session.
- Every Session belongs to exactly one Campaign.
- Sessions have dense integer positions starting at zero.

## Lifecycle

When a Campaign is created, the application atomically creates its initial
Session, a new initial Scene with its first SceneLevel, and the SessionScene
association between them. This convenience does not transfer ownership of the
Scene to the Campaign; the Scene remains an independent reusable definition.

Creating an additional Session requires an existing Scene for its initial
SessionScene association.

## Architectural Boundary

Campaign is part of the Core Domain.

It must not contain tool-specific concepts such as:

- audio configuration;
- initiative configuration;
- encounter configuration.

Those belong to their respective Scene Tools.

## Related Components

- [Session](./session.md)
- [Scene](./scene.md)

## Open Questions

- Should tool availability be configurable per Campaign?
