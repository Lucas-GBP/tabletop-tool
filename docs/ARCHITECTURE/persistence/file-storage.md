# File Storage

## Decision

Binary assets remain in the user-managed local filesystem rather than inside
SQLite. The application has one general asset root, configured as an absolute
path in application settings. Tools discover the file types they support below
that root.

Persistent definitions store normalized paths relative to the asset root. They
do not store absolute paths and SQLite does not mirror discovered files in a
generic asset table.

This model applies to audio now and is prepared for images, videos, and other
binary assets used by future tools.

## Responsibility

General application settings own the asset-root configuration. Filesystem access,
recursive discovery, probing, and safe path resolution belong to Rust application
and infrastructure code. Domain concepts do not depend on operating-system paths
or Tauri filesystem APIs.

The frontend receives a transient catalog for selection and display. It never
constructs an absolute filesystem path from a persistent definition by itself.

## File lifecycle

The user may move or rename the complete asset root and then update the single
application setting. Relative references continue to work when the layout inside
the root is preserved.

The application references files in place and never copies, renames, or deletes
them. A refresh repeats recursive discovery. A stored reference that no longer
resolves remains in its owning definition and is shown as unavailable.

## Consistency boundary

The configured root is external, user-managed state. SQLite and the filesystem
do not form one transaction. Availability is therefore derived from the current
scan rather than persisted as authoritative state.

Missing assets do not trigger destructive cleanup. Preparation surfaces the
problem; runtime operations treat it as a recoverable error and isolate it from
unrelated execution.

## Open questions

- Whether content hashes would improve relocation assistance without becoming
  persistent file identity.
- Whether a concrete future workflow requires more than one asset root.
