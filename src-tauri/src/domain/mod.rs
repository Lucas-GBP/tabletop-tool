//! Tool-agnostic domain model for organizing tabletop content.
//!
//! This crate deliberately has no dependency on Tauri, SeaORM, the filesystem,
//! frontend technologies, or Scene Tools.

mod campaign;
mod error;
mod ids;
mod scene;
mod session;

pub use campaign::{detach_scene_from_campaigns, Campaign};
pub use error::DomainError;
pub use ids::{CampaignId, SceneId, SceneLevelId, SessionId, SessionSceneId};
pub use scene::{Scene, SceneLevel};
pub use session::{Session, SessionScene};

/// Normalize a user-facing persistent name before it crosses into storage.
pub fn validate_name(value: &str) -> Result<String, DomainError> {
    let name = value.trim();
    if name.is_empty() {
        Err(DomainError::InvalidName)
    } else {
        Ok(name.to_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_trimmed_and_empty_names_are_rejected() {
        assert_eq!(validate_name("  Floresta  "), Ok("Floresta".to_owned()));
        assert_eq!(validate_name(" \n\t "), Err(DomainError::InvalidName));
    }
}
