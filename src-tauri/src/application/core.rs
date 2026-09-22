use crate::{
    domain::{
        detach_scene_from_campaigns, Campaign, CampaignId, DomainError, Scene, SceneId,
        SceneLevelId, SessionId,
    },
    persistence::{self, core::CoreDefinitions, RepositoryError},
};
use sea_orm::DatabaseConnection;
use std::{error::Error, fmt};

const INITIAL_SCENE_NAME: &str = "Cena inicial";
const INITIAL_LEVEL_NAME: &str = "Nível 1";
const INITIAL_SESSION_NAME: &str = "Sessão 1";

#[derive(Debug)]
pub enum ApplicationError {
    Domain(DomainError),
    Repository(RepositoryError),
}

impl fmt::Display for ApplicationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Domain(error) => error.fmt(formatter),
            Self::Repository(error) => error.fmt(formatter),
        }
    }
}

impl Error for ApplicationError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Domain(error) => Some(error),
            Self::Repository(error) => Some(error),
        }
    }
}

impl From<DomainError> for ApplicationError {
    fn from(value: DomainError) -> Self {
        Self::Domain(value)
    }
}

impl From<RepositoryError> for ApplicationError {
    fn from(value: RepositoryError) -> Self {
        Self::Repository(value)
    }
}

pub async fn list(connection: &DatabaseConnection) -> Result<CoreDefinitions, ApplicationError> {
    Ok(persistence::core::load(connection).await?)
}

pub async fn create_scene(
    connection: &DatabaseConnection,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let scene = Scene::new(name, INITIAL_LEVEL_NAME)?;
    persistence::core::insert_scene(connection, &scene).await?;
    list(connection).await
}

pub async fn create_campaign(
    connection: &DatabaseConnection,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let scene = Scene::new(INITIAL_SCENE_NAME, INITIAL_LEVEL_NAME)?;
    let campaign = Campaign::new(name, INITIAL_SESSION_NAME, &scene)?;
    persistence::core::insert_campaign_with_scene(connection, &campaign, &scene).await?;
    list(connection).await
}

pub async fn create_session(
    connection: &DatabaseConnection,
    campaign_id: CampaignId,
    name: &str,
    initial_scene_id: SceneId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = find_scene(&definitions, initial_scene_id)?.clone();
    let campaign = find_campaign_mut(&mut definitions, campaign_id)?;
    let session_id = campaign.add_session(name, &scene)?;
    let session = campaign
        .sessions()
        .iter()
        .find(|session| session.id() == session_id)
        .expect("new session belongs to its campaign")
        .clone();
    persistence::core::insert_session(connection, &session).await?;
    list(connection).await
}

pub async fn create_scene_level(
    connection: &DatabaseConnection,
    scene_id: SceneId,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = find_scene_mut(&mut definitions, scene_id)?;
    let level_id = scene.add_level(name)?;
    let level = scene
        .levels()
        .iter()
        .find(|level| level.id() == level_id)
        .expect("new level belongs to its scene")
        .clone();
    persistence::core::insert_level(connection, &level).await?;
    list(connection).await
}

pub async fn rename_campaign(
    connection: &DatabaseConnection,
    campaign_id: CampaignId,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let campaign = find_campaign_mut(&mut definitions, campaign_id)?;
    campaign.rename(name)?;
    persistence::core::update_campaign_name(connection, campaign).await?;
    list(connection).await
}

pub async fn rename_session(
    connection: &DatabaseConnection,
    session_id: SessionId,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let campaign = find_campaign_for_session_mut(&mut definitions, session_id)?;
    campaign.rename_session(session_id, name)?;
    let session = campaign
        .sessions()
        .iter()
        .find(|session| session.id() == session_id)
        .expect("renamed session remains in its campaign");
    persistence::core::update_session_name(connection, session).await?;
    list(connection).await
}

pub async fn rename_scene(
    connection: &DatabaseConnection,
    scene_id: SceneId,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = find_scene_mut(&mut definitions, scene_id)?;
    scene.rename(name)?;
    persistence::core::update_scene_name(connection, scene).await?;
    list(connection).await
}

pub async fn rename_scene_level(
    connection: &DatabaseConnection,
    level_id: SceneLevelId,
    name: &str,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = definitions
        .scenes
        .iter_mut()
        .find(|scene| scene.levels().iter().any(|level| level.id() == level_id))
        .ok_or(RepositoryError::NotFound("scene level"))?;
    scene.rename_level(level_id, name)?;
    let level = scene
        .levels()
        .iter()
        .find(|level| level.id() == level_id)
        .expect("renamed level remains in its scene")
        .clone();
    persistence::core::update_level_name(connection, &level).await?;
    list(connection).await
}

