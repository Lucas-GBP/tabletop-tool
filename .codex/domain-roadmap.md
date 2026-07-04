# Domain Roadmap

This note is for future agents planning work beyond the current audio mixer.
It compares what exists now with the intended domain hierarchy and gives an
incremental action plan.

## Target Hierarchy

The planned hierarchy is:

`audio file -> audio object -> audio object list -> audio composition -> scene -> session`

- `audio file`: raw media discovered by the app. Current development files live
  under `public/audio`.
- `audio object`: reusable, scene-independent configuration for one audio file:
  name, description, tags, base volume, playable region, optional internal loop,
  fade-in, and fade-out.
- `audio object list`: reusable pool of audio object ids. Playback should choose
  one valid object from the list; a one-item list behaves like that object.
- `audio composition`: future scene-audio layer that consumes objects/lists and
  defines how they play together: loops, relative volumes, random frequencies,
  triggers, buttons, or hotkeys.
- `scene`: future cross-tool preparation unit for the table. A scene may
  reference an audio composition and other tool data such as initiative entries,
  creatures, notes, or preparation details.
- `session`: future organized set of scenes for a game session.

## Current Baseline

The implemented app is currently an audio-library editor.

What exists:

- The app shell renders implemented tools from a small frontend registry.
- The Rust backend exposes commands for listing audio files and loading/saving
  the audio mixer, audio composition, scene, session, and initiative stores.
- SQLite persistence exists through the global `tabletop-tool.sqlite3`.
- Rust structs are exported to TypeScript with `ts-rs`; generated files under
  `src/bindings/tauri` must not be edited manually.
- The mixer owns `audio file -> audio object -> audio object list`.
- Audio-region behavior is centralized in
  `src/tools/audio-mixer/audio/audioRegions.ts`.
- Preview playback is implemented for one audio object or one randomly selected
  object from a list.

What does not exist yet:

- Full production-grade multi-track audio playback.
- Rich initiative/run-state automation.
- Advanced reusable creature library.

## Architecture Principles

- Keep the audio mixer as a library/editor. Do not add scene-specific behavior
  to mixer objects or lists.
- Future domains should consume mixer ids instead of duplicating file paths,
  playable regions, loop regions, or fades.
- Cross-tool concepts such as scenes and sessions should live outside
  `src/tools/audio-mixer`.
- Persistent domain shapes should be defined on the Rust side, exported with
  `ts-rs`, and consumed through the frontend binding layer.
- Prefer small, typed modules over a single large "scene object" with unrelated
  responsibilities.
- Separate preparation UI from table execution UI. Editing a scene and running a
  scene are different workflows.
- Deletion and broken references need explicit behavior. For example, removing
  an audio object should make compositions show a missing reference rather than
  silently rewriting the user's scene intent.

## Recommended Plan

### 1. Stabilize The Current Mixer

Goal: make `audio file -> audio object -> audio object list` reliable before
building consumers on top of it.

Tasks:

- Finish pending mixer UI work without introducing scene/composition concerns.
- Keep text inputs, waveform dragging, preview seeking, and region normalization
  on the same `audioRegions.ts` semantics.
- Confirm objects and lists save, reload, remove, and preview correctly.
- Keep object ids stable because future compositions will reference them.

Done when:

- `npm run lint:ts` and `npm run build` pass.
- For persistence or Rust type changes, `cd src-tauri && cargo test` also
  passes.
- Manual checks cover object creation, list creation, preview, seeking, region
  editing, and reload.

### 2. Create A Tool Registry

Goal: stop hardcoding the app shell around the audio mixer.

Status: done for implemented frontend tools. The registry currently contains
only the audio mixer, but the shell now renders from `src/app/tools.ts`.

Tasks:

- Add a small frontend registry, for example `src/app/tools.ts`.
- Represent each tool with id, label, optional description, icon metadata, and
  component.
- Render the sidebar from that registry.
- Keep the current audio mixer as the only active implemented tool at first.

Done when:

