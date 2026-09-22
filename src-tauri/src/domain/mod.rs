//! Tool-agnostic domain model for organizing tabletop content.
//!
//! This crate deliberately has no dependency on Tauri, SeaORM, the filesystem,
//! frontend technologies, or Scene Tools.

mod campaign;
mod error;
mod ids;
mod name;
mod scene;
mod session;

pub use campaign::{detach_scene_from_campaigns, Campaign};
pub use error::DomainError;
pub use ids::{CampaignId, SceneId, SceneLevelId, SessionId, SessionSceneId};
pub(crate) use name::DisplayName;
pub use scene::{Scene, SceneLevel};
pub use session::{Session, SessionScene};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_trimmed_and_empty_names_are_rejected() {
        assert_eq!(
            Scene::new("  Floresta  ", "Nível 1").unwrap().name(),
            "Floresta"
        );
        assert_eq!(
            Scene::new(" \n\t ", "Nível 1"),
            Err(DomainError::InvalidName)
        );
    }
}
