# Audio File

## Purpose

An Audio File represents an underlying audio resource that can be referenced by
one or more Audio Objects.

At the solution level, audio assets are stored in the local filesystem. The
SQLite database stores the structured metadata and reference needed to manage the
asset; the audio bytes themselves are not stored as a database BLOB.

The domain concept remains independent from the concrete filesystem path or Tauri
filesystem API used by the persistence layer.

See [File Storage](../../persistence/file-storage.md).

## Relationships

An Audio File may be referenced by zero or more
[Audio Objects](./audio-object.md).

Multiple Audio Objects may use the same Audio File while providing different
domain-level behavior or configuration.

## Architectural Boundary

Audio File belongs to the Audio Mixer tool.

The Core Domain does not need to know that audio files exist.

## Related Components

- [Audio Object](./audio-object.md)

## Open Questions

- Can an Audio File exist before any Audio Object references it?
- Which metadata belongs to the file itself?
- How should file identity and deduplication work?
- Should imported audio be copied into application-managed storage or referenced in place?
