//! Persistent definitions owned by the Audio Mixer Scene Tool.
//!
//! Runtime playback remains in TypeScript. This module contains only definitions
//! and invariants that must survive application restarts.

mod domain;

pub use domain::*;