pub async fn associate_scene(
    connection: &DatabaseConnection,
    session_id: SessionId,
    scene_id: SceneId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = find_scene(&definitions, scene_id)?.clone();
    let campaign = definitions
        .campaigns
        .iter_mut()
        .find(|campaign| {
            campaign
                .sessions()
                .iter()
                .any(|session| session.id() == session_id)
        })
        .ok_or(RepositoryError::NotFound("session"))?;
    let association_id = campaign.add_scene(session_id, &scene)?;
    let association = campaign
        .sessions()
        .iter()
        .find(|session| session.id() == session_id)
        .and_then(|session| {
            session
                .scenes()
                .iter()
                .find(|association| association.id() == association_id)
        })
        .expect("new association belongs to its session")
        .clone();
    persistence::core::insert_association(connection, &association).await?;
    list(connection).await
}

pub async fn delete_campaign(
    connection: &DatabaseConnection,
    campaign_id: CampaignId,
) -> Result<CoreDefinitions, ApplicationError> {
    let definitions = list(connection).await?;
    definitions
        .campaigns
        .iter()
        .find(|campaign| campaign.id() == campaign_id)
        .ok_or(RepositoryError::NotFound("campaign"))?;
    persistence::core::delete_campaign(connection, campaign_id).await?;
    list(connection).await
}

pub async fn delete_session(
    connection: &DatabaseConnection,
    session_id: SessionId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let campaign = find_campaign_for_session_mut(&mut definitions, session_id)?;
    campaign.remove_session(session_id)?;
    persistence::core::delete_session(connection, session_id, campaign.sessions()).await?;
    list(connection).await
}

pub async fn delete_scene(
    connection: &DatabaseConnection,
    scene_id: SceneId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    find_scene(&definitions, scene_id)?;
    detach_scene_from_campaigns(&mut definitions.campaigns, scene_id)?;
    persistence::core::delete_scene(connection, scene_id, &definitions.campaigns).await?;
    list(connection).await
}

pub async fn delete_scene_level(
    connection: &DatabaseConnection,
    level_id: SceneLevelId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let scene = definitions
        .scenes
        .iter_mut()
        .find(|scene| scene.levels().iter().any(|level| level.id() == level_id))
        .ok_or(RepositoryError::NotFound("scene level"))?;
    scene.remove_level(level_id)?;
    persistence::core::delete_level(connection, level_id, scene.levels()).await?;
    list(connection).await
}

pub async fn remove_scene_from_session(
    connection: &DatabaseConnection,
    session_id: SessionId,
    scene_id: SceneId,
) -> Result<CoreDefinitions, ApplicationError> {
    let mut definitions = list(connection).await?;
    let campaign = find_campaign_for_session_mut(&mut definitions, session_id)?;
    campaign.remove_scene(session_id, scene_id)?;
    let session = campaign
        .sessions()
        .iter()
        .find(|session| session.id() == session_id)
        .expect("updated session remains in its campaign");
    persistence::core::delete_association(connection, session_id, scene_id, session.scenes())
        .await?;
    list(connection).await
}

fn find_campaign_mut(
    definitions: &mut CoreDefinitions,
    id: CampaignId,
) -> Result<&mut Campaign, RepositoryError> {
    definitions
        .campaigns
        .iter_mut()
        .find(|campaign| campaign.id() == id)
        .ok_or(RepositoryError::NotFound("campaign"))
}

fn find_campaign_for_session_mut(
    definitions: &mut CoreDefinitions,
    session_id: SessionId,
) -> Result<&mut Campaign, RepositoryError> {
    definitions
        .campaigns
        .iter_mut()
        .find(|campaign| {
            campaign
                .sessions()
                .iter()
                .any(|session| session.id() == session_id)
        })
        .ok_or(RepositoryError::NotFound("session"))
}

fn find_scene(definitions: &CoreDefinitions, id: SceneId) -> Result<&Scene, RepositoryError> {
    definitions
        .scenes
        .iter()
        .find(|scene| scene.id() == id)
        .ok_or(RepositoryError::NotFound("scene"))
}

