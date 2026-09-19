# Persistence

## Purpose

Persistence in `tabletop-tools` is entirely local.

The application uses two complementary storage mechanisms:

```text
Application Data
│
├── Structured Data
│      │
│      ▼
│    SeaORM
│      │
│      ▼
│    SQLite
│
└── Binary Files
       │
       ▼
   Local Filesystem
```

## Decisions

- `tabletop-tools` is a strictly local application.
- All non-file application data is stored in SQLite.
- SeaORM is the persistence abstraction used to access SQLite.
- Binary files such as audio, images, and videos are stored in the filesystem.
- Binary assets are not stored in SQLite as BLOBs.
- SQLite stores the structured metadata and references required to manage those files.
- The Core Domain and Scene Tools must not depend directly on SeaORM, SQLite, or filesystem layout.

## Documents

- [Structured Data](./structured-data.md)
- [File Storage](./file-storage.md)

## Architectural Boundary

Persistence is an infrastructure concern. Domain concepts define what information
exists and the rules governing it; persistence defines how that information is
stored locally.

Consequently, a domain concept such as Scene or Audio Object should not expose
SQLite rows, SeaORM entities, SQL column names, or filesystem paths merely because
those representations are convenient for storage.

## Consistency

Operations that affect both SQLite records and filesystem assets may require
explicit consistency handling because a filesystem operation and a SQLite
transaction cannot be assumed to form one atomic transaction.

The exact strategy is not yet defined and should be designed when file lifecycle
operations are specified.

## Open Questions

- Where inside the application's local data directory should managed assets live?
- Should imported files be copied into application-managed storage or referenced in place?
- How should file identity and deduplication work?
- How should deletion handle files referenced by more than one domain object?
- How should failed operations spanning SQLite and the filesystem be recovered?
