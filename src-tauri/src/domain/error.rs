use super::{CampaignId, SceneId, SceneLevelId, SessionId};
use std::{error::Error, fmt};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DomainError {
    InvalidName,
    CampaignRequiresSession(CampaignId),
    SessionRequiresScene(SessionId),
    SceneRequiresLevel(SceneId),
    InvalidStructure(&'static str),
    PositionOutOfBounds {
        position: usize,
        len: usize,
    },
    SessionNotFound(SessionId),
    SceneLevelNotFound(SceneLevelId),
    SceneNotAssociated {
        session_id: SessionId,
        scene_id: SceneId,
    },
    SceneAlreadyAssociated {
        session_id: SessionId,
        scene_id: SceneId,
    },
    CannotRemoveLastSession(CampaignId),
    CannotRemoveLastScene(SessionId),
    CannotRemoveLastSceneLevel(SceneId),
    SceneRequiredBySessions {
        scene_id: SceneId,
        session_ids: Vec<SessionId>,
    },
}

impl fmt::Display for DomainError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidName => formatter.write_str("name must not be empty"),
            Self::CampaignRequiresSession(id) => {
                write!(formatter, "campaign {id} must contain a session")
            }
            Self::SessionRequiresScene(id) => {
                write!(formatter, "session {id} must contain a scene")
            }
            Self::SceneRequiresLevel(id) => {
                write!(formatter, "scene {id} must contain a scene level")
            }
            Self::InvalidStructure(entity) => write!(formatter, "invalid {entity} structure"),
            Self::PositionOutOfBounds { position, len } => {
                write!(
                    formatter,
                    "position {position} is out of bounds for length {len}"
                )
            }
            Self::SessionNotFound(id) => write!(formatter, "session {id} was not found"),
            Self::SceneLevelNotFound(id) => write!(formatter, "scene level {id} was not found"),
            Self::SceneNotAssociated {
                session_id,
                scene_id,
            } => write!(
                formatter,
                "scene {scene_id} is not associated with session {session_id}"
            ),
            Self::SceneAlreadyAssociated {
                session_id,
                scene_id,
            } => write!(
                formatter,
                "scene {scene_id} is already associated with session {session_id}"
            ),
            Self::CannotRemoveLastSession(id) => {
                write!(formatter, "campaign {id} must retain at least one session")
            }
            Self::CannotRemoveLastScene(id) => {
                write!(formatter, "session {id} must retain at least one scene")
            }
            Self::CannotRemoveLastSceneLevel(id) => {
                write!(formatter, "scene {id} must retain at least one scene level")
            }
            Self::SceneRequiredBySessions {
                scene_id,
                session_ids,
            } => write!(
                formatter,
                "scene {scene_id} is the only scene in {} session(s)",
                session_ids.len()
            ),
        }
    }
}

impl Error for DomainError {}
