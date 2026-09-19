# Audio Object

## Purpose

An Audio Object is the smallest directly playable audio concept in the Audio
Mixer domain.

It references an underlying Audio File while providing a reusable domain-level
identity.

## Relationships

An Audio Object:

- references exactly one [Audio File](./audio-file.md);
- may appear in multiple [Audio Lists](./audio-list.md);
- may be used by multiple [Audio Compositions](./audio-composition.md);
- may be targeted directly by an [Audio Trigger](./audio-trigger.md).

## Invariants

- Every Audio Object references exactly one Audio File.

## Audio Cue

Audio Object is one kind of [Audio Cue](./audio-cue.md).

## Architectural Boundary

Audio Object belongs entirely to the Audio Mixer tool.

## Related Components

- [Audio File](./audio-file.md)
- [Audio List](./audio-list.md)
- [Audio Composition](./audio-composition.md)
- [Audio Trigger](./audio-trigger.md)

## Open Questions

- Which playback properties belong directly to Audio Object?
- Should gain, pitch, fade, and looping be object properties or usage-specific
  properties?
