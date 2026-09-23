# Structured Data

## Decision

All application data that is not itself a binary file is persisted locally in
SQLite through SeaORM.

Examples include:

- Campaigns;
- Sessions;
- Scenes;
- Scene Levels;
- persistent Scene Tool definitions and configuration;
- Audio Object metadata;
- Audio Lists and their membership;
- Audio Compositions and their layers;
- the configured application asset root;
- relative asset paths owned by persistent definitions.

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

Database evolution uses SeaORM Migrator. Applied migrations are immutable: a
schema change is represented by a new migration rather than an edit to an
existing migration module. This keeps upgrades reproducible for databases that
may have been created by different application versions.

New schema declarations use the typed builders from SeaORM Migration and
SeaQuery: `Table`, `ColumnDef`, `ForeignKey`, `Index`, and `Expr`. Every migration
declares its own `DeriveIden` identifiers. A historical migration is a snapshot
of the schema at that time and must not import `Column` enums from the current
entities, which may change later.

Because the project has not distributed an installed database yet, its initial
development baseline was reset once so both the Core and Audio Mixer migrations
use typed builders. After the first distributed version, every registered
migration is immutable and any Core or Tool schema change must be introduced by
a new migration.

## Database access guideline

Tabletop Tool uses SeaORM as the default persistence abstraction. Persistent
tables have dedicated `Entity`, `Model`, `ActiveModel`, and `Column` types inside
the persistence layer.

Normal CRUD, filtering, ordering, and association queries use SeaORM's typed
Entity and Column APIs. Complex expressions use SeaQuery before considering SQL
text. Raw SQL is allowed only when a SQLite-specific or bulk operation is
clearly simpler or cannot be represented cleanly by those APIs. Such SQL must
remain localized, bind all values, explain the exception, and have a focused
test.

Conversions between persistence models and domain values remain explicit. The
domain owns business meaning and invariants; it does not derive SeaORM models or
depend on SeaORM, SQLite, migrations, serialization, Specta, or Tauri.

Transactions remain mandatory for compound writes. Moving to typed APIs does
not weaken atomicity, dense ordering, foreign keys, unique indexes, checks, or
cascade behavior.

## Invariants

- Domain rules should be enforced in the appropriate domain/application layer.
- Database constraints should additionally protect invariants that can be safely
  expressed at the persistence level.
- Scene Tool persistence must remain logically owned by the corresponding tool.
- Binary file contents are not stored as SQLite BLOBs.
