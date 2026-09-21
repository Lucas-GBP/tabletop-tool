use super::{CampaignId, DomainError, SceneId, SessionId, SessionSceneId};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SessionScene {
    id: SessionSceneId,
    session_id: SessionId,
    scene_id: SceneId,
    position: usize,
}

impl SessionScene {
    #[must_use]
    pub const fn id(&self) -> SessionSceneId {
        self.id
    }

    #[must_use]
    pub const fn session_id(&self) -> SessionId {
        self.session_id
    }

    #[must_use]
    pub const fn scene_id(&self) -> SceneId {
        self.scene_id
    }

    #[must_use]
    pub const fn position(&self) -> usize {
        self.position
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Session {
    id: SessionId,
    campaign_id: CampaignId,
    position: usize,
    scenes: Vec<SessionScene>,
}

impl Session {
    pub(crate) fn new(
        id: SessionId,
        campaign_id: CampaignId,
        position: usize,
        initial_association_id: SessionSceneId,
        initial_scene_id: SceneId,
    ) -> Self {
        Self {
            id,
            campaign_id,
            position,
            scenes: vec![SessionScene {
                id: initial_association_id,
                session_id: id,
                scene_id: initial_scene_id,
                position: 0,
            }],
        }
    }

    #[must_use]
    pub const fn id(&self) -> SessionId {
        self.id
    }

    #[must_use]
    pub const fn campaign_id(&self) -> CampaignId {
        self.campaign_id
    }

    #[must_use]
    pub const fn position(&self) -> usize {
        self.position
    }

    #[must_use]
    pub fn scenes(&self) -> &[SessionScene] {
        &self.scenes
    }

    #[must_use]
    pub fn uses_scene(&self, scene_id: SceneId) -> bool {
        self.scenes.iter().any(|link| link.scene_id == scene_id)
    }

    pub(crate) fn insert_scene(
        &mut self,
        scene_id: SceneId,
        position: usize,
    ) -> Result<SessionSceneId, DomainError> {
        if self.uses_scene(scene_id) {
            return Err(DomainError::SceneAlreadyAssociated {
                session_id: self.id,
                scene_id,
            });
        }
        if position > self.scenes.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.scenes.len(),
            });
        }

        let id = SessionSceneId::new();
        self.scenes.insert(
            position,
            SessionScene {
                id,
                session_id: self.id,
                scene_id,
                position,
            },
        );
        self.normalize_scene_positions();
        Ok(id)
    }

    pub(crate) fn move_scene(
        &mut self,
        scene_id: SceneId,
        position: usize,
    ) -> Result<(), DomainError> {
        if position >= self.scenes.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.scenes.len(),
            });
        }
        let current = self
            .scenes
            .iter()
            .position(|link| link.scene_id == scene_id)
            .ok_or(DomainError::SceneNotAssociated {
                session_id: self.id,
                scene_id,
            })?;
        if current != position {
            let link = self.scenes.remove(current);
            self.scenes.insert(position, link);
            self.normalize_scene_positions();
        }
        Ok(())
    }

    pub(crate) fn remove_scene(&mut self, scene_id: SceneId) -> Result<SessionScene, DomainError> {
        let position = self
            .scenes
            .iter()
            .position(|link| link.scene_id == scene_id)
            .ok_or(DomainError::SceneNotAssociated {
                session_id: self.id,
                scene_id,
            })?;
        if self.scenes.len() == 1 {
            return Err(DomainError::CannotRemoveLastScene(self.id));
        }
        let link = self.scenes.remove(position);
        self.normalize_scene_positions();
        Ok(link)
    }

    pub(crate) fn detach_scene(&mut self, scene_id: SceneId) -> bool {
        let Some(position) = self
            .scenes
            .iter()
            .position(|link| link.scene_id == scene_id)
        else {
            return false;
        };
        self.scenes.remove(position);
        self.normalize_scene_positions();
        true
    }

    pub(crate) fn set_position(&mut self, position: usize) {
        self.position = position;
    }

    fn normalize_scene_positions(&mut self) {
        for (position, link) in self.scenes.iter_mut().enumerate() {
            link.position = position;
        }
    }
}
