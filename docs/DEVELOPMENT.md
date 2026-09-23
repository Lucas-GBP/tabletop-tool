# Development Setup

The project has a configured development baseline, an application-integrated
Core Domain, and the first complete Audio Mixer implementation. Core and audio
definitions are persisted locally and managed through the React UI; Session
execution remains volatile in TypeScript.

## Prerequisites

- Node.js **24.21.x**, selected by `.node-version`.
- npm **11.19.x**, constrained by `engines`; the baseline **11.19.0** is recorded
  in `package.json` (`packageManager`).
- Rust **1.95.0**, with rustfmt and Clippy, selected by `rust-toolchain.toml`.
- The [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/):
  MSVC C++ build tools and WebView2 on Windows, Xcode tools on macOS, or the
  documented GTK/WebKit development libraries on Linux.

Install these prerequisites before running the project. `rustup show` from the
repository root installs/selects the pinned Rust toolchain if necessary. If the
Node installation contains another npm version, install the recorded version
with `npm install --global npm@11.19.0`.

Then run from the repository root:

```sh
npm ci
npm run check
npm run tauri dev
```

Use `npm ci` for an existing checkout. When intentionally changing dependencies,
use `npm install` and commit `package.json` and `package-lock.json` together.
Rust changes must include the updated `src-tauri/Cargo.lock`. CI uses locked
dependencies. Direct npm versions and the Specta prerelease compatibility set
are pinned; update them together with their consumers and checks.

`npm run dev` runs only the Vite UI. Core operations require Tauri IPC, so use
`npm run tauri dev` to exercise them against Rust and SQLite. Frontend tests mock
the generated command boundary and do not start a desktop window.

## Commands

