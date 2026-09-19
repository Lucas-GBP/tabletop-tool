# File Storage

## Decision

Binary assets are stored in the local filesystem rather than inside SQLite.

This includes, but is not limited to:

- audio files;
- images;
- videos;
- other binary assets introduced by future Scene Tools.

SQLite stores only the structured metadata and references necessary to identify,
locate, and manage those assets.

## Responsibility

Filesystem access belongs to the infrastructure/persistence side of the
application.

Domain concepts should not be defined in terms of operating-system-specific paths
or Tauri filesystem APIs.

For example, an Audio Object may conceptually reference an Audio File, while the
persistence layer decides how that file is represented on disk.

## File Lifecycle

File lifecycle needs to be designed together with ownership semantics. Typical
operations include:

- importing a file;
- resolving a stored file for playback or display;
- replacing a file;
- deleting a reference;
- deleting an unreferenced managed file;
- detecting or recovering missing files.

## Consistency Boundary

SQLite transactions cannot automatically make filesystem operations atomic.

An operation such as importing or deleting a managed asset may involve both:

```text
Filesystem change
      +
SQLite change
```

The application will therefore need an explicit strategy for failure recovery and
orphan prevention once these workflows are designed.

## Open Questions

- Are imported assets copied into an application-managed directory or referenced
  at their original location?
- Should stored references be relative identifiers rather than absolute paths?
- Should content hashes be used for identity or deduplication?
- When may the application physically delete a file?
- How should missing or externally modified files be handled?
