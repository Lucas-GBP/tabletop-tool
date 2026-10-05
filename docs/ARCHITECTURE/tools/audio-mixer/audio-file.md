# Audio Asset Reference

## Purpose

An audio asset is a file discovered beneath the application's configured asset
root. It is transient catalog data, not a persistent domain entity and not a
playable definition. It contains no volume, regions, loops, fades, identity, or
runtime state.

The file bytes remain in the user-managed filesystem. The application does not
copy, rename, or delete them.

## Discovery

The user configures one asset root for the application in general settings.
Audio Mixer scans it recursively for WAV, MP3, OGG, FLAC, M4A, AAC, and WebM
files. Each scan derives:

- a display name and original filename;
- the normalized relative path beneath the asset root;
- media type, byte size, and duration.

This catalog exists only in the application response. SQLite does not contain an
`AudioFile` table or mirror every file found on disk.

A scan is partially successful when possible. An unreadable directory, invalid
supported file, or metadata failure produces a warning tied to its relative
path while other valid assets remain available.

## Persistent references

An [Audio Object](./audio-object.md) stores the asset's relative path. The
absolute asset root is stored once in application settings:

```text
asset root:      D:/TabletopAssets
object path:     audio/weather/rain.ogg
resolved file:   D:/TabletopAssets/audio/weather/rain.ogg
```

Moving or renaming the complete asset root therefore requires updating one
setting. Persistent definitions remain portable as long as their internal
relative paths stay the same.

## Selection workflow

The same asset picker is used when creating an Audio Object and replacing its
file. It supports search, parent-folder filtering, and explicit refresh. Choosing
an asset while creating immediately persists an Audio Object with defaults and
opens its editor.

## Missing and changed files

A stored relative path may stop resolving because the user moved, renamed, or
deleted the file. The definition remains valid and keeps that path. Preparation
screens derive an unavailable state from the current scan and show a warning on
the affected object, lists, compositions, and Scenes.

Playback and preview report a recoverable error for a missing file. During a
running Session, that failure is isolated and does not stop the Scene runtime or
unrelated audio. The user can restore the same relative path, update the asset
root, or replace the object's file.

Replacing the bytes at an existing relative path may change duration and other
derived metadata. Any later edit is validated against the currently discovered
duration. Playback tolerates only small decoder/metadata rounding differences.
A material mismatch or a saved region beyond the decoded duration produces the
structured, recoverable `AUDIO_ASSET_CHANGED` error. The failed cue remains
isolated from the Scene runtime and unrelated playbacks.

## Architectural boundary

General settings own the absolute asset root. Rust application code owns
recursive discovery, probing, safe relative-path resolution, and persistent
validation. The Core Domain does not know that audio files exist. TypeScript
receives transient metadata and requests a resolved path only for waveform
display or playback.

## Related components

- [Audio Object](./audio-object.md)
- [File Storage](../../persistence/file-storage.md)
