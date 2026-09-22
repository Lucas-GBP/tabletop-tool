use super::{
    CampaignId, DisplayName, DomainError, Scene, SceneId, Session, SessionId, SessionSceneId,
};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    id: CampaignId,
    name: DisplayName,
    sessions: Vec<Session>,
}

impl Campaign {
    pub fn new(
        name: &str,
        initial_session_name: &str,
        initial_scene: &Scene,
    ) -> Result<Self, DomainError> {
        let id = CampaignId::new();
        Self::from_parts(
            id,
            name,
            vec![Session::new(
                SessionId::new(),
                id,
                initial_session_name,
                0,
                SessionSceneId::new(),
                initial_scene.id(),
            )?],
        )
    }

    pub fn from_parts(
        id: CampaignId,
        name: &str,
        sessions: Vec<Session>,
    ) -> Result<Self, DomainError> {
        if sessions.is_empty() {
            return Err(DomainError::CampaignRequiresSession(id));
        }
        if sessions.iter().enumerate().any(|(position, session)| {
            session.campaign_id() != id || session.position() != position
        }) {
            return Err(DomainError::InvalidStructure("campaign"));
        }
        Ok(Self {
            id,
            name: DisplayName::new(name)?,
            sessions,
        })
    }

    #[must_use]
    pub const fn id(&self) -> CampaignId {
        self.id
    }

    #[must_use]
    pub fn name(&self) -> &str {
        self.name.as_str()
    }

    #[must_use]
    pub fn sessions(&self) -> &[Session] {
        &self.sessions
    }

    #[must_use]
    pub fn uses_scene(&self, scene_id: SceneId) -> bool {
        self.sessions
            .iter()
            .any(|session| session.uses_scene(scene_id))
    }

    pub fn rename(&mut self, name: &str) -> Result<(), DomainError> {
        self.name = DisplayName::new(name)?;
        Ok(())
    }

    pub fn add_session(
        &mut self,
        name: &str,
        initial_scene: &Scene,
    ) -> Result<SessionId, DomainError> {
        self.insert_session(self.sessions.len(), name, initial_scene)
    }

    pub fn insert_session(
        &mut self,
        position: usize,
        name: &str,
        initial_scene: &Scene,
    ) -> Result<SessionId, DomainError> {
        if position > self.sessions.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.sessions.len(),
            });
        }
        let id = SessionId::new();
        self.sessions.insert(
            position,
            Session::new(
                id,
                self.id,
                name,
                position,
                SessionSceneId::new(),
                initial_scene.id(),
            )?,
        );
        self.normalize_session_positions();
        Ok(id)
    }

    pub fn rename_session(&mut self, session_id: SessionId, name: &str) -> Result<(), DomainError> {
        self.session_mut(session_id)?.rename(name)
    }

    pub fn move_session(
        &mut self,
        session_id: SessionId,
        position: usize,
    ) -> Result<(), DomainError> {
        if position >= self.sessions.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.sessions.len(),
            });
        }
        let current = self.session_position(session_id)?;
        if current != position {
            let session = self.sessions.remove(current);
            self.sessions.insert(position, session);
            self.normalize_session_positions();
        }
        Ok(())
    }

    pub fn remove_session(&mut self, session_id: SessionId) -> Result<Session, DomainError> {
        let position = self.session_position(session_id)?;
        if self.sessions.len() == 1 {
            return Err(DomainError::CannotRemoveLastSession(self.id));
        }
        let session = self.sessions.remove(position);
        self.normalize_session_positions();
        Ok(session)
    }

    pub fn add_scene(
        &mut self,
        session_id: SessionId,
        scene: &Scene,
    ) -> Result<SessionSceneId, DomainError> {
        let session = self.session_mut(session_id)?;
        session.insert_scene(scene.id(), session.scenes().len())
    }

    pub fn insert_scene(
        &mut self,
        session_id: SessionId,
        position: usize,
        scene: &Scene,
    ) -> Result<SessionSceneId, DomainError> {
        self.session_mut(session_id)?
            .insert_scene(scene.id(), position)
    }

    pub fn move_scene(
        &mut self,
        session_id: SessionId,
        scene_id: SceneId,
        position: usize,
    ) -> Result<(), DomainError> {
        self.session_mut(session_id)?.move_scene(scene_id, position)
    }

    pub fn remove_scene(
        &mut self,
        session_id: SessionId,
        scene_id: SceneId,
    ) -> Result<(), DomainError> {
        self.session_mut(session_id)?.remove_scene(scene_id)?;
        Ok(())
    }

    pub fn validate_scene_detachment(&self, scene_id: SceneId) -> Result<(), DomainError> {
        let session_ids = self
            .sessions
            .iter()
            .filter(|session| session.uses_scene(scene_id) && session.scenes().len() == 1)
            .map(Session::id)
            .collect::<Vec<_>>();
        if session_ids.is_empty() {
            Ok(())
        } else {
            Err(DomainError::SceneRequiredBySessions {
                scene_id,
                session_ids,
            })
        }
    }

    fn detach_scene(&mut self, scene_id: SceneId) -> usize {
        self.sessions
            .iter_mut()
            .map(|session| usize::from(session.detach_scene(scene_id)))
            .sum()
    }

    fn session_position(&self, session_id: SessionId) -> Result<usize, DomainError> {
        self.sessions
            .iter()
            .position(|session| session.id() == session_id)
            .ok_or(DomainError::SessionNotFound(session_id))
    }

    fn session_mut(&mut self, session_id: SessionId) -> Result<&mut Session, DomainError> {
        self.sessions
            .iter_mut()
            .find(|session| session.id() == session_id)
            .ok_or(DomainError::SessionNotFound(session_id))
    }

    fn normalize_session_positions(&mut self) {
        for (position, session) in self.sessions.iter_mut().enumerate() {
            session.set_position(position);
        }
    }
}

pub fn detach_scene_from_campaigns(
    campaigns: &mut [Campaign],
    scene_id: SceneId,
) -> Result<usize, DomainError> {
    let blocking_sessions = campaigns
        .iter()
        .flat_map(|campaign| campaign.sessions.iter())
        .filter(|session| session.uses_scene(scene_id) && session.scenes().len() == 1)
        .map(Session::id)
        .collect::<Vec<_>>();
    if !blocking_sessions.is_empty() {
        return Err(DomainError::SceneRequiredBySessions {
            scene_id,
            session_ids: blocking_sessions,
        });
    }

    Ok(campaigns
        .iter_mut()
        .map(|campaign| campaign.detach_scene(scene_id))
        .sum())
}
