# Frontend and Rust Quality Tooling

## Frontend

The frontend uses separate tools for separate responsibilities.

### Type checking

- TypeScript in strict mode
- `tsc --noEmit`

The initial TypeScript configuration should enable `strict`. Additional strict
options such as `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` may
be enabled where they improve correctness without creating unnecessary friction.

### TypeScript / React linting

- ESLint
- typescript-eslint
- React Hooks lint rules

Linting is responsible for semantic and structural code-quality rules, not code
formatting.

### SCSS linting

- Stylelint
- `stylelint-config-standard-scss`

SCSS Modules are linted independently from TypeScript. Project-specific design
system restrictions should be added only when a concrete recurring problem
justifies them.

### Formatting

- Prettier

Prettier formats TypeScript, TSX, SCSS, JSON, Markdown, YAML, and other supported
frontend/project files. Formatting rules should remain intentionally small and
non-controversial.

## Rust

Rust uses the standard ecosystem tools:

- `rustfmt` for formatting;
- Clippy for linting, with warnings denied in CI;
- `cargo test` for tests.

Expected checks include:

```text
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo test --workspace --all-features --locked
```

## Responsibility Separation

```text
tsc       → type correctness
ESLint    → TypeScript / React code quality
Stylelint → SCSS code quality
Prettier  → formatting
rustfmt   → Rust formatting
Clippy    → Rust linting
cargo test→ Rust tests
```

No tool should be configured to unnecessarily duplicate another tool's primary
responsibility.

## Configured Workflow

Run `npm run check` from the repository root for frontend checks, Rust workspace
checks, and IPC binding synchronization. `npm run check:ts` only requires the
frontend toolchain; `npm run check:rs` covers the application and migration crates.

Frontend tests use Vitest with jsdom and React Testing Library. This establishes
component/API interaction testing; it does not replace future Web Audio or native
desktop integration verification. Tests fail when no tests are found.

Prettier handles formatting independently of ESLint/Stylelint. Generated bindings,
lockfiles, build artifacts, and local agent instructions are not rewritten.
Rust formatting uses rustfmt. `npm run format` runs both formatters.

Versions and commands are documented in [Development Setup](../../DEVELOPMENT.md).
