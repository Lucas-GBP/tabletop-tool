# Audio Composition

## Purpose

An Audio Composition orchestrates multiple audio sources over time.

Unlike an Audio List, which selects one Audio Object at a time, an Audio
Composition may coordinate simultaneous, looping, periodic, or randomly
scheduled sources.

A forest ambience is a representative example.

## Example

```text
Forest Ambience

- Background Music
  - source: Audio Object
  - mode: loop

- Waterfall
  - source: Audio Object
  - mode: loop

- Birds
  - source: Audio List
  - mode: random interval
```

## Composition Layer

An Audio Composition contains one or more Composition Layers.

A Composition Layer represents how one source participates in a composition.

Each layer has exactly one source:

- [Audio Object](./audio-object.md), or
- [Audio List](./audio-list.md).

This is an XOR relationship.

A layer cannot reference both source types simultaneously and cannot exist
without a source.

The layer is also the natural place for composition-specific configuration such
as:

- continuous looping;
- random intervals;
- timing;
- gain;
- fades;
- scheduling behavior.

The exact set of properties is intentionally not defined yet.

## Relationships

An Audio Composition:

- contains one or more Composition Layers;
- may be targeted directly by an [Audio Trigger](./audio-trigger.md).

## Invariants

- An Audio Composition contains at least one Composition Layer.
- Every Composition Layer has exactly one source.
- A Composition Layer currently references Audio Object XOR Audio List.
- Nested Audio Compositions are currently not supported.

## Audio Cue

Audio Composition is one kind of [Audio Cue](./audio-cue.md).

## Architectural Boundary

Audio Composition belongs entirely to the Audio Mixer tool.

## Open Questions

- Which scheduling modes should exist?
- Which timing parameters belong to Composition Layer?
- Should layers support conditional activation?
- Is nested Audio Composition ever necessary?