- Adding a future tool is a registry entry plus component import.
- The current audio mixer behavior is unchanged.

### 3. Add Shared Domain Foundations

Goal: define shared language before implementing scenes.

Status: initial frontend foundation exists in `src/domain`. It defines finite
tool ids, finite entity kinds, branded ids, and cross-tool references. Future
Rust persistence should still define persisted scene/session shapes and export
bindings through `ts-rs`.

Suggested frontend paths:

- `src/domain/ids.ts`
- `src/domain/references.ts`
- `src/session/types.ts` or `src/domain/session/types.ts`

Potential concepts:

- Stable ids for `scene`, `session`, `audioComposition`, and future tool data.
- Cross-tool references such as `{ toolId, entityKind, entityId }`.
- A common missing-reference representation for UI warnings.
- A small versioning convention for tool-specific payloads.

Done when:

- Future tools can refer to shared entities without importing mixer internals.
- Types make it clear whether data is global library data, scene data, or
  session data.

### 4. Add Scene And Session Persistence

Goal: persist cross-tool entities through the same Rust/SQLite path as the
mixer.

Status: MVP done. Scenes, sessions, audio compositions, and initiative
encounters have Rust structs, SQLite tables, Tauri commands, and generated
TypeScript bindings.

Suggested Rust modules:

- `src-tauri/src/scenes.rs`
- `src-tauri/src/sessions.rs`

Suggested frontend access:

- Extend `src/database/TabletopDatabase.ts`.
- Re-export generated types through a small domain-specific frontend module.

Data model sketch:

```text
Scene
  id
  name
  description
  notes
  audioCompositionId?
  sort/order metadata
  archived/deleted metadata if needed later

Session
  id
  name
  description
  sceneIds/order
  activeSceneId?
```

Open design choice:

- Use relational tables for core entities.
- Use either relational tables or versioned JSON payloads for tool-specific
  scene attachments. Prefer relational tables when querying or integrity matters;
  prefer versioned JSON when the payload is tool-local and likely to change.

Done when:

- Empty stores load cleanly.
- Scenes and sessions can be created, updated, removed, saved, and reloaded.
- Generated TypeScript bindings match Rust structs.

### 5. Build A Reusable Entity Editor Surface

Goal: avoid building every tool as a one-off CRUD screen.

Status: MVP done. `src/components/entity-workspace/EntityWorkspace.tsx` provides
the shared list/detail/search/create surface used by the new planning tools.

Reusable UI patterns:

- List/detail layout.
- Create, duplicate, rename, remove.
- Empty state.
- Search/filter.
- Dirty/loading/error states.
- Reference picker modal.
- Missing reference warnings.

Potential paths:

- `src/components/entity-list/...`
- `src/components/pickers/...`
- `src/domain/components/...`

Keep this modest. Extract only what scene/session/tool UIs actually share.

Done when:

- A scene list/editor can use the shared surface.
- The same surface could later support sessions, compositions, or creatures
  without rewriting the pattern.

### 6. Create A Scene Editor MVP

Goal: create scenes as first-class cross-tool entities, not mixer data.

Status: MVP done in `src/tools/scenes`.

MVP fields:

- Name.
- Description.
- Notes/preparation text.
- Optional links section for future tool attachments.

Avoid in the MVP:

- Audio layering logic.
- Initiative automation.
- Run-mode controls.

Done when:

- Scenes persist.
- The app has a real scene tool/page.
- The scene UI makes room for attachments without depending on audio yet.

### 7. Create Audio Compositions

Goal: add the missing layer between reusable mixer data and scene behavior.

Status: MVP done in `src/tools/audio-composition`. It references mixer
objects/lists by id and can test individual tracks through the mixer playback
runtime.

Potential model:

```text
AudioComposition
  id
  name
  description

AudioCompositionTrack
  id
  compositionId
  sourceKind: audioObject | audioObjectList
  sourceId
  volume
  playbackMode: loop | oneShot | randomInterval | trigger
  fadeInMs?
  fadeOutMs?
  randomMinSeconds?
  randomMaxSeconds?
  triggerLabel?
  enabled
  sortOrder
```

