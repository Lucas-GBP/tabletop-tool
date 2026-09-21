//! SeaORM infrastructure for local Core definitions.

pub mod entities;

use entities::{campaign, scene, scene_level, session, session_scene};
use migration::{Migrator, MigratorTrait};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectOptions, Database, DatabaseConnection,
    DbErr, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, TransactionTrait,
};
use std::{error::Error, fmt, path::Path};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    connection: DatabaseConnection,
}

impl AppState {
    #[must_use]
    pub fn new(connection: DatabaseConnection) -> Self {
        Self { connection }
    }

    #[must_use]
    pub fn connection(&self) -> &DatabaseConnection {
        &self.connection
    }
}

#[derive(Debug)]
pub enum RepositoryError {
    Database(DbErr),
    NotFound(&'static str),
    SceneAlreadyAssociated,
    PositionOverflow,
}

impl fmt::Display for RepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(_) => formatter.write_str("database operation failed"),
            Self::NotFound(entity) => write!(formatter, "{entity} was not found"),
            Self::SceneAlreadyAssociated => {
                formatter.write_str("scene is already associated with this session")
            }
            Self::PositionOverflow => formatter.write_str("collection is too large"),
        }
    }
}

impl Error for RepositoryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            _ => None,
        }
    }
}

impl From<DbErr> for RepositoryError {
    fn from(value: DbErr) -> Self {
        Self::Database(value)
    }
}

#[derive(Debug)]
pub struct CoreRecords {
    pub campaigns: Vec<campaign::Model>,
    pub sessions: Vec<session::Model>,
    pub scenes: Vec<scene::Model>,
    pub levels: Vec<scene_level::Model>,
    pub associations: Vec<session_scene::Model>,
}

pub async fn open(path: &Path) -> Result<DatabaseConnection, DbErr> {
    let normalized = path.to_string_lossy().replace('\\', "/");
    let options = ConnectOptions::new(format!("sqlite://{normalized}?mode=rwc"));
    let connection = Database::connect(options).await?;
    Migrator::up(&connection, None).await?;
    Ok(connection)
}

pub async fn snapshot(connection: &DatabaseConnection) -> Result<CoreRecords, RepositoryError> {
    let (campaigns, sessions, scenes, levels, associations) = tokio::try_join!(
        campaign::Entity::find()
            .order_by_asc(campaign::Column::Name)
            .all(connection),
        session::Entity::find()
            .order_by_asc(session::Column::CampaignId)
            .order_by_asc(session::Column::Position)
            .all(connection),
        scene::Entity::find()
            .order_by_asc(scene::Column::Name)
            .all(connection),
        scene_level::Entity::find()
            .order_by_asc(scene_level::Column::SceneId)
            .order_by_asc(scene_level::Column::Position)
            .all(connection),
        session_scene::Entity::find()
            .order_by_asc(session_scene::Column::SessionId)
            .order_by_asc(session_scene::Column::Position)
            .all(connection),
    )?;
    Ok(CoreRecords {
        campaigns,
        sessions,
        scenes,
        levels,
        associations,
    })
}

pub async fn create_scene(
    connection: &DatabaseConnection,
    name: String,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    let scene_id = Uuid::new_v4();
    scene::ActiveModel {
        id: Set(scene_id),
        name: Set(name),
    }
    .insert(&transaction)
    .await?;
    scene_level::ActiveModel {
        id: Set(Uuid::new_v4()),
        scene_id: Set(scene_id),
        name: Set("Nível 1".to_owned()),
        position: Set(0),
    }
    .insert(&transaction)
    .await?;
    transaction.commit().await?;
    Ok(())
}

pub async fn create_campaign(
    connection: &DatabaseConnection,
    name: String,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    let campaign_id = Uuid::new_v4();
    let session_id = Uuid::new_v4();
    let scene_id = Uuid::new_v4();
    scene::ActiveModel {
        id: Set(scene_id),
        name: Set("Cena inicial".to_owned()),
    }
    .insert(&transaction)
    .await?;
    scene_level::ActiveModel {
        id: Set(Uuid::new_v4()),
        scene_id: Set(scene_id),
        name: Set("Nível 1".to_owned()),
        position: Set(0),
    }
    .insert(&transaction)
    .await?;
    campaign::ActiveModel {
        id: Set(campaign_id),
        name: Set(name),
    }
    .insert(&transaction)
    .await?;
    session::ActiveModel {
        id: Set(session_id),
        campaign_id: Set(campaign_id),
        name: Set("Sessão 1".to_owned()),
        position: Set(0),
    }
    .insert(&transaction)
    .await?;
    session_scene::ActiveModel {
        id: Set(Uuid::new_v4()),
        session_id: Set(session_id),
        scene_id: Set(scene_id),
        position: Set(0),
    }
    .insert(&transaction)
    .await?;
    transaction.commit().await?;
    Ok(())
}

