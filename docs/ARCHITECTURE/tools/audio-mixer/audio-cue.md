# Audio Cue

`Audio Cue` is the conceptual abstraction used whenever another component needs to request playable audio without distinguishing between concrete source types.

```text
AudioCue
├── AudioObject
└── AudioList
```

The active context's `AudioMixer` accepts an `AudioCue` directly:

```text
consumer
   ↓
AudioMixer.play(AudioCue)
```

For an `AudioObject`, execution creates a `Playback Instance` directly.

For an `AudioList`, the Mixer first selects one `AudioObject` according to the list's selection policy and then creates the `Playback Instance`.

`AudioComposition` is deliberately **not** an `AudioCue`. A composition has its own lifecycle, layer state, scheduling, and runtime instance.

`AudioCue` is a domain abstraction and does not prescribe a specific Rust representation such as an enum, trait, or tagged union.

## Architectural Rule

Ordinary playback consumers should depend on `AudioCue` rather than branching on `AudioObject` versus `AudioList`.

A consumer should only care about the concrete type when the distinction is intrinsically necessary to that feature.

## No Audio Trigger Layer

The initial architecture does not define a persistent or runtime `AudioTrigger` abstraction.

When application logic, UI, or another runtime component wants to execute
playable audio, it calls its context's Mixer directly:

```text
UI / Application Logic / Runtime Component
                   ↓
          AudioMixer.play(AudioCue)
```

A future event-to-audio binding abstraction may be introduced only if those associations become user-configurable and persistent data.
