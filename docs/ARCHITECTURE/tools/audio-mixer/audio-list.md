# Audio List

An **Audio List** is a persistent collection of one or more `Audio Object` entries.

When the list is executed, it does not create a distinct playback type. Instead, it selects exactly one `Audio Object` according to its configured selection strategy, and that object is then used to create a normal `Playback Instance`.

```text
Audio Trigger
    ↓
Audio List
    ↓ selection strategy
Audio Object
    ↓
Playback Instance
```

The purpose of an Audio List is to provide controlled variation between equivalent or related sounds. For example, a sword attack trigger may reference a list containing several different sword-hit `Audio Object`s so repeated executions do not always reproduce the same recording.

## Persistent Model

Conceptually:

```text
AudioList
├── selection_mode
│   ├── Sequential
│   ├── Random
│   └── WeightedRandom
│
└── entries: 1..*
    ├── audio_object
    ├── position
    └── weight
```

An Audio List must contain at least one entry.

The same `Audio Object` must not appear more than once in the same Audio List.

## Audio List Entry

An `Audio List Entry` represents the membership of one `Audio Object` in one `Audio List`.

The relationship is explicit because the membership itself carries configuration:

- `audio_object`: the referenced `Audio Object`;
- `position`: the persistent ordering of the entry;
- `weight`: a positive integer used by weighted random selection.

The entry is not currently modeled as an independent high-level domain concept; it belongs to the Audio List model.

### Position

`position` defines the stable ordering of entries.

It is required by `Sequential` selection and may also be used by the UI to present the list consistently in other selection modes.

### Weight

`weight` is a positive integer:

```text
weight >= 1
```

Weights are **relative values**, not persisted probabilities.

For example:

```text
Sword A → weight 1
Sword B → weight 2
Sword C → weight 1
```

has the same distribution as:

```text
Sword A → weight 10
Sword B → weight 20
Sword C → weight 10
```

The effective probability is derived at runtime:

```text
P(entry) = entry.weight / sum(all weights)
```

Probabilities are never stored in the database.

This avoids introducing a global persistence invariant requiring stored probabilities to remain normalized after insertions, removals, or edits.

The implementation may perform the weighted selection entirely with integer arithmetic by selecting a value within the cumulative weight range.

## Selection Modes

### Sequential

Entries are selected according to their persistent `position`.

After the last entry is selected, selection wraps around to the first entry:

```text
A → B → C → A → B → C → ...
```

Sequential selection requires a small amount of runtime state indicating which entry should be selected next.

That cursor is transient and must not be persisted in SQLite.

When the application starts again, a sequential list begins from its first entry.

### Random

Each execution independently selects one entry with uniform probability.

Immediate repetition is explicitly allowed:

```text
B → B → A → C → B → ...
```

The implementation must not intentionally exclude the previously selected entry.

This is deliberate: for small lists, preventing immediate repetition can create an obvious deterministic alternation such as:

```text
A → B → A → B → A → B
```

Random selection therefore requires no persistent or cross-execution state.

### Weighted Random

Each execution independently selects one entry according to its relative integer weight.

For:

```text
A → weight 1
B → weight 2
C → weight 1
```

the effective distribution is:

```text
A → 25%
B → 50%
C → 25%
```

The percentages are derived values only.

Immediate repetition is explicitly allowed. A highly weighted entry may therefore be selected multiple times consecutively.

Weighted random selection requires no persistent or cross-execution state.

## Runtime State

Only `Sequential` requires state across executions of the list:

```text
AudioList runtime state
└── sequential cursor
```

This state is strictly runtime-only.

`Random` and `WeightedRandom` perform independent selections on every execution and do not require memory of prior selections.

The implementation does not need to duplicate the complete list solely to support sequential selection. Only the cursor or equivalent selection state needs to survive between list executions while the application is running.

## Execution Semantics

Executing an Audio List performs four conceptual steps:

```text
1. Load/resolve the list entries
2. Select exactly one entry
3. Resolve its Audio Object
4. Create a normal Playback Instance for that Audio Object
```

The Audio List itself is not a playback source with independent playback state.

After selection, playback behavior is entirely governed by the selected `Audio Object` and its resulting `Playback Instance`.

## Invariants

The initial model requires:

```text
entries.len() >= 1
```

Within one Audio List:

```text
audio_object references are unique
```

For every entry:

```text
weight >= 1
```

`position` must define an unambiguous ordering suitable for sequential selection.

## Explicitly Out of Scope

The initial Audio List model does **not** include:

- disabled entries;
- probabilities persisted in SQLite;
- prevention of immediate repetition;
- shuffle-without-replacement;
- history-based selection;
- "do not repeat within N selections";
- nested Audio Lists;
- direct playback state.

These features may be introduced later only if concrete use cases justify them.

## Persistence Boundary

The Audio List definition and its entries are persistent application data and are stored through the application's SeaORM/SQLite persistence layer.

Selection runtime state, including the sequential cursor, is not persisted.
