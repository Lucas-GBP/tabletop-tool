# Audio Mixer Notes

## Scope

The mixer is a library/editor module, not a scene system.

Current scope:

`audio file -> audio object -> audio object list`

Full planned domain hierarchy:

`audio file -> audio object -> audio object list -> audio composition -> scene -> session`

Out of scope for this module:

- Scene composition.
- Hotkeys/triggers for scene playback.
- Timed random ambience composition.
- Multi-object scene layering.
- Initiative, creature, note, or session planning data.

Those future behaviors should be implemented in a later scene/composition
module that consumes audio object lists.

## Domain Model

Audio files are discovered from the filesystem and are raw material. They should
not be used directly by future scenes.

Audio objects add reusable configuration to a file:

- name
- description
- tags
- file path
- default volume
- playable region
- optional internal loop region
- fade in/out milliseconds

Audio object lists group object ids. Previewing a list randomly selects one
valid object from the list. A one-item list behaves like that object.

An audio composition is the future scene-specific layer that can decide how
objects/lists play together: looping beds, relative volumes, random ambience
frequency, and triggered sounds. It should reference mixer objects/lists rather
than duplicate their file-region settings.

A scene is a future cross-tool preparation unit. It may reference an audio
composition and other tool data such as initiative entries, creatures, notes, or
encounter preparation. A session is a future organized set of scenes for a game
session.

## Region Contract

Use `src/tools/audio-mixer/audio/audioRegions.ts` for shared region behavior.

The important helpers are:

- `parseSecondsInput`
- `parseOptionalSecondsInput`
- `normalizeAudioObjectConfig`
- `normalizeAudioRegions`
- `getAudioRegionBounds`

Keep waveform drag edits, preview seeking/playback, and text input commits on
the same semantics:

- Start values are finite, non-negative seconds.
- End values may be `null`, meaning "until the effective end".
- Regions maintain a minimum step.
- Loop bounds sit inside the playable bounds.
- Object volume is clamped between 0 and 1.
- Fade values are non-negative whole milliseconds.

## Component Responsibilities

- `AudioMixerTool.tsx`: owns mixer state, persistence load/save, preview state,
  audio picker state, and cross-panel orchestration.
- `AudioObjectPanel.tsx`: edits audio objects and commits normalized object
  changes.
- `AudioWaveform.tsx`: draws decoded waveform peaks, region markers, loop
  shading, playhead, pointer dragging, and preview seek gestures.
- `AudioObjectListPanel.tsx`: edits lists and list membership.
- `AudioPickerModal.tsx`: selects discovered audio files.
- `AudioManager.ts`: Web Audio preview playback, loop behavior, seeking, and
  progress callbacks.

## Numeric Editing

Do not parse/normalize every keystroke in numeric text fields. For smooth
editing, keep a local string draft while the field is focused:

- Commit on blur.
- Commit on Enter by blurring.
- Cancel on Escape and restore the stored value.
- Run shared parsing/normalization only at commit time.

This is especially important for seconds fields where intermediate text like
empty strings, commas, or partial decimals can occur while the user is typing.

## Preview Behavior

Preview playback should stop when the current object/list becomes invalid or
when playback-defining settings change. Pure metadata edits should not
necessarily interrupt preview.

Playback-defining settings include:

- `filePath`
- `defaultVolume`
- `playableRegion`
- `loopRegion`
