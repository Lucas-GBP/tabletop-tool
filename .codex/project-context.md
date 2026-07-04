# Project Context

## Summary

`tabletop-tool` is a local desktop app for tabletop utilities. The current
implemented tools cover the audio library, audio compositions, scenes, sessions,
initiative encounters, and a lightweight table/run mode.

Stack:

- Tauri v2 backend in Rust.
- SolidJS + TypeScript frontend.
- Vite dev/build pipeline.
- SCSS modules for component styles.
- SQLite persistence through `rusqlite`.
- TypeScript bindings generated from Rust structs with `ts-rs`.

## Domain Hierarchy

The long-term domain hierarchy is:

`audio file -> audio object -> audio object list -> audio composition -> scene -> session`

The implemented audio mixer owns the reusable audio-library portion only:

`audio file -> audio object -> audio object list`

Future audio composition, scene, and session modules should consume mixer data
instead of putting scene/composition behavior inside the mixer.

Definitions:

- `audio file`: raw media discovered from `public/audio` or packaged audio
  assets. It is not a scene-level entity.
- `audio object`: reusable scene-independent configuration for one audio file.
- `audio object list`: reusable pool of audio object ids, with random selection
  on playback.
- `audio composition`: future scene-specific audio arrangement built from
  objects/lists.
- `scene`: future cross-tool prepared unit, potentially combining audio,
  initiative, creatures, notes, and other table data.
- `session`: future organized set of scenes for a game session.

## Important Paths

- `src/App.tsx`: delegates to the app shell.
- `src/app/AppShell.tsx`: main app chrome, theme picker, active tool nav.
- `src/app/tools.ts`: implemented tool registry used by the app shell.
- `src/domain`: shared frontend domain ids and cross-tool references for future
  scenes, sessions, compositions, and tool integrations.
- `src/tools/audio-mixer/AudioMixerTool.tsx`: top-level audio mixer state and
  orchestration.
- `src/tools/audio-composition`: scene-audio composition editor that consumes
  mixer objects/lists.
- `src/tools/scenes`: scene planner that links compositions and initiative
  encounters.
- `src/tools/sessions`: session planner that orders scenes.
- `src/tools/initiative`: encounter/participant editor.
- `src/tools/session-runner`: table-facing run mode for prepared sessions.
- `src/tools/audio-mixer/audio`: audio domain helpers, persistence wrapper,
  library loading, and preview playback.
- `src/tools/audio-mixer/components`: mixer UI panels and waveform UI.
- `src/database/TabletopDatabase.ts`: small frontend wrapper around Tauri
  commands.
- `tests/e2e`: Playwright tests for cross-tool UI flows with mocked Tauri
  commands and mocked browser audio APIs.
- `playwright.config.ts`: E2E test runner configuration.
- `src-tauri/src/lib.rs`: Tauri command registration.
- `src-tauri/src/audio_mixer.rs`: audio mixer SQLite schema and load/save
  commands.
- `src-tauri/src/audio_compositions.rs`: audio composition SQLite schema and
  load/save commands.
- `src-tauri/src/scenes.rs`: scene SQLite schema and load/save commands.
- `src-tauri/src/sessions.rs`: session SQLite schema and load/save commands.
- `src-tauri/src/initiative.rs`: initiative encounter SQLite schema and
  load/save commands.
- `src-tauri/src/audio_files.rs`: filesystem scan for available audio files.
- `src/bindings/tauri`: generated TypeScript types. Do not hand-edit.

## Data Flow

The frontend stores working mixer state in Solid signals. Loading and saving go
through `audioMixerStore.ts`, then `TabletopDatabase`, then Tauri commands.

Rust owns durable persistence in the app SQLite database. The audio mixer schema
stores metadata, object settings, tags, lists, and list membership. Composition,
scene, session, and initiative schemas store their own data and keep references
by id so missing cross-tool references can be surfaced instead of silently
deleted. Audio files remain external files, currently discovered from
`public/audio` or `dist/audio` during development/build flows.

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
