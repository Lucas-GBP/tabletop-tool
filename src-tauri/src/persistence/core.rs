use super::{entities, RepositoryError};
use crate::domain::{
    Campaign, CampaignId, Scene, SceneId, SceneLevel, SceneLevelId, Session, SessionId,
    SessionScene,
};
use entities::{campaign, scene, scene_level, session, session_scene};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, DatabaseTransaction,
    EntityTrait, QueryFilter, QueryOrder, TransactionTrait,
};

#[derive(Debug)]
pub struct CoreDefinitions {
    pub campaigns: Vec<Campaign>,
    pub scenes: Vec<Scene>,
}

pub async fn load(connection: &DatabaseConnection) -> Result<CoreDefinitions, RepositoryError> {
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

    let scenes = scenes
        .into_iter()
        .map(|model| {
            let scene_id = SceneId::from(model.id);
            let levels = levels
                .iter()
                .filter(|level| level.scene_id == model.id)
                .map(|level| {
                    SceneLevel::from_parts(
                        level.id.into(),
                        scene_id,
                        &level.name,
                        stored_position(level.position, "scene level")?,
                    )
                    .map_err(RepositoryError::from)
                })
                .collect::<Result<Vec<_>, _>>()?;
            Scene::from_parts(scene_id, &model.name, levels).map_err(RepositoryError::from)
        })
        .collect::<Result<Vec<_>, _>>()?;

    let campaigns = campaigns
        .into_iter()
        .map(|model| {
            let campaign_id = CampaignId::from(model.id);
            let domain_sessions = sessions
                .iter()
                .filter(|item| item.campaign_id == model.id)
                .map(|item| {
                    let session_id = item.id.into();
                    let links = associations
                        .iter()
                        .filter(|link| link.session_id == item.id)
                        .map(|link| {
                            Ok(SessionScene::from_parts(
                                link.id.into(),
                                session_id,
                                link.scene_id.into(),
                                stored_position(link.position, "session scene")?,
                            ))
                        })
                        .collect::<Result<Vec<_>, RepositoryError>>()?;
                    Session::from_parts(
                        session_id,
                        campaign_id,
                        &item.name,
                        stored_position(item.position, "session")?,
                        links,
                    )
                    .map_err(RepositoryError::from)
                })
                .collect::<Result<Vec<_>, _>>()?;
            Campaign::from_parts(campaign_id, &model.name, domain_sessions)
                .map_err(RepositoryError::from)
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(CoreDefinitions { campaigns, scenes })
}

pub async fn insert_scene(
    connection: &DatabaseConnection,
    definition: &Scene,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    scene_model(definition).insert(&transaction).await?;
    for level in definition.levels() {
        level_model(level)?.insert(&transaction).await?;
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn insert_campaign_with_scene(
    connection: &DatabaseConnection,
    definition: &Campaign,
    initial_scene: &Scene,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    scene_model(initial_scene).insert(&transaction).await?;
    for level in initial_scene.levels() {
        level_model(level)?.insert(&transaction).await?;
    }
    campaign_model(definition).insert(&transaction).await?;
    for session in definition.sessions() {
        session_model(session)?.insert(&transaction).await?;
        for association in session.scenes() {
            association_model(association)?.insert(&transaction).await?;
        }
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn insert_session(
    connection: &DatabaseConnection,
    definition: &Session,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    session_model(definition)?.insert(&transaction).await?;
    for association in definition.scenes() {
        association_model(association)?.insert(&transaction).await?;
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn insert_level(
    connection: &DatabaseConnection,
    definition: &SceneLevel,
) -> Result<(), RepositoryError> {
    level_model(definition)?.insert(connection).await?;
    Ok(())
}

pub async fn insert_association(
    connection: &DatabaseConnection,
    definition: &SessionScene,
) -> Result<(), RepositoryError> {
    association_model(definition)?.insert(connection).await?;
    Ok(())
}

pub async fn update_campaign_name(
    connection: &DatabaseConnection,
    definition: &Campaign,
) -> Result<(), RepositoryError> {
    let mut active: campaign::ActiveModel =
        find_campaign(connection, definition.id()).await?.into();
    active.name = Set(definition.name().to_owned());
    active.update(connection).await?;
    Ok(())
}

pub async fn update_scene_name(
    connection: &DatabaseConnection,
    definition: &Scene,
) -> Result<(), RepositoryError> {
    let model = scene::Entity::find_by_id(definition.id().into_uuid())
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("scene"))?;
    let mut active: scene::ActiveModel = model.into();
    active.name = Set(definition.name().to_owned());
    active.update(connection).await?;
    Ok(())
}

pub async fn update_session_name(
    connection: &DatabaseConnection,
    definition: &Session,
) -> Result<(), RepositoryError> {
    let model = session::Entity::find_by_id(definition.id().into_uuid())
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("session"))?;
    let mut active: session::ActiveModel = model.into();
    active.name = Set(definition.name().to_owned());
    active.update(connection).await?;
    Ok(())
}

pub async fn update_level_name(
    connection: &DatabaseConnection,
    definition: &SceneLevel,
) -> Result<(), RepositoryError> {
    let model = scene_level::Entity::find_by_id(definition.id().into_uuid())
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("scene level"))?;
    let mut active: scene_level::ActiveModel = model.into();
    active.name = Set(definition.name().to_owned());
    active.update(connection).await?;
    Ok(())
}

pub async fn delete_campaign(
    connection: &DatabaseConnection,
    id: CampaignId,
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    let sessions = session::Entity::find()
        .filter(session::Column::CampaignId.eq(id.into_uuid()))
        .all(&transaction)
        .await?;
    let session_ids = sessions
        .iter()
        .map(|session| session.id)
        .collect::<Vec<_>>();
    if !session_ids.is_empty() {
        session_scene::Entity::delete_many()
            .filter(session_scene::Column::SessionId.is_in(session_ids))
            .exec(&transaction)
            .await?;
    }
    session::Entity::delete_many()
        .filter(session::Column::CampaignId.eq(id.into_uuid()))
        .exec(&transaction)
        .await?;
    let result = campaign::Entity::delete_by_id(id.into_uuid())
        .exec(&transaction)
        .await?;
    if result.rows_affected == 0 {
        return Err(RepositoryError::NotFound("campaign"));
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn delete_session(
    connection: &DatabaseConnection,
    id: SessionId,
    remaining: &[Session],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    session_scene::Entity::delete_many()
        .filter(session_scene::Column::SessionId.eq(id.into_uuid()))
        .exec(&transaction)
        .await?;
    let result = session::Entity::delete_by_id(id.into_uuid())
        .exec(&transaction)
        .await?;
    if result.rows_affected == 0 {
        return Err(RepositoryError::NotFound("session"));
    }
    update_session_positions(&transaction, remaining).await?;
    transaction.commit().await?;
    Ok(())
}

pub async fn delete_scene(
    connection: &DatabaseConnection,
    id: SceneId,
    campaigns: &[Campaign],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    session_scene::Entity::delete_many()
        .filter(session_scene::Column::SceneId.eq(id.into_uuid()))
        .exec(&transaction)
        .await?;
    for campaign in campaigns {
        for session in campaign.sessions() {
            update_association_positions(&transaction, session.scenes()).await?;
        }
    }
    scene_level::Entity::delete_many()
        .filter(scene_level::Column::SceneId.eq(id.into_uuid()))
        .exec(&transaction)
        .await?;
    let result = scene::Entity::delete_by_id(id.into_uuid())
        .exec(&transaction)
        .await?;
    if result.rows_affected == 0 {
        return Err(RepositoryError::NotFound("scene"));
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn delete_level(
    connection: &DatabaseConnection,
    id: SceneLevelId,
    remaining: &[SceneLevel],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    let result = scene_level::Entity::delete_by_id(id.into_uuid())
        .exec(&transaction)
        .await?;
    if result.rows_affected == 0 {
        return Err(RepositoryError::NotFound("scene level"));
    }
    update_level_positions(&transaction, remaining).await?;
    transaction.commit().await?;
    Ok(())
}

pub async fn delete_association(
    connection: &DatabaseConnection,
    session_id: SessionId,
    scene_id: SceneId,
    remaining: &[SessionScene],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    let result = session_scene::Entity::delete_many()
        .filter(session_scene::Column::SessionId.eq(session_id.into_uuid()))
        .filter(session_scene::Column::SceneId.eq(scene_id.into_uuid()))
        .exec(&transaction)
        .await?;
    if result.rows_affected == 0 {
        return Err(RepositoryError::NotFound("session scene"));
    }
    update_association_positions(&transaction, remaining).await?;
    transaction.commit().await?;
    Ok(())
}

async fn update_session_positions(
    transaction: &DatabaseTransaction,
    definitions: &[Session],
) -> Result<(), RepositoryError> {
    for (index, definition) in definitions.iter().enumerate() {
        session::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(temporary_position(index, definitions.len())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    for definition in definitions {
        session::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(stored_position_from_usize(definition.position())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    Ok(())
}

pub async fn replace_session_positions(
    connection: &DatabaseConnection,
    definitions: &[Session],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    update_session_positions(&transaction, definitions).await?;
    transaction.commit().await?;
    Ok(())
}

async fn update_level_positions(
    transaction: &DatabaseTransaction,
    definitions: &[SceneLevel],
) -> Result<(), RepositoryError> {
    for (index, definition) in definitions.iter().enumerate() {
        scene_level::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(temporary_position(index, definitions.len())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    for definition in definitions {
        scene_level::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(stored_position_from_usize(definition.position())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    Ok(())
}

pub async fn replace_level_positions(
    connection: &DatabaseConnection,
    definitions: &[SceneLevel],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    update_level_positions(&transaction, definitions).await?;
    transaction.commit().await?;
    Ok(())
}

async fn update_association_positions(
    transaction: &DatabaseTransaction,
    definitions: &[SessionScene],
) -> Result<(), RepositoryError> {
    for (index, definition) in definitions.iter().enumerate() {
        session_scene::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(temporary_position(index, definitions.len())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    for definition in definitions {
        session_scene::ActiveModel {
            id: Set(definition.id().into_uuid()),
            position: Set(stored_position_from_usize(definition.position())?),
            ..Default::default()
        }
        .update(transaction)
        .await?;
    }
    Ok(())
}

pub async fn replace_association_positions(
    connection: &DatabaseConnection,
    definitions: &[SessionScene],
) -> Result<(), RepositoryError> {
    let transaction = connection.begin().await?;
    update_association_positions(&transaction, definitions).await?;
    transaction.commit().await?;
    Ok(())
}

async fn find_campaign(
    connection: &DatabaseConnection,
    id: CampaignId,
) -> Result<campaign::Model, RepositoryError> {
    campaign::Entity::find_by_id(id.into_uuid())
        .one(connection)
        .await?
        .ok_or(RepositoryError::NotFound("campaign"))
}

fn campaign_model(definition: &Campaign) -> campaign::ActiveModel {
    campaign::ActiveModel {
        id: Set(definition.id().into_uuid()),
        name: Set(definition.name().to_owned()),
    }
}

fn scene_model(definition: &Scene) -> scene::ActiveModel {
    scene::ActiveModel {
        id: Set(definition.id().into_uuid()),
        name: Set(definition.name().to_owned()),
    }
}

fn session_model(definition: &Session) -> Result<session::ActiveModel, RepositoryError> {
    Ok(session::ActiveModel {
        id: Set(definition.id().into_uuid()),
        campaign_id: Set(definition.campaign_id().into_uuid()),
        name: Set(definition.name().to_owned()),
        position: Set(stored_position_from_usize(definition.position())?),
    })
}

fn level_model(definition: &SceneLevel) -> Result<scene_level::ActiveModel, RepositoryError> {
    Ok(scene_level::ActiveModel {
        id: Set(definition.id().into_uuid()),
        scene_id: Set(definition.scene_id().into_uuid()),
        name: Set(definition.name().to_owned()),
        position: Set(stored_position_from_usize(definition.position())?),
    })
}

fn association_model(
    definition: &SessionScene,
) -> Result<session_scene::ActiveModel, RepositoryError> {
    Ok(session_scene::ActiveModel {
        id: Set(definition.id().into_uuid()),
        session_id: Set(definition.session_id().into_uuid()),
        scene_id: Set(definition.scene_id().into_uuid()),
        position: Set(stored_position_from_usize(definition.position())?),
    })
}

fn stored_position(value: i32, entity: &'static str) -> Result<usize, RepositoryError> {
    usize::try_from(value).map_err(|_| {
        RepositoryError::InvalidData(crate::domain::DomainError::InvalidStructure(entity))
    })
}

fn stored_position_from_usize(value: usize) -> Result<i32, RepositoryError> {
    i32::try_from(value).map_err(|_| RepositoryError::PositionOverflow)
}

fn temporary_position(index: usize, count: usize) -> Result<i32, RepositoryError> {
    stored_position_from_usize(
        count
            .checked_add(1)
            .and_then(|offset| offset.checked_add(index))
            .ok_or(RepositoryError::PositionOverflow)?,
    )
}