pub async fn create_session(
    connection: &DatabaseConnection,
    campaign_id: Uuid,
    name: String,
    initial_scene_id: Uuid,
) -> Result<(), RepositoryError> {
    ensure_campaign(connection, campaign_id).await?;
    ensure_scene(connection, initial_scene_id).await?;
    let position = position_from_count(
        session::Entity::find()
            .filter(session::Column::CampaignId.eq(campaign_id))
            .count(connection)
            .await?,
    )?;
    let transaction = connection.begin().await?;
    let session_id = Uuid::new_v4();
    session::ActiveModel {
        id: Set(session_id),
        campaign_id: Set(campaign_id),
        name: Set(name),
        position: Set(position),
    }
    .insert(&transaction)
    .await?;
    session_scene::ActiveModel {
        id: Set(Uuid::new_v4()),
        session_id: Set(session_id),
        scene_id: Set(initial_scene_id),
        position: Set(0),
    }
    .insert(&transaction)
    .await?;
    transaction.commit().await?;
    Ok(())
}

pub async fn create_scene_level(
    connection: &DatabaseConnection,
    scene_id: Uuid,
    name: String,
) -> Result<(), RepositoryError> {
    ensure_scene(connection, scene_id).await?;
    let position = position_from_count(
        scene_level::Entity::find()
            .filter(scene_level::Column::SceneId.eq(scene_id))
            .count(connection)
            .await?,
    )?;
    scene_level::ActiveModel {
        id: Set(Uuid::new_v4()),
        scene_id: Set(scene_id),
        name: Set(name),
        position: Set(position),
    }
    .insert(connection)
    .await?;
    Ok(())
}

pub async fn rename_campaign(
    connection: &DatabaseConnection,
    campaign_id: Uuid,
    name: String,
) -> Result<(), RepositoryError> {
    let model = campaign::Entity::find_by_id(campaign_id)
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("campaign"))?;
    let mut active: campaign::ActiveModel = model.into();
    active.name = Set(name);
    active.update(connection).await?;
    Ok(())
}

pub async fn rename_scene(
    connection: &DatabaseConnection,
    scene_id: Uuid,
    name: String,
) -> Result<(), RepositoryError> {
    let model = scene::Entity::find_by_id(scene_id)
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("scene"))?;
    let mut active: scene::ActiveModel = model.into();
    active.name = Set(name);
    active.update(connection).await?;
    Ok(())
}

pub async fn rename_scene_level(
    connection: &DatabaseConnection,
    level_id: Uuid,
    name: String,
) -> Result<(), RepositoryError> {
    let model = scene_level::Entity::find_by_id(level_id)
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("scene level"))?;
    let mut active: scene_level::ActiveModel = model.into();
    active.name = Set(name);
    active.update(connection).await?;
    Ok(())
}

pub async fn associate_scene(
    connection: &DatabaseConnection,
    session_id: Uuid,
    scene_id: Uuid,
) -> Result<(), RepositoryError> {
    ensure_session(connection, session_id).await?;
    ensure_scene(connection, scene_id).await?;
    let existing = session_scene::Entity::find()
        .filter(session_scene::Column::SessionId.eq(session_id))
        .filter(session_scene::Column::SceneId.eq(scene_id))
        .one(connection)
        .await?;
    if existing.is_some() {
        return Err(RepositoryError::SceneAlreadyAssociated);
    }
    let position = position_from_count(
        session_scene::Entity::find()
            .filter(session_scene::Column::SessionId.eq(session_id))
            .count(connection)
            .await?,
    )?;
    session_scene::ActiveModel {
        id: Set(Uuid::new_v4()),
        session_id: Set(session_id),
        scene_id: Set(scene_id),
        position: Set(position),
    }
    .insert(connection)
    .await?;
    Ok(())
}

async fn ensure_campaign(connection: &DatabaseConnection, id: Uuid) -> Result<(), RepositoryError> {
    campaign::Entity::find_by_id(id)
        .one(connection)
        .await?
        .map(|_| ())
        .ok_or(RepositoryError::NotFound("campaign"))
}

async fn ensure_session(connection: &DatabaseConnection, id: Uuid) -> Result<(), RepositoryError> {
    session::Entity::find_by_id(id)
        .one(connection)
        .await?
        .map(|_| ())
        .ok_or(RepositoryError::NotFound("session"))
}

async fn ensure_scene(connection: &DatabaseConnection, id: Uuid) -> Result<(), RepositoryError> {
    scene::Entity::find_by_id(id)
        .one(connection)
        .await?
        .map(|_| ())
        .ok_or(RepositoryError::NotFound("scene"))
}

