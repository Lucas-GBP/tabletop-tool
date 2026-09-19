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

- A Campaign always contains at least one Session.
- Every Session belongs to exactly one Campaign.

## Lifecycle

When a Campaign is created, its initial Session is created automatically.

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

- Can a Campaign ever temporarily exist without a Session during editing?
- Should tool availability be configurable per Campaign?
