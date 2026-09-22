use super::{DisplayName, DomainError, SceneId, SceneLevelId};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SceneLevel {
    id: SceneLevelId,
    scene_id: SceneId,
    name: DisplayName,
    position: usize,
}

impl SceneLevel {
    pub fn from_parts(
        id: SceneLevelId,
        scene_id: SceneId,
        name: &str,
        position: usize,
    ) -> Result<Self, DomainError> {
        Ok(Self {
            id,
            scene_id,
            name: DisplayName::new(name)?,
            position,
        })
    }

    #[must_use]
    pub const fn id(&self) -> SceneLevelId {
        self.id
    }

    #[must_use]
    pub const fn scene_id(&self) -> SceneId {
        self.scene_id
    }

    #[must_use]
    pub fn name(&self) -> &str {
        self.name.as_str()
    }

    #[must_use]
    pub const fn position(&self) -> usize {
        self.position
    }

    pub fn rename(&mut self, name: &str) -> Result<(), DomainError> {
        self.name = DisplayName::new(name)?;
        Ok(())
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Scene {
    id: SceneId,
    name: DisplayName,
    levels: Vec<SceneLevel>,
}

impl Scene {
    pub fn new(name: &str, initial_level_name: &str) -> Result<Self, DomainError> {
        let id = SceneId::new();
        Self::from_parts(
            id,
            name,
            vec![SceneLevel::from_parts(
                SceneLevelId::new(),
                id,
                initial_level_name,
                0,
            )?],
        )
    }

    pub fn from_parts(
        id: SceneId,
        name: &str,
        levels: Vec<SceneLevel>,
    ) -> Result<Self, DomainError> {
        if levels.is_empty() {
            return Err(DomainError::SceneRequiresLevel(id));
        }
        if levels
            .iter()
            .enumerate()
            .any(|(position, level)| level.scene_id != id || level.position != position)
        {
            return Err(DomainError::InvalidStructure("scene"));
        }
        Ok(Self {
            id,
            name: DisplayName::new(name)?,
            levels,
        })
    }

    #[must_use]
    pub const fn id(&self) -> SceneId {
        self.id
    }

    #[must_use]
    pub fn name(&self) -> &str {
        self.name.as_str()
    }

    #[must_use]
    pub fn levels(&self) -> &[SceneLevel] {
        &self.levels
    }

    pub fn rename(&mut self, name: &str) -> Result<(), DomainError> {
        self.name = DisplayName::new(name)?;
        Ok(())
    }

    pub fn rename_level(&mut self, level_id: SceneLevelId, name: &str) -> Result<(), DomainError> {
        self.level_mut(level_id)?.rename(name)
    }

    pub fn add_level(&mut self, name: &str) -> Result<SceneLevelId, DomainError> {
        self.insert_level(self.levels.len(), name)
    }

    pub fn insert_level(
        &mut self,
        position: usize,
        name: &str,
    ) -> Result<SceneLevelId, DomainError> {
        if position > self.levels.len() {
            return Err(DomainError::PositionOutOfBounds {
                position,
                len: self.levels.len(),
            });
        }
        let id = SceneLevelId::new();
        self.levels.insert(
            position,
            SceneLevel::from_parts(id, self.id, name, position)?,
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
        let current = self.level_position(level_id)?;
        if current != position {
            let level = self.levels.remove(current);
            self.levels.insert(position, level);
            self.normalize_positions();
        }
        Ok(())
    }

    pub fn remove_level(&mut self, level_id: SceneLevelId) -> Result<SceneLevel, DomainError> {
        let position = self.level_position(level_id)?;
        if self.levels.len() == 1 {
            return Err(DomainError::CannotRemoveLastSceneLevel(self.id));
        }
        let level = self.levels.remove(position);
        self.normalize_positions();
        Ok(level)
    }

    fn level_position(&self, level_id: SceneLevelId) -> Result<usize, DomainError> {
        self.levels
            .iter()
            .position(|level| level.id == level_id)
            .ok_or(DomainError::SceneLevelNotFound(level_id))
    }

    fn level_mut(&mut self, level_id: SceneLevelId) -> Result<&mut SceneLevel, DomainError> {
        self.levels
            .iter_mut()
            .find(|level| level.id == level_id)
            .ok_or(DomainError::SceneLevelNotFound(level_id))
    }

    fn normalize_positions(&mut self) {
        for (position, level) in self.levels.iter_mut().enumerate() {
            level.position = position;
        }
    }
}