fn position_from_count(count: u64) -> Result<i32, RepositoryError> {
    i32::try_from(count).map_err(|_| RepositoryError::PositionOverflow)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn database() -> DatabaseConnection {
        let connection = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&connection, None).await.unwrap();
        connection
    }

    #[tokio::test]
    async fn created_core_records_round_trip_through_sqlite() {
        let connection = database().await;
        create_campaign(&connection, "Sombras".to_owned())
            .await
            .unwrap();

        let first = snapshot(&connection).await.unwrap();
        assert_eq!(first.campaigns.len(), 1);
        assert_eq!(first.sessions.len(), 1);
        assert_eq!(first.scenes.len(), 1);
        assert_eq!(first.levels.len(), 1);
        assert_eq!(first.associations.len(), 1);
        assert_eq!(first.scenes[0].name, "Cena inicial");
        assert_eq!(first.levels[0].name, "Nível 1");
        let scene_id = first.scenes[0].id;

        create_scene_level(&connection, scene_id, "Subterrâneo".to_owned())
            .await
            .unwrap();
        let campaign_id = first.campaigns[0].id;
        create_session(&connection, campaign_id, "Segundo ato".to_owned(), scene_id)
            .await
            .unwrap();
        let second = snapshot(&connection).await.unwrap();
        assert_eq!(second.sessions.len(), 2);
        assert_eq!(second.levels.len(), 2);
    }

    #[tokio::test]
    async fn core_definition_renames_round_trip_through_sqlite() {
        let connection = database().await;
        create_campaign(&connection, "Sombras".to_owned())
            .await
            .unwrap();
        let initial = snapshot(&connection).await.unwrap();
        let campaign_id = initial.campaigns[0].id;
        let scene_id = initial.scenes[0].id;
        let level_id = initial.levels[0].id;

        rename_campaign(&connection, campaign_id, "Aurora".to_owned())
            .await
            .unwrap();
        rename_scene(&connection, scene_id, "Templo".to_owned())
            .await
            .unwrap();
        rename_scene_level(&connection, level_id, "Cripta".to_owned())
            .await
            .unwrap();

        let renamed = snapshot(&connection).await.unwrap();
        assert_eq!(renamed.campaigns[0].name, "Aurora");
        assert_eq!(renamed.scenes[0].name, "Templo");
        assert_eq!(renamed.levels[0].name, "Cripta");
        assert_eq!(renamed.levels[0].scene_id, scene_id);
        assert_eq!(renamed.levels[0].position, 0);
    }

    #[tokio::test]
    async fn renaming_missing_scene_definitions_is_rejected() {
        let connection = database().await;

        assert!(matches!(
            rename_campaign(&connection, Uuid::new_v4(), "Aurora".to_owned()).await,
            Err(RepositoryError::NotFound("campaign"))
        ));
        assert!(matches!(
            rename_scene(&connection, Uuid::new_v4(), "Templo".to_owned()).await,
            Err(RepositoryError::NotFound("scene"))
        ));
        assert!(matches!(
            rename_scene_level(&connection, Uuid::new_v4(), "Cripta".to_owned()).await,
            Err(RepositoryError::NotFound("scene level"))
        ));
    }

    #[tokio::test]
    async fn duplicate_session_scene_is_rejected_without_writing() {
        let connection = database().await;
        create_campaign(&connection, "Sombras".to_owned())
            .await
            .unwrap();
        let records = snapshot(&connection).await.unwrap();
        let session_id = records.sessions[0].id;
        let scene_id = records.associations[0].scene_id;

        assert!(matches!(
            associate_scene(&connection, session_id, scene_id).await,
            Err(RepositoryError::SceneAlreadyAssociated)
        ));
        assert_eq!(
            session_scene::Entity::find()
                .count(&connection)
                .await
                .unwrap(),
            1
        );
    }

    #[tokio::test]
    async fn an_additional_scene_is_appended_to_the_session_sequence() {
        let connection = database().await;
        create_campaign(&connection, "Sombras".to_owned())
            .await
            .unwrap();
        create_scene(&connection, "Ruínas".to_owned())
            .await
            .unwrap();
        let records = snapshot(&connection).await.unwrap();
        let first_scene = records
            .associations
            .iter()
            .find(|association| association.position == 0)
            .unwrap()
            .scene_id;
        let second_scene = records
            .scenes
            .iter()
            .find(|scene| scene.name == "Ruínas")
            .unwrap()
            .id;
        let session_id = records.sessions[0].id;

        associate_scene(&connection, session_id, second_scene)
            .await
            .unwrap();

        let associations = snapshot(&connection)
            .await
            .unwrap()
            .associations
            .into_iter()
            .filter(|association| association.session_id == session_id)
            .collect::<Vec<_>>();
        assert_eq!(associations.len(), 2);
        assert_eq!(associations[0].scene_id, first_scene);
        assert_eq!(associations[0].position, 0);
        assert_eq!(associations[1].scene_id, second_scene);
        assert_eq!(associations[1].position, 1);
    }

    #[tokio::test]
    async fn campaign_creation_completes_in_a_file_database() {
        let directory = std::env::temp_dir().join(format!("tabletop-core-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&directory).unwrap();
        let database_path = directory.join("core.sqlite3");
        let connection = open(&database_path).await.unwrap();

        tokio::time::timeout(
            std::time::Duration::from_secs(2),
            create_campaign(&connection, "Sombras".to_owned()),
        )
        .await
        .expect("campaign creation must not hang")
        .unwrap();

        assert_eq!(snapshot(&connection).await.unwrap().campaigns.len(), 1);
        connection.close().await.unwrap();
        std::fs::remove_dir_all(directory).unwrap();
    }
}
