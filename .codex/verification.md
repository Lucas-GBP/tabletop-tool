# Verification Guide

Pick checks based on the changed surface. Prefer focused checks first, then
broader checks when behavior crosses module boundaries.

## Documentation Only

- No build is required for pure documentation changes.
- Still run `git diff --check` if whitespace or Markdown formatting looks
  suspicious.

## Frontend TypeScript or Solid Changes

- `npm run lint:ts`
- `npm run build`

Use browser/Tauri manual testing for UI behavior that lint/build cannot prove,
especially waveform pointer interactions and numeric input editing.

## Frontend Tool Flow Changes

- `npm run test:e2e`

The E2E suite uses Playwright with mocked Tauri commands and mocked browser
audio decoding. It is good for navigation, editor workflows, cross-tool
references, autosave calls, and run-mode rendering. Still do real Tauri/manual
testing when native window behavior, real audio files, or filesystem discovery
are the changed surface.

## Rust or Tauri Command Changes

- `npm run lint:rs`
- `cd src-tauri && cargo test`

If a Tauri payload type changes, inspect generated files under
`src/bindings/tauri` and run Prettier on generated TypeScript if `ts-rs`
exports compact one-line types.

## Cross-Boundary Data Shape Changes

Run both sides:

- `cd src-tauri && cargo test`
- `npm run test:e2e`
- `npm run build`
- `npm run lint:ts`

Then manually verify:

- app loads existing mixer store or handles empty store
- new/changed data persists after save and reload
- generated frontend types match Rust structs

## Audio Mixer Behavior Changes

Recommended manual checks:

- create an audio object from a file
- edit name, description, tags, volume
- edit playable start/end through text fields
- clear optional end fields and confirm they mean "until end"
- drag waveform playable and loop markers
- preview an object, seek through the waveform, stop preview
- create a list, add/remove objects, preview random list selection

For numeric input bugs, specifically test partial typing states before blur:

- empty field
- `0`
- `0.`
- decimal comma input like `1,5`
- invalid temporary text, then Escape
