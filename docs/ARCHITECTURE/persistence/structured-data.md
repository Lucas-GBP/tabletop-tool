# Structured Data

## Decision

All application data that is not itself a binary file is persisted locally in
SQLite through SeaORM.

Examples include:

- Campaigns;
- Sessions;
- Scenes;
- Scene Levels;
- Scene Tool configuration and state;
- Audio Object metadata;
- Audio Lists and their membership;
- Audio Compositions and their layers;
- Audio Triggers;
- metadata and references associated with managed files.

## SeaORM

SeaORM is an infrastructure dependency and must remain inside the persistence
layer.

The following concepts should remain distinct:

```text
Domain Model
    !=
SeaORM Entity
    !=
Frontend DTO
```

A SeaORM entity represents how information is persisted. It does not define the
meaning of the corresponding domain concept.

## SQLite

SQLite is the only database required by the application. The database is local to
the application and does not require a database server.

The initial Core schema has separate tables for Campaign, Session, Scene,
SceneLevel, and SessionScene. Foreign keys preserve ownership, composite unique
constraints protect positions and Scene reuse within a Session, and explicit
migrations evolve the local database. Tool schemas are added only with their
corresponding implementation.

## Migrations

Database evolution must be handled through explicit migrations from the start of
implementation so existing local databases can be upgraded safely as the
application evolves.

## Invariants

- Domain rules should be enforced in the appropriate domain/application layer.
- Database constraints should additionally protect invariants that can be safely
  expressed at the persistence level.
- Scene Tool persistence must remain logically owned by the corresponding tool.
- Binary file contents are not stored as SQLite BLOBs.
