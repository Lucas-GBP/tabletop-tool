use super::{DomainError, SceneId, SceneLevelId};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SceneLevel {
    id: SceneLevelId,
    scene_id: SceneId,
    position: usize,
}

impl SceneLevel {
    #[must_use]
    pub const fn id(&self) -> SceneLevelId {
        self.id
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
pub struct Scene {
    id: SceneId,
    levels: Vec<SceneLevel>,
}

impl Scene {
    #[must_use]
    pub fn new() -> Self {
        Self::with_ids(SceneId::new(), SceneLevelId::new())
    }

    #[must_use]
    pub fn with_ids(id: SceneId, initial_level_id: SceneLevelId) -> Self {
        Self {
            id,
            levels: vec![SceneLevel {
                id: initial_level_id,
                scene_id: id,
                position: 0,
            }],
        }
    }

    #[must_use]
    pub const fn id(&self) -> SceneId {
        self.id
    }

    #[must_use]
    pub fn levels(&self) -> &[SceneLevel] {
        &self.levels
    }

    pub fn add_level(&mut self) -> SceneLevelId {
        self.insert_level(self.levels.len())
            .expect("appending a scene level is always in bounds")
    }

    pub fn insert_level(&mut self, position: usize) -> Result<SceneLevelId, DomainError> {
        if position > self.levels.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.levels.len(),
            });
        }

        let id = SceneLevelId::new();
        self.levels.insert(
            position,
            SceneLevel {
                id,
                scene_id: self.id,
                position,
            },
        );
        self.normalize_positions();
        Ok(id)
    }

    pub fn move_level(
        &mut self,
        level_id: SceneLevelId,
        position: usize,
    ) -> Result<(), DomainError> {
        if position >= self.levels.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.levels.len(),
            });
        }

        let current = self
            .levels
            .iter()
            .position(|level| level.id == level_id)
            .ok_or(DomainError::SceneLevelNotFound(level_id))?;
        if current != position {
            let level = self.levels.remove(current);
            self.levels.insert(position, level);
            self.normalize_positions();
        }
        Ok(())
    }

    pub fn remove_level(&mut self, level_id: SceneLevelId) -> Result<SceneLevel, DomainError> {
        let position = self
            .levels
            .iter()
            .position(|level| level.id == level_id)
            .ok_or(DomainError::SceneLevelNotFound(level_id))?;
        if self.levels.len() == 1 {
            return Err(DomainError::CannotRemoveLastSceneLevel(self.id));
        }
        let level = self.levels.remove(position);
        self.normalize_positions();
        Ok(level)
    }

    fn normalize_positions(&mut self) {
        for (position, level) in self.levels.iter_mut().enumerate() {
            level.position = position;
        }
    }
}

impl Default for Scene {
    fn default() -> Self {
        Self::new()
    }
}
