# Project Context

## Summary

`tabletop-tool` is a local desktop app for tabletop utilities. The current
implemented tool is an audio mixer/library editor.

Stack:

- Tauri v2 backend in Rust.
- SolidJS + TypeScript frontend.
- Vite dev/build pipeline.
- SCSS modules for component styles.
- SQLite persistence through `rusqlite`.
- TypeScript bindings generated from Rust structs with `ts-rs`.

## Important Paths

- `src/App.tsx`: delegates to the app shell.
- `src/app/AppShell.tsx`: main app chrome, theme picker, active tool nav.
- `src/tools/audio-mixer/AudioMixerTool.tsx`: top-level audio mixer state and
  orchestration.
- `src/tools/audio-mixer/audio`: audio domain helpers, persistence wrapper,
  library loading, and preview playback.
- `src/tools/audio-mixer/components`: mixer UI panels and waveform UI.
- `src/database/TabletopDatabase.ts`: small frontend wrapper around Tauri
  commands.
- `src-tauri/src/lib.rs`: Tauri command registration.
- `src-tauri/src/audio_mixer.rs`: audio mixer SQLite schema and load/save
  commands.
- `src-tauri/src/audio_files.rs`: filesystem scan for available audio files.
- `src/bindings/tauri`: generated TypeScript types. Do not hand-edit.

## Data Flow

The frontend stores working mixer state in Solid signals. Loading and saving go
through `audioMixerStore.ts`, then `TabletopDatabase`, then Tauri commands.

Rust owns durable persistence in the app SQLite database. The audio mixer schema
stores metadata, object settings, tags, lists, and list membership. Audio files
remain external files, currently discovered from `public/audio` or `dist/audio`
during development/build flows.

## Generated Types

Rust structs with `#[derive(TS)]` and `#[ts(export)]` generate TypeScript files
under `src/bindings/tauri`. Frontend audio types are re-exported from
`src/tools/audio-mixer/audio/types.ts`.

When a Rust command payload or stored config shape changes:

- Update the Rust struct and persistence code together.
- Regenerate/check bindings through the Rust test/export flow.
- Keep frontend imports using the existing re-export layer when possible.
- Do not edit generated binding files manually.

## Style Notes

- Prefer small, local helpers over broad abstractions.
- Keep module boundaries visible: app shell, mixer orchestration, audio helpers,
  UI components, and Rust persistence each have separate jobs.
- Avoid adding another validation path when a shared helper already exists.
- Preserve existing user-facing Portuguese copy style unless the task is
  specifically about rewriting text.
