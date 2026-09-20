# Development Setup

The project has a configured development baseline. Core Domain, product schemas,
audio import, Scene execution, and Audio Mixer features are still pending.

## Prerequisites

- Node.js **24.19.0**, selected by `.node-version`.
- npm **12.0.2**, recorded in `package.json` (`packageManager`).
- Rust **1.95.0**, with rustfmt and Clippy, selected by `rust-toolchain.toml`.
- The [Tauri system prerequisites](https://v2.tauri.app/start/prerequisites/):
  MSVC C++ build tools and WebView2 on Windows, Xcode tools on macOS, or the
  documented GTK/WebKit development libraries on Linux.

Install these prerequisites before running the project. `rustup show` from the
repository root installs/selects the pinned Rust toolchain if necessary. If the
Node installation contains another npm version, install the recorded version
with `npm install --global npm@12.0.2`.

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

`npm run dev` runs only the Vite UI. The `greet` example requires Tauri IPC, so
use `npm run tauri dev` to exercise it against Rust. Frontend tests mock the
generated command boundary and do not start a desktop window.

## Commands

| Command                                                       | Purpose                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run check`                                               | Frontend quality/tests, Rust workspace quality/tests, and generated IPC synchronization. |
| `npm run check:ts`                                            | Type checking, ESLint, Stylelint, Prettier check, and Vitest.                            |
| `npm run check:rs`                                            | rustfmt check, Clippy with warnings denied, and Rust workspace tests.                    |
| `npm run typecheck`                                           | `tsc --noEmit` for application and tooling configurations.                               |
| `npm run lint` / `npm run lint:fix`                           | Type-aware TypeScript/React linting, including Hooks rules.                              |
| `npm run lint:styles` / `npm run lint:styles:fix`             | SCSS linting.                                                                            |
| `npm run format` / `npm run check:format`                     | Write/check Prettier and rustfmt formatting.                                             |
| `npm run format:ts` / `npm run check:format:ts`               | Prettier for supported frontend/configuration/documentation files.                       |
| `npm run format:rs` / `npm run check:format:rs`               | Rust workspace formatting.                                                               |
| `npm test` / `npm run test:watch`                             | Frontend tests once/in watch mode.                                                       |
| `npm run test:rs`                                             | Rust workspace tests, including the migration crate.                                     |
| `npm run bindings:generate` / `npm run check:bindings`        | Generate/check TypeScript IPC contracts.                                                 |
| `npm run build`                                               | Type-check and build the frontend.                                                       |
| `npm run tauri build -- --debug --no-bundle --ci -- --locked` | Compile the desktop app without producing an installer.                                  |
| `npm run tauri build`                                         | Compile a release app and platform bundles.                                              |

## Frontend Structure

- `src/App.tsx`: the template integration example, using the typed API boundary.
- `src/shared/api/index.ts`: application-facing API over generated bindings.
- `src/shared/api/bindings.ts`: generated Rust contract; do not edit manually.
- `src/shared/ui/`: initial Button/Input primitives with shared SCSS Modules.
- `src/shared/styles/`: global baseline and CSS custom-property design tokens.
- `src/test/setup.ts`: Testing Library setup and cleanup.
- `tsconfig.app.json` and `tsconfig.node.json`: separate strict checks for UI and tooling.

Prefer `.mts` over `.mjs` for ESM scripts and configurations where supported.
`eslint.config.mts` uses the supported `jiti` loader; `scripts/bindings.mts`
runs directly on the pinned Node version. Stylelint uses `stylelint.config.ts`
because its installed configuration loader supports `.ts`, not `.mts`.
These files are included in TypeScript checking and typed linting.

Component styling belongs in `.module.scss`; tokens and global baseline stay in
the shared styles. New features should reuse primitives. This is the initial
visual foundation, not a completed product design system.

## IPC Generation

Define IPC-facing types and commands in Rust. The Specta registry is reused by
both `invoke_handler` and the export binary, so there is no separate hand-maintained
TypeScript command list. Generate and include changed bindings in the same commit.

```sh
npm run bindings:generate
npm run check:bindings
npm run typecheck
```

The generator runs headlessly but compiles the Tauri crate, so it needs the native
build prerequisites. Checking uses a temporary directory and does not overwrite
the tracked bindings. Pure UI/runtime types remain authored in TypeScript.

## Persistence Foundation

`src-tauri/Cargo.toml` is a workspace containing the app and the `migration` crate.
SeaORM is configured only for SQLite and Tokio. The migration registry is empty
until domain schemas are implemented. `persistence::migrate` applies registered
migrations to a connection supplied by the application.

The infrastructure test opens SQLite in memory and runs the migrator twice to
verify initialization and repeatability. The app does not yet create a user
database or perform persistent product operations. Add real migrations alongside
the corresponding domain implementation; do not create placeholder product tables.

## CI and Packaging

[CI](../.github/workflows/ci.yml) runs on pushes and pull requests to `main` and
`develop`, and can also be dispatched manually. It checks frontend quality,
Rust quality/tests, IPC drift, and desktop compilation on Linux x64, Windows x64,
and macOS ARM64. Dependencies are cached; concurrent obsolete runs are cancelled.

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
