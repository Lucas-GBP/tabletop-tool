# Audio List

## Purpose

An Audio List groups multiple Audio Objects and defines how one of them is
selected or advanced when the list is played.

A typical example is a collection of sword-collision sounds where repeated
playback should vary instead of always using the same recording.

## Example

```text
Sword Collision List

- sword-collision-01
- sword-collision-02
- sword-collision-03

Playback policy: random
```

## Playback Semantics

An Audio List plays one Audio Object at a time according to a selection policy.

Initial candidate policies include:

- sequential;
- random.

More policies should only be added when concrete use cases require them.

## Audio List Entry

The relationship between an Audio List and an Audio Object is represented
conceptually by an Audio List Entry.

This allows properties of list membership to exist independently from the Audio
Object itself.

Possible future properties include:

- ordering;
- selection weight;
- enabled or disabled state.

These are not yet committed requirements.

## Relationships

An Audio List:

- contains one or more Audio List Entries;
- each entry references exactly one [Audio Object](./audio-object.md);
- may be used by an [Audio Composition](./audio-composition.md);
- may be targeted by an [Audio Trigger](./audio-trigger.md).

## Invariants

- An Audio List contains at least one Audio List Entry.
- Every Audio List Entry references exactly one Audio Object.

## Audio Cue

Audio List is one kind of [Audio Cue](./audio-cue.md).

## Architectural Boundary

Audio List belongs entirely to the Audio Mixer tool.

## Open Questions

- Which playback policies are required initially?
- Should random selection avoid immediate repetition?
- Should entries support weights or probabilities?