fn find_scene_mut(
    definitions: &mut CoreDefinitions,
    id: SceneId,
) -> Result<&mut Scene, RepositoryError> {
    definitions
        .scenes
        .iter_mut()
        .find(|scene| scene.id() == id)
        .ok_or(RepositoryError::NotFound("scene"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use migration::{Migrator, MigratorTrait};
    use sea_orm::Database;
    use uuid::Uuid;

    async fn database() -> DatabaseConnection {
        let connection = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&connection, None).await.unwrap();
        connection
    }

    #[tokio::test]
    async fn commands_round_trip_through_domain_and_sqlite() {
        let connection = database().await;
        let created = create_campaign(&connection, "  Sombras  ").await.unwrap();
        let campaign = &created.campaigns[0];
        let scene = &created.scenes[0];
        let session_id = campaign.sessions()[0].id();
        assert_eq!(campaign.name(), "Sombras");
        assert_eq!(campaign.sessions()[0].name(), INITIAL_SESSION_NAME);
        assert_eq!(scene.name(), INITIAL_SCENE_NAME);
        assert_eq!(scene.levels()[0].name(), INITIAL_LEVEL_NAME);

        let updated = create_scene(&connection, "Ruínas").await.unwrap();
        let second_scene = updated
            .scenes
            .iter()
            .find(|scene| scene.name() == "Ruínas")
            .unwrap();
        let updated = associate_scene(&connection, session_id, second_scene.id())
            .await
            .unwrap();
        assert_eq!(updated.campaigns[0].sessions()[0].scenes().len(), 2);
    }

    #[tokio::test]
    async fn definition_renames_round_trip_through_sqlite() {
        let connection = database().await;
        let created = create_campaign(&connection, "Sombras").await.unwrap();
        let campaign_id = created.campaigns[0].id();
        let scene_id = created.scenes[0].id();
        let level_id = created.scenes[0].levels()[0].id();

        rename_campaign(&connection, campaign_id, "Aurora")
            .await
            .unwrap();
        rename_scene(&connection, scene_id, "Templo").await.unwrap();
        let renamed = rename_scene_level(&connection, level_id, "Cripta")
            .await
            .unwrap();

        assert_eq!(renamed.campaigns[0].name(), "Aurora");
        assert_eq!(renamed.scenes[0].name(), "Templo");
        assert_eq!(renamed.scenes[0].levels()[0].name(), "Cripta");
    }

    #[tokio::test]
    async fn core_crud_round_trips_through_domain_and_sqlite() {
        let connection = database().await;
        let created = create_campaign(&connection, "Sombras").await.unwrap();
        let campaign_id = created.campaigns[0].id();
        let first_session_id = created.campaigns[0].sessions()[0].id();
        let first_scene_id = created.scenes[0].id();

        let with_second_scene = create_scene(&connection, "Ruínas").await.unwrap();
        let second_scene_id = with_second_scene
            .scenes
            .iter()
            .find(|scene| scene.name() == "Ruínas")
            .unwrap()
            .id();
        let with_second_session =
            create_session(&connection, campaign_id, "Sessão 2", second_scene_id)
                .await
                .unwrap();
        let second_session_id = with_second_session.campaigns[0]
            .sessions()
            .iter()
            .find(|session| session.name() == "Sessão 2")
            .unwrap()
            .id();

        rename_session(&connection, second_session_id, "Final")
            .await
            .unwrap();
        let with_second_level = create_scene_level(&connection, first_scene_id, "Subsolo")
            .await
            .unwrap();
        let second_level_id = with_second_level
            .scenes
            .iter()
            .find(|scene| scene.id() == first_scene_id)
            .unwrap()
            .levels()[1]
            .id();
        associate_scene(&connection, first_session_id, second_scene_id)
            .await
            .unwrap();
        remove_scene_from_session(&connection, first_session_id, second_scene_id)
            .await
            .unwrap();
        delete_scene_level(&connection, second_level_id)
            .await
            .unwrap();
        delete_session(&connection, second_session_id)
            .await
            .unwrap();
        let without_second_scene = delete_scene(&connection, second_scene_id).await.unwrap();

        assert_eq!(without_second_scene.campaigns[0].sessions().len(), 1);
        assert_eq!(
            without_second_scene.campaigns[0].sessions()[0]
                .scenes()
                .len(),
            1
        );
        assert_eq!(without_second_scene.scenes.len(), 1);
        assert_eq!(without_second_scene.scenes[0].levels().len(), 1);

        let without_campaign = delete_campaign(&connection, campaign_id).await.unwrap();
        assert!(without_campaign.campaigns.is_empty());
        assert_eq!(without_campaign.scenes.len(), 1);
    }

    #[tokio::test]
    async fn scene_deletion_detaches_associations_and_normalizes_positions() {
        let connection = database().await;
        let created = create_campaign(&connection, "Sombras").await.unwrap();
        let session_id = created.campaigns[0].sessions()[0].id();
        let first_scene_id = created.scenes[0].id();
        let second_scene = create_scene(&connection, "Ruínas").await.unwrap();
        let second_scene_id = second_scene
            .scenes
            .iter()
            .find(|scene| scene.name() == "Ruínas")
            .unwrap()
            .id();
        associate_scene(&connection, session_id, second_scene_id)
            .await
            .unwrap();

        let deleted = delete_scene(&connection, first_scene_id).await.unwrap();
        let remaining = &deleted.campaigns[0].sessions()[0].scenes()[0];

        assert_eq!(remaining.scene_id(), second_scene_id);
        assert_eq!(remaining.position(), 0);
        assert_eq!(deleted.scenes.len(), 1);
    }

    #[tokio::test]
    async fn invalid_deletions_are_rejected_without_writing() {
        let connection = database().await;
        let created = create_campaign(&connection, "Sombras").await.unwrap();
        let campaign = &created.campaigns[0];
        let session_id = campaign.sessions()[0].id();
        let scene_id = created.scenes[0].id();
        let level_id = created.scenes[0].levels()[0].id();

        assert!(matches!(
            delete_session(&connection, session_id).await,
            Err(ApplicationError::Domain(
                DomainError::CannotRemoveLastSession(_)
            ))
        ));
        assert!(matches!(
            delete_scene_level(&connection, level_id).await,
            Err(ApplicationError::Domain(
                DomainError::CannotRemoveLastSceneLevel(_)
            ))
        ));
        assert!(matches!(
            delete_scene(&connection, scene_id).await,
            Err(ApplicationError::Domain(
                DomainError::SceneRequiredBySessions { .. }
            ))
        ));

        let unchanged = list(&connection).await.unwrap();
        assert_eq!(unchanged.campaigns.len(), 1);
        assert_eq!(unchanged.campaigns[0].sessions().len(), 1);
        assert_eq!(unchanged.scenes.len(), 1);
        assert_eq!(unchanged.scenes[0].levels().len(), 1);
    }

    #[tokio::test]
    async fn duplicate_session_scene_is_rejected_without_writing() {
        let connection = database().await;
        let created = create_campaign(&connection, "Sombras").await.unwrap();
        let session = &created.campaigns[0].sessions()[0];
        let scene_id = session.scenes()[0].scene_id();

        assert!(matches!(
            associate_scene(&connection, session.id(), scene_id).await,
            Err(ApplicationError::Domain(
                DomainError::SceneAlreadyAssociated { .. }
            ))
        ));
        assert_eq!(
            list(&connection).await.unwrap().campaigns[0].sessions()[0]
                .scenes()
                .len(),
            1
        );
    }

    #[tokio::test]
    async fn invalid_names_are_rejected_before_persistence() {
        let connection = database().await;

        assert!(matches!(
            create_scene(&connection, "  ").await,
            Err(ApplicationError::Domain(DomainError::InvalidName))
        ));
        assert!(list(&connection).await.unwrap().scenes.is_empty());
    }

    #[tokio::test]
    async fn unknown_ids_are_reported_without_writes() {
        let connection = database().await;

        assert!(matches!(
            rename_campaign(&connection, Uuid::new_v4().into(), "Aurora").await,
            Err(ApplicationError::Repository(RepositoryError::NotFound(
                "campaign"
            )))
        ));
    }

    #[tokio::test]
    async fn campaign_creation_completes_in_a_file_database() {
        let directory = std::env::temp_dir().join(format!("tabletop-core-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let database_path = directory.join("core.sqlite3");
        let connection = persistence::open(&database_path).await.unwrap();

        tokio::time::timeout(
            std::time::Duration::from_secs(2),
            create_campaign(&connection, "Sombras"),
        )
        .await
        .expect("campaign creation must not hang")
        .unwrap();

        assert_eq!(list(&connection).await.unwrap().campaigns.len(), 1);
        connection.close().await.unwrap();
        std::fs::remove_dir_all(directory).unwrap();
    }
}