Rules:

- Tracks reference audio objects/lists by id.
- Tracks should not redefine playable regions or loop regions from audio
  objects.
- A list track preserves list behavior: choose one valid object per playback.
- Missing object/list references should be visible in the UI.

Done when:

- A composition can be created from mixer objects/lists.
- A composition can be previewed without being attached to a scene.
- Basic loop and trigger behavior are represented.

### 8. Attach Audio Composition To Scenes

Goal: make scenes consume compositions.

Status: MVP done. Scenes can link one audio composition and one initiative
encounter.

Tasks:

- Add scene field/reference for an audio composition.
- Add a picker to choose/create a composition from the scene editor.
- Show composition summary inside the scene.
- Show missing-reference state if a composition or underlying audio source is
  invalid.

Done when:

- A scene can be prepared with audio.
- Editing the mixer library updates what composition/scene references resolve to
  without copying audio object settings into the scene.

### 9. Add Sessions

Goal: organize scenes for a game session.

Status: MVP done in `src/tools/sessions`.

MVP fields:

- Session name.
- Description/prep notes.
- Ordered scene list.
- Optional active scene.

UI:

- Session list.
- Session detail.
- Add/remove/reorder scenes.
- Open selected scene.

Done when:

- A session can be planned as an ordered set of scenes.
- Scene editing remains separate from session organization.

### 10. Add Initiative And Creature Data

Goal: prove that scenes are cross-tool, not audio-only.

Status: MVP done in `src/tools/initiative` as encounters with participants.

Suggested approach:

- Create a separate initiative/encounter tool.
- Model reusable creatures or encounter entries separately from scene links if
  reuse matters.
- Let a scene attach an initiative/encounter reference through the shared
  reference mechanism.

Avoid:

- Making audio composition depend on initiative.
- Making initiative data live inside the audio mixer or composition module.

Done when:

- A scene can combine audio preparation with encounter preparation.
- Tool modules remain independently understandable.

### 11. Add Run Mode

Goal: create a table-facing workflow separate from preparation.

Status: MVP done in `src/tools/session-runner`. It reads prepared sessions,
scenes, audio compositions, and initiative encounters without exposing every
editor control.

Run mode should focus on:

- Current session.
- Current scene.
- Audio controls for the scene composition.
- Trigger buttons.
- Initiative state if attached.
- Quick notes/status.

Avoid:

- Showing every editor control by default.
- Mutating reusable library data during play unless explicitly requested.

Done when:

- The user can prepare scenes ahead of time, then run them with fewer editing
  controls and lower cognitive load.

## Verification Map

Documentation-only changes:

- `git diff --check`

Frontend-only changes:

- `npm run lint:ts`
- `npm run build`
- Manual UI checks for editor interactions.

Rust/Tauri persistence changes:

- `npm run lint:rs`
- `cd src-tauri && cargo test`
- Inspect generated TypeScript bindings.

Cross-boundary domain changes:

- `cd src-tauri && cargo test`
- `npm run lint:ts`
- `npm run build`
- Manual save/reload checks.

Audio behavior changes:

- Test object preview.
- Test list random preview.
- Test waveform seeking.
- Test stop/restart behavior when playback-relevant settings change.

## Main Risks

- Building scenes too early as a giant object instead of a reusable cross-tool
  system.
- Letting the audio mixer absorb composition/scene behavior.
- Duplicating audio object settings inside compositions or scenes.
- Adding frontend-only types that drift away from Rust persistence.
- Losing user intent when referenced objects/lists are deleted.
- Mixing preparation UI with run-mode UI too soon.
- Creating abstractions before at least two modules actually need them.

## Practical First Milestone

The next architecture milestone should be:

1. Keep the mixer stable.
2. Add a tool registry.
3. Add persisted scene/session types and commands.
4. Build a simple scene editor with no advanced audio.

That milestone creates the foundation for reusable scene tooling without
polluting the mixer or overbuilding the audio composition layer too early.