| Command                                                                 | Purpose                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run check`                                                         | Complete gate: formatting, types, linters, tests, bindings, and frontend bundle. |
| `npm run check:format`                                                  | Check all Prettier and rustfmt formatting without modifying files.               |
| `npm run check:prettier` / `npm run check:rustfmt`                      | Check one formatting tool.                                                       |
| `npm run check:bindings`                                                | Verify generated TypeScript IPC contracts without overwriting them.              |
| `npm run typecheck`                                                     | Check TypeScript and the default-feature Rust workspace.                         |
| `npm run typecheck:typescript` / `npm run typecheck:rust`               | Run one type-checking scope.                                                     |
| `npm run lint`                                                          | Run ESLint, Stylelint, and Clippy with warnings denied.                          |
| `npm run lint:typescript` / `npm run lint:styles` / `npm run lint:rust` | Run one linter scope.                                                            |
| `npm test`                                                              | Run all frontend and Rust tests.                                                 |
| `npm run test:frontend` / `npm run test:rust`                           | Run one test scope; append `-- --watch` to the frontend command for watch mode.  |
| `npm run format`                                                        | Apply Prettier and rustfmt.                                                      |
| `npm run format:prettier` / `npm run format:rustfmt`                    | Apply one formatter.                                                             |
| `npm run bindings:generate`                                             | Generate the TypeScript IPC contracts.                                           |
| `npm run build`                                                         | Type-check TypeScript and build the frontend used by Tauri.                      |
| `npm run build:frontend`                                                | Build only the Vite bundle after a separate TypeScript check.                    |
| `npm run tauri build -- --debug --no-bundle --ci -- --locked`           | Compile the desktop app without producing an installer.                          |
| `npm run tauri build`                                                   | Compile a release app and platform bundles.                                      |

## Frontend Structure

- `src/App.tsx`: minimal React entry point.
- `src/app/`: application composition and navigation between Campaign list,
  Campaign preparation, Scene preparation, and Session execution.
- `src/components/`: shared controls, visual components, and domain-facing
  components. Its `index.ts` is the concise public import surface; internal
  components use `primitives.ts` to avoid barrel cycles.
- `src/pages/`: screen composition for Campaigns, Sessions, Scenes, and Session
  execution, exposed through a single `index.ts`.
- `src/hooks/`: React orchestration for persistent workspace and volatile runtime.
- `src/runtime/`: framework-independent, tool-agnostic `SessionRuntime` and
  `SceneRuntime` state.
- `src/tools/`: Scene Tool implementations. `audio-mixer` contains the Web Audio
  runtime independently from React rendering.
- `src/lib/`: framework-independent frontend helpers with a concise public index.
- `src/api/index.ts`: application-facing API over generated bindings.
- `src/api/bindings.ts`: generated Rust contract; do not edit manually.
- `src/styles/`: global baseline and CSS custom-property design tokens.
- `src/test/setup.ts`: Testing Library setup and cleanup.
- `tsconfig.app.json` and `tsconfig.node.json`: separate strict checks for UI and tooling.

Cross-directory frontend imports use the single `@/*` alias mapped to `src/*`.
Public `index.ts` files keep imports such as `@/components`, `@/pages`,
`@/hooks`, and `@/runtime` concise. Files within the same directory use direct relative imports
to avoid unnecessary barrel cycles. TypeScript, Vite, and Vitest declare the same
alias.

Prefer `.mts` over `.mjs` for ESM scripts and configurations where supported.
`eslint.config.mts` uses the supported `jiti` loader; `scripts/bindings.mts`
runs directly on the pinned Node version. Stylelint uses `stylelint.config.ts`
because its installed configuration loader supports `.ts`, not `.mts`.
These files are included in TypeScript checking and typed linting.

Every component or page `.tsx` under `src/app`, `src/components`, and
`src/pages` has a same-named `.module.scss` imported by that component.
SCSS partials may share mixins, but they do not replace the component-owned
module. Tokens and the global baseline stay in shared styles. New work should
reuse primitives.

`EditableText` is the shared inline-renaming interaction: double-clicking its
display value opens an input with the same typography. Enter saves; Escape or
moving focus outside the input cancels the edit without auxiliary buttons.

## IPC Generation

Define IPC-facing types and commands in Rust. The Specta registry is reused by
both `invoke_handler` and the export binary, so there is no separate hand-maintained
TypeScript command list. Generate and include changed bindings in the same commit.

```sh
npm run bindings:generate
npm run check:bindings
npm run typecheck:typescript
```

The generator runs headlessly but compiles the Tauri crate, so it needs the native
build prerequisites. Checking uses a temporary directory and does not overwrite
the tracked bindings. Pure UI/runtime types remain authored in TypeScript.

## Persistence Foundation

`src-tauri/Cargo.toml` is a workspace containing the app and the `migration` crate.
SeaORM is configured for SQLite and Tokio. At startup the app opens
`tabletop-tool.sqlite3` in its platform application-data directory and applies
the registered migrations.

The initial migration creates Campaign, Session, Scene, SceneLevel, and
SessionScene tables with foreign keys, uniqueness rules, and dense-position
constraints. Persistence tests run the schema and Core and Audio Mixer operations
against SQLite in memory, including repeatable migrations, CRUD round trips,
transaction rollback, ordering, foreign keys, and cascades.

SeaORM Migrator owns database versioning. Applied migration modules are
immutable, and each schema change receives a new migration. New migrations use
SeaORM Migration/SeaQuery builders with migration-local `DeriveIden` enums;
they do not import identifiers from current entities. Persistence code uses the
typed SeaORM Entity API for normal queries and SeaQuery for complex expressions.
Raw SQL is a localized, documented, and tested exception. The complete policy is
documented in [Structured Data](./ARCHITECTURE/persistence/structured-data.md).
The undistributed development baseline was reset so both existing migrations
already follow this typed schema pattern.

Rust keeps three concrete boundaries without a generic repository framework:

- `src-tauri/src/application/` coordinates use cases and domain mutations;
- `src-tauri/src/persistence/` maps valid aggregates to and from SeaORM entities;
- `src-tauri/src/ipc/` converts Tauri input/output and stable error DTOs.

## Core Domain

`src-tauri/src/domain` is the tool-agnostic domain module inside the main Tauri
crate. It contains typed UUID identities and the `Campaign`/`Session`/`SessionScene`
and `Scene`/`SceneLevel` aggregates. Its public mutations enforce ownership,
non-empty child collections, unique Scene use per Session, and dense positions.

Creating a Campaign atomically creates its first Session, an independent initial
Scene and SceneLevel, and the association between the Session and Scene.
Additional Sessions require an existing Scene.
Before a Scene is deleted, `detach_scene_from_campaigns` validates all affected
Campaigns; it makes no changes when any Session would become empty. A valid call
removes every association, after which deleting the independent Scene also drops
its owned SceneLevels.

The domain module has no dependency on Tauri, SeaORM, Specta, serde, the
filesystem, or frontend code. Names and aggregate reconstruction are validated
inside the domain. Persistence entities and IPC DTOs map at their own boundaries
rather than adding infrastructure derives to the domain model.

The React workspace in `./src` starts with the independent Campaign and Scene
collections. A Scene can be created and opened there before entering a Campaign.
Creating or opening a Campaign enters its preparation screen, where the user
renames or deletes the Campaign, creates, renames, or deletes Sessions, and adds
or removes reusable Scene associations. Opening or creating a Scene enters its
dedicated preparation screen, where the user renames or deletes the Scene and
creates, renames, or deletes SceneLevels. Scene Tool configuration is presented
there as well. Rust trims and rejects empty names before any persistent mutation
and returns structured IPC errors. Sessions, Scene associations, and SceneLevels
can be reordered with persistent positions kept dense by the domain and database
boundaries.

Short metadata reads have a frontend timeout and a persistent retry surface when
their initial load fails. Mutations wait for the definitive Tauri response so a
write cannot finish after the interface has reported a timeout. Asset discovery
is also exempt from the short read timeout because it may traverse a large local
directory.

Each Session displays its ordered `SessionScene` sequence and an always-visible
“Adicionar cena” area. Referenced Scenes link to the same global Scene
preparation screen. The selector includes only Scenes not already used by that
Session.

Preparation and execution are separate screens. “Iniciar sessão” instantiates
frontend-only runtime state from the saved Session sequence. Changing SceneLevel
preserves the current `SceneRuntime`; changing Scene disposes it and starts a new
one. “Encerrar sessão” disposes the active runtime and returns to preparation.
These transitions do not invoke persistent mutation commands.

The runtime stores Core identities and transient execution state rather than
mutable copies of IPC DTOs. Runtime failures use a structured `RuntimeError` and
are isolated by the React orchestration hook. The Session remains open while the
UI presents a user message and an in-memory technical diagnostic log.

## Audio Mixer

The Audio Mixer has its own persistent API and does not enlarge `CoreSnapshot`.
Rust stores AudioObjects, AudioLists, AudioCompositions, Scene audio associations,
SceneLevel layer overrides, and the master volume. General application settings
store one absolute asset root. AudioObjects store relative paths, while Rust
recursively discovers WAV, MP3, OGG, FLAC, M4A, AAC, and WebM files as transient
metadata. There is no persistent AudioFile entity. Files stay in their original
location and are never renamed or deleted by the application.
The backend grants only the configured asset root to Tauri's asset protocol and
restores that narrow grant from SQLite when the application starts. Changing the
root authorizes the validated replacement before persistence, revokes the former
root after the write, and compensates the scope or stored setting when a step
fails. Recursive discovery and media probing run on a blocking worker; an
unreadable subtree fails the scan with its path in the technical error details.
Audio tables use the `tool_audio_*` prefix so databases from prototypes with
legacy `audio_*` tables can be upgraded without overwriting their data.

The home screen opens general settings and the global audio library. A shared
searchable, folder-filterable picker creates objects and replaces their files;
creation persists defaults before opening the editor. The library provides CRUD
for objects, lists, and compositions. The AudioObject editor decodes a waveform
in the frontend, edits playback/loop regions as a local draft, and previews that
draft through the same Web Audio runtime used during a Session. Saving sends one
validated mutation to Rust. Missing paths produce warnings through affected
definitions and Scenes without making Session runtime failures fatal.

Scene preparation selects reusable cues and compositions. SceneLevel
configuration stores only disabled composition-layer IDs. During a Session,
`AudioMixer`, `PlaybackInstance`, `AudioCompositionInstance`, and
`SceneAudioRuntime` own playback, schedules, overrides, fades, loops, and
cleanup. Leaving a Scene disposes its audio; changing SceneLevel reconciles the
same Scene runtime. Runtime controls never persist their temporary state.

## CI and Packaging

[CI](../.github/workflows/ci.yml) runs on pushes and pull requests to `main` and
`develop`, and can also be dispatched manually. It checks frontend quality,
Rust quality/tests, IPC drift, and desktop compilation on Linux x64, Windows x64,
and macOS ARM64. Frontend and backend quality run once on Ubuntu; the desktop
matrix depends on both and concentrates on native compilation and packaging. A
targeted Windows test preserves coverage of platform-specific path handling
without repeating the complete Rust suite. Draft pull requests still receive
frontend and backend feedback, but the desktop matrix starts only when the pull
request is ready for review. Changing the draft state triggers a new workflow
evaluation. Independent frontend checks use parallel step groups. Rustfmt can run
beside Clippy because it does not compile; the compilation-heavy Cargo checks and
tests remain sequential and reuse one target directory. Dependencies are cached;
concurrent obsolete runs are cancelled.

For test installers, dispatch the workflow with `package` enabled. It produces
DEB, NSIS EXE, and DMG artifacts retained for 14 days. This does not publish a
GitHub release or configure production signing/notarization. Platform signing
credentials can be added when distribution becomes part of the implementation.

Action revisions are pinned; Dependabot is configured for npm, the Rust workspace,
and GitHub Actions. Repository settings such as required branch checks are managed
on GitHub and are not changed by these files.

## Editor

VS Code recommendations include ESLint, Stylelint, Prettier, rust-analyzer, and
EditorConfig. Workspace settings enable formatting and explicit lint fixes on save.
Select the workspace TypeScript version when prompted. `.editorconfig` and
`.gitattributes` establish UTF-8/LF and consistent indentation across platforms.

## Tooling References

- [Typed ESLint configuration](https://typescript-eslint.io/getting-started/typed-linting/).
- [Prettier and linters](https://prettier.io/docs/integrating-with-linters).
- [Vite CSS preprocessors](https://vite.dev/guide/features#css-pre-processors).
- [Vitest](https://vitest.dev/guide/) and [Testing Library setup](https://testing-library.com/docs/react-testing-library/setup/).
- [Tauri Specta](https://github.com/specta-rs/tauri-specta).
- [SeaORM migration setup](https://www.sea-ql.org/SeaORM/docs/migration/setting-up-migration/).
