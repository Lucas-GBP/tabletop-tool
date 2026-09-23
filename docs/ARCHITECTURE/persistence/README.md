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
- SQLite stores the general asset-root setting and relative paths used by
  persistent definitions. Discovery catalogs are transient.
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

Tools reference files beneath the user-selected asset root without mutating them.
Each scan creates a transient catalog. Missing files remain represented by the
relative paths in their owning definitions, allowing the UI to warn the user and
recover when the path becomes valid again.

## Open Questions

- What concrete workflow would require more than one application asset root?
