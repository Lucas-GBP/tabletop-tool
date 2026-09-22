# Runtime Architecture

This section documents transient execution state shared conceptually across Tabletop Tools.

- [Scene Runtime](./scene-runtime.md) — persistent definitions versus runtime state, Scene execution lifetime, Scene Level reconciliation, and the shared architectural pattern for Tool runtimes.

The model is architectural rather than implementation-specific. Common Rust traits should only be introduced after concrete Tools demonstrate a stable shared interface.
