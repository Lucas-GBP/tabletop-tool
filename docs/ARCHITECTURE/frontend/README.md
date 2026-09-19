# Frontend Architecture

The `tabletop-tools` frontend is a local desktop UI hosted by Tauri.

## Technology Stack

```text
Vite
└── React
    ├── TypeScript (strict)
    └── SCSS Modules
```

The frontend communicates with the Rust application through Tauri IPC. It does
not access SQLite or the filesystem directly for application operations.

```text
React UI
   │
   ▼
Typed frontend API
   │
   ▼
Tauri IPC
   │
   ▼
Rust Application Layer
```

## Visual Architecture

Visual consistency is built around reusable primitive components rather than
feature-specific duplicated styles.

```text
Design Tokens
     │
     ▼
Primitive Components
     │
     ▼
Composite Components
     │
     ▼
Features / Screens
```

SCSS Modules are the default styling mechanism for components. CSS custom
properties should be preferred for runtime design tokens such as colors,
spacing, and theme-dependent values.

Feature components may control layout and composition, but should reuse an
existing primitive when that primitive already represents the intended visual
role.

## Rust ↔ TypeScript Contracts

Rust is the source of truth for the Tauri IPC contract.

[Specta + tauri-specta](./ipc-contracts.md) are used to generate TypeScript
bindings for IPC-facing Rust types, commands, and events. Equivalent TypeScript
contracts should not be maintained manually in parallel.

## Quality Tooling

The approved frontend tooling is documented in
[Quality Tooling](./quality-tooling.md).
