# Scene Tools

Scene Tools provide specialized capabilities for composing, preparing, or
running Scenes.

They depend on the [Core Domain](../domain/README.md), but the Core Domain must
not depend on them.

## Current Tools

### Audio Mixer

The first defined Scene Tool.

It provides reusable audio resources, audio lists, compositions, and triggers.

See [Audio Mixer](./audio-mixer/README.md).

## Anticipated Tools

The following concepts are currently ideas rather than complete designs:

### Initiative Tracker

A tool for managing initiative and turn order during a Scene.

It may eventually require ruleset-specific behavior.

### Encounter Builder

A tool for preparing combat encounters or other structured challenges associated
with a Scene.

It may also require ruleset-specific extensions.

## Tool Boundary

A Scene Tool should own:

- its domain concepts;
- its tool-specific state;
- its rules;
- its persistence representation;
- its interaction with the Core Domain.

A tool may reference Scene or Scene Level, but the Core Domain must not require
that tool to exist.

## Open Questions

- How should tools attach persistent state to Core Domain concepts?
- Should tools be independently enabled or disabled?
- Should tool-specific data use separate persistence modules or schemas?
