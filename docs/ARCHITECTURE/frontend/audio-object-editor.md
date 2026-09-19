# Audio Object Editor UX

The `AudioObject` editor should prioritize direct visual interaction over numeric-only editing.

Numeric inputs remain available for precision and accessibility, but the primary editing workflow should happen directly on the waveform.

## Main Workflow

```text
select AudioFile
    ↓
inspect waveform
    ↓
drag playback region
    ↓
optionally enable and drag loop region
    ↓
preview current draft
    ↓
adjust visually or numerically
    ↓
save
```

The user should not need to save after every adjustment in order to hear the result.

## Available Audio Files

The editor shows the persistent `AudioFile` entries currently available to the application.

The source of truth is SQLite through Rust, not a frontend directory scan.

```text
React
  ↓ request AudioFiles
Rust
  ↓
SQLite
  ↓
AudioFileDto[]
```

When the user imports a new file:

```text
UI
 ↓
Rust import
 ↓
copy to AppData/media/audio/
 ↓
create AudioFile
 ↓
refresh available-file list
```

## Waveform

The selected AudioFile is decoded in the frontend and represented as a waveform.

The visualization should use reduced peak data rather than rendering every sample.

Conceptually:

```text
audio file
   ↓
Web Audio decode
   ↓
AudioBuffer
   ↓
peak extraction / downsampling
   ↓
waveform
```

The peak representation is runtime/UI data and does not need to be persisted initially.

## Playback Region

The playback region represents:

```text
start_time_us
end_time_us
```

The primary interaction is direct region selection over the waveform.

```text
waveform
────────────────────────────────────────────

        [========= playback region =========]
        ↑                                   ↑
      start                                end
```

The user must be able to:

- drag across the waveform to create the playback region;
- drag the left edge to change `start_time`;
- drag the right edge to change `end_time`;
- drag the interior of the selected region to move the whole region while preserving its duration.

The region must always remain inside the AudioFile duration.

## Loop Region

Looping is optional.

When enabled, the loop region appears inside the playback region:

```text
        [========= playback region =========]
              [===== loop region =====]
```

The loop region represents:

```text
start_loop_time_us
end_loop_time_us
```

It uses the same direct-manipulation rules:

- drag to create/select the loop region;
- drag either edge to resize it;
- drag the interior to move it.

The loop region must remain fully contained within the playback region.

## Explicit Editing Target

Basic editing must not depend on keyboard modifiers such as Shift or Ctrl.

The UI should make the active region explicit:

```text
Editing:
● Playback region
○ Loop region
```

The same drag gesture can then be reused predictably for either region.

When looping is disabled, loop-region editing controls are hidden or disabled.

## Numeric Inputs

Every visually editable timing value also has a numeric input:

```text
start
end
loop start
loop end
```

Visual and numeric representations are two interfaces to the same draft state.

```text
drag waveform
    ↓
draft changes
    ↓
numeric inputs update
```

and:

```text
edit numeric input
    ↓
draft changes
    ↓
waveform region updates
```

Numeric editing exists for precise adjustment after coarse mouse interaction.

Persistent storage remains integer microseconds even if the UI presents friendlier units.

## Preview

Preview is a first-class part of the editor.

The user must be able to listen to the current unsaved draft.

```text
AudioObjectDraft
      ↓
preview PlaybackInstance
      ↓
Web Audio API
```

Preview should respect the draft values for:

- playback start/end;
- optional loop region;
- loop crossfade;
- fade-in;
- fade-out;
- volume.

The expected controls are conceptually:

```text
[ Play / Preview ] [ Pause ] [ Stop ]
```

Preview must not require persisting the draft first.

## Preview Playhead

While preview is active, the waveform shows a playhead indicating the current playback position.

```text
                     ▼
▂▄▆██▅▂▃▇████▅▃▂▅▇██│██▅▃▂
      [==============│=========]
            [=========│===]
```

The playhead is runtime-only UI state.

Clicking a point on the waveform should also allow positioning the preview cursor when doing so is compatible with the current preview state.

## Draft State

Editing happens against a frontend draft rather than directly against the persistent object.

```text
Persistent AudioObject
        ↓ load
AudioObjectDraft
        ↓ edit / preview
AudioObjectDraft
        ↓ save
Rust validation
        ↓
SQLite
```

Dragging regions must not produce IPC calls for every pointer movement.

Rust is invoked when an explicit persistent operation is requested, such as Save.

Rust validates the final draft again before persistence.

## Non-Destructive Editing

The editor never modifies the underlying audio file.

An `AudioObject` only describes how part of an `AudioFile` should be played.

```text
AudioFile
    unchanged

AudioObject
    defines playback behavior
```

The initial editor is not an audio-file editor.

The following are outside the initial scope:

- destructive cutting;
- rewriting audio files;
- sample editing;
- normalization of source files;
- spectrogram editing;
- waveform effects processing.

## UX Principle

The normal workflow should be:

```text
select
→ drag
→ listen
→ adjust
→ save
```

Numeric fields support precision, but should not be required for ordinary region editing.
