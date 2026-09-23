use super::entities::{
    audio_composition, audio_composition_layer, audio_list, audio_list_entry, audio_mixer_settings,
    audio_object, scene, scene_audio_composition, scene_audio_list, scene_audio_object,
    scene_level, scene_level_audio_disabled_layer,
};
use crate::assets::AudioAsset;
use crate::audio::{
    AudioComposition, AudioCompositionId, AudioList, AudioListId, AudioListSelectionMode,
    AudioMixerSettings, AudioObject, AudioObjectDefinition, AudioObjectId, AudioValidationError,
    CompositionLayer, CompositionLayerDefinition, CompositionLayerId, DisableBehavior,
    LayerExecution, LayerSource, LoopRegion,
};
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection,
    DatabaseTransaction, DbErr, EntityTrait, ExprTrait, QueryFilter, QueryOrder, TransactionTrait,
};
use std::{
    collections::{HashMap, HashSet},
    error::Error,
    fmt,
};
use uuid::Uuid;

#[derive(Debug)]
pub enum AudioRepositoryError {
    Database(DbErr),
    InvalidData(AudioValidationError),
    InvalidStoredData(&'static str),
    NotFound(&'static str),
    InUse(&'static str),
}

impl fmt::Display for AudioRepositoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(_) => formatter.write_str("audio database operation failed"),
            Self::InvalidData(error) => error.fmt(formatter),
            Self::InvalidStoredData(entity) => write!(formatter, "stored {entity} is invalid"),
            Self::NotFound(entity) => write!(formatter, "{entity} was not found"),
            Self::InUse(entity) => write!(formatter, "{entity} is still referenced"),
        }
    }
}

impl Error for AudioRepositoryError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            Self::Database(error) => Some(error),
            Self::InvalidData(error) => Some(error),
            _ => None,
        }
    }
}

impl From<DbErr> for AudioRepositoryError {
    fn from(value: DbErr) -> Self {
        Self::Database(value)
    }
}

impl From<AudioValidationError> for AudioRepositoryError {
    fn from(value: AudioValidationError) -> Self {
        Self::InvalidData(value)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct AudioLibrary {
    pub asset_directory: Option<String>,
    pub files: Vec<AudioAsset>,
    pub objects: Vec<AudioObject>,
    pub lists: Vec<AudioList>,
    pub compositions: Vec<AudioComposition>,
    pub settings: AudioMixerSettings,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SceneAudioConfiguration {
    pub scene_id: Uuid,
    pub audio_object_ids: Vec<AudioObjectId>,
    pub audio_list_ids: Vec<AudioListId>,
    pub audio_composition_ids: Vec<AudioCompositionId>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SceneLevelAudioConfiguration {
    pub scene_level_id: Uuid,
    pub disabled_layer_ids: Vec<CompositionLayerId>,
}

pub async fn load_library(
    connection: &DatabaseConnection,
) -> Result<AudioLibrary, AudioRepositoryError> {
    let (object_models, list_models, entry_models, composition_models, layer_models) = tokio::try_join!(
        audio_object::Entity::find()
            .order_by_asc(audio_object::Column::Name)
            .order_by_asc(audio_object::Column::Id)
            .all(connection),
        audio_list::Entity::find()
            .order_by_asc(audio_list::Column::Name)
            .order_by_asc(audio_list::Column::Id)
            .all(connection),
        audio_list_entry::Entity::find()
            .order_by_asc(audio_list_entry::Column::AudioListId)
            .order_by_asc(audio_list_entry::Column::Position)
            .all(connection),
        audio_composition::Entity::find()
            .order_by_asc(audio_composition::Column::Name)
            .order_by_asc(audio_composition::Column::Id)
            .all(connection),
        audio_composition_layer::Entity::find()
            .order_by_asc(audio_composition_layer::Column::AudioCompositionId)
            .order_by_asc(audio_composition_layer::Column::Position)
            .all(connection),
    )?;

    let objects = object_models
        .into_iter()
        .map(audio_object_from_model)
        .collect::<Result<Vec<_>, _>>()?;

    let mut entries_by_list: HashMap<Uuid, Vec<audio_list_entry::Model>> = HashMap::new();
    for entry in entry_models {
        entries_by_list
            .entry(entry.audio_list_id)
            .or_default()
            .push(entry);
    }
    let lists = list_models
        .into_iter()
        .map(|model| {
            let entries = entries_by_list.remove(&model.id).unwrap_or_default();
            audio_list_from_model(model, entries)
        })
        .collect::<Result<Vec<_>, _>>()?;

    let mut layers_by_composition: HashMap<Uuid, Vec<audio_composition_layer::Model>> =
        HashMap::new();
    for layer in layer_models {
        layers_by_composition
            .entry(layer.audio_composition_id)
            .or_default()
            .push(layer);
    }
    let compositions = composition_models
        .into_iter()
        .map(|model| {
            let layers = layers_by_composition.remove(&model.id).unwrap_or_default();
            audio_composition_from_model(model, layers)
        })
        .collect::<Result<Vec<_>, _>>()?;

    let settings_model = audio_mixer_settings::Entity::find_by_id(1)
        .one(connection)
        .await?
        .ok_or(AudioRepositoryError::InvalidStoredData(
            "audio mixer settings",
        ))?;

    Ok(AudioLibrary {
        asset_directory: None,
        files: Vec::new(),
        objects,
        lists,
        compositions,
        settings: AudioMixerSettings::new(settings_model.master_volume_db)?,
    })
}

fn audio_object_from_model(
    model: audio_object::Model,
) -> Result<AudioObject, AudioRepositoryError> {
    let loop_region = match (model.start_loop_time_us, model.end_loop_time_us) {
        (Some(start_time_us), Some(end_time_us)) => Some(LoopRegion {
            start_time_us,
            end_time_us,
        }),
        (None, None) => None,
        _ => {
            return Err(AudioRepositoryError::InvalidStoredData(
                "audio object loop region",
            ));
        }
    };
    Ok(AudioObject::from_parts(
        model.id.into(),
        AudioObjectDefinition {
            name: model.name,
            asset_path: model.asset_path,
            volume_db: model.volume_db,
            start_time_us: model.start_time_us,
            end_time_us: model.end_time_us,
            loop_region,
            fade_in_duration_us: model.fade_in_duration_us,
            fade_out_duration_us: model.fade_out_duration_us,
            loop_crossfade_duration_us: model.loop_crossfade_duration_us,
        },
    )?)
}

fn audio_list_from_model(
    model: audio_list::Model,
    entries: Vec<audio_list_entry::Model>,
) -> Result<AudioList, AudioRepositoryError> {
    let mode = match model.selection_mode {
        audio_list::SelectionMode::Sequential => AudioListSelectionMode::Sequential,
        audio_list::SelectionMode::Random => AudioListSelectionMode::Random,
        audio_list::SelectionMode::WeightedRandom => AudioListSelectionMode::WeightedRandom,
    };
    let entries = entries
        .into_iter()
        .map(|entry| {
            Ok((
                entry.audio_object_id.into(),
                u32::try_from(entry.weight)
                    .map_err(|_| AudioRepositoryError::InvalidStoredData("audio list weight"))?,
            ))
        })
        .collect::<Result<Vec<_>, AudioRepositoryError>>()?;
    Ok(AudioList::from_parts(
        model.id.into(),
        &model.name,
        mode,
        entries,
    )?)
}

fn audio_composition_from_model(
    model: audio_composition::Model,
    layers: Vec<audio_composition_layer::Model>,
) -> Result<AudioComposition, AudioRepositoryError> {
    let layers = layers
        .into_iter()
        .map(layer_definition_from_model)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(AudioComposition::from_parts(
        model.id.into(),
        &model.name,
        layers,
    )?)
}

fn layer_definition_from_model(
    model: audio_composition_layer::Model,
) -> Result<CompositionLayerDefinition, AudioRepositoryError> {
    let source = match (model.audio_object_id, model.audio_list_id) {
        (Some(id), None) => LayerSource::AudioObject(id.into()),
        (None, Some(id)) => LayerSource::AudioList(id.into()),
        _ => {
            return Err(AudioRepositoryError::InvalidStoredData(
                "composition layer source",
            ));
        }
    };
    let execution = match model.execution_mode {
        audio_composition_layer::ExecutionMode::Continuous => {
            if model.min_interval_us.is_some() || model.max_interval_us.is_some() {
                return Err(AudioRepositoryError::InvalidStoredData(
                    "composition layer execution",
                ));
            }
            LayerExecution::Continuous
        }
        audio_composition_layer::ExecutionMode::RandomInterval => LayerExecution::RandomInterval {
            min_interval_us: model.min_interval_us.ok_or(
                AudioRepositoryError::InvalidStoredData("composition layer execution"),
            )?,
            max_interval_us: model.max_interval_us.ok_or(
                AudioRepositoryError::InvalidStoredData("composition layer execution"),
            )?,
        },
    };
    let disable_behavior = match model.disable_behavior {
        audio_composition_layer::StoredDisableBehavior::Stop => DisableBehavior::Stop,
        audio_composition_layer::StoredDisableBehavior::Finish => DisableBehavior::Finish,
    };
    Ok(CompositionLayerDefinition {
        id: Some(model.id.into()),
        name: model.name,
        source,
        execution,
        disable_behavior,
    })
}

pub async fn save_audio_object(
    connection: &DatabaseConnection,
    object: &AudioObject,
    create: bool,
) -> Result<(), AudioRepositoryError> {
    let active = audio_object_model(object);
    if create {
        active.insert(connection).await?;
    } else {
        require_exists(
            audio_object::Entity::find_by_id(object.id.into_uuid())
                .one(connection)
                .await?,
            "audio object",
        )?;
        active.update(connection).await?;
    }
    Ok(())
}

fn audio_object_model(object: &AudioObject) -> audio_object::ActiveModel {
    let (start_loop_time_us, end_loop_time_us) =
        object.loop_region.map_or((None, None), |region| {
            (Some(region.start_time_us), Some(region.end_time_us))
        });
    audio_object::ActiveModel {
        id: Set(object.id.into_uuid()),
        name: Set(object.name.clone()),
        asset_path: Set(object.asset_path.clone()),
        volume_db: Set(object.volume_db),
        start_time_us: Set(object.start_time_us),
        end_time_us: Set(object.end_time_us),
        start_loop_time_us: Set(start_loop_time_us),
        end_loop_time_us: Set(end_loop_time_us),
        fade_in_duration_us: Set(object.fade_in_duration_us),
        fade_out_duration_us: Set(object.fade_out_duration_us),
        loop_crossfade_duration_us: Set(object.loop_crossfade_duration_us),
    }
}

pub async fn delete_audio_object(
    connection: &DatabaseConnection,
    id: AudioObjectId,
) -> Result<(), AudioRepositoryError> {
    let result = audio_object::Entity::delete_by_id(id.into_uuid())
        .exec(connection)
        .await
        .map_err(map_constraint("audio object"))?;
    require_deleted(result.rows_affected, "audio object")
}

pub async fn save_audio_list(
    connection: &DatabaseConnection,
    list: &AudioList,
    create: bool,
) -> Result<(), AudioRepositoryError> {
    let transaction = connection.begin().await?;
    let active = audio_list::ActiveModel {
        id: Set(list.id.into_uuid()),
        name: Set(list.name.clone()),
        selection_mode: Set(selection_mode(list.selection_mode)),
    };
    if create {
        active.insert(&transaction).await?;
    } else {
        require_exists(
            audio_list::Entity::find_by_id(list.id.into_uuid())
                .one(&transaction)
                .await?,
            "audio list",
        )?;
        active.update(&transaction).await?;
        audio_list_entry::Entity::delete_many()
            .filter(audio_list_entry::Column::AudioListId.eq(list.id.into_uuid()))
            .exec(&transaction)
            .await?;
    }
    for entry in &list.entries {
        audio_list_entry::ActiveModel {
            audio_list_id: Set(list.id.into_uuid()),
            audio_object_id: Set(entry.audio_object_id.into_uuid()),
            position: Set(i32::try_from(entry.position)
                .map_err(|_| AudioRepositoryError::InvalidStoredData("audio list position"))?),
            weight: Set(i32::try_from(entry.weight)
                .map_err(|_| AudioRepositoryError::InvalidStoredData("audio list weight"))?),
        }
        .insert(&transaction)
        .await?;
    }
    transaction.commit().await?;
    Ok(())
}

fn selection_mode(value: AudioListSelectionMode) -> audio_list::SelectionMode {
    match value {
        AudioListSelectionMode::Sequential => audio_list::SelectionMode::Sequential,
        AudioListSelectionMode::Random => audio_list::SelectionMode::Random,
        AudioListSelectionMode::WeightedRandom => audio_list::SelectionMode::WeightedRandom,
    }
}

pub async fn delete_audio_list(
    connection: &DatabaseConnection,
    id: AudioListId,
) -> Result<(), AudioRepositoryError> {
    let result = audio_list::Entity::delete_by_id(id.into_uuid())
        .exec(connection)
        .await
        .map_err(map_constraint("audio list"))?;
    require_deleted(result.rows_affected, "audio list")
}

pub async fn save_audio_composition(
    connection: &DatabaseConnection,
    composition: &AudioComposition,
    create: bool,
) -> Result<(), AudioRepositoryError> {
    let transaction = connection.begin().await?;
    let active = audio_composition::ActiveModel {
        id: Set(composition.id.into_uuid()),
        name: Set(composition.name.clone()),
    };
    let mut existing_ids = HashSet::new();
    if create {
        active.insert(&transaction).await?;
    } else {
        require_exists(
            audio_composition::Entity::find_by_id(composition.id.into_uuid())
                .one(&transaction)
                .await?,
            "audio composition",
        )?;
        active.update(&transaction).await?;
        let existing = audio_composition_layer::Entity::find()
            .filter(
                audio_composition_layer::Column::AudioCompositionId.eq(composition.id.into_uuid()),
            )
            .all(&transaction)
            .await?;
        existing_ids.extend(existing.iter().map(|layer| layer.id));

        // Frees the unique (composition, position) range before positions are reordered.
        audio_composition_layer::Entity::update_many()
            .col_expr(
                audio_composition_layer::Column::Position,
                Expr::col(audio_composition_layer::Column::Position).add(1_000_000),
            )
            .filter(
                audio_composition_layer::Column::AudioCompositionId.eq(composition.id.into_uuid()),
            )
            .exec(&transaction)
            .await?;

        let retained_ids = composition
            .layers
            .iter()
            .map(|layer| layer.id.into_uuid())
            .collect::<HashSet<_>>();
        let removed_ids = existing_ids
            .difference(&retained_ids)
            .copied()
            .collect::<Vec<_>>();
        if !removed_ids.is_empty() {
            audio_composition_layer::Entity::delete_many()
                .filter(audio_composition_layer::Column::Id.is_in(removed_ids))
                .exec(&transaction)
                .await?;
        }
    }
    for layer in &composition.layers {
        let active = composition_layer_model(composition.id, layer)?;
        if existing_ids.contains(&layer.id.into_uuid()) {
            active.update(&transaction).await?;
        } else {
            active.insert(&transaction).await?;
        }
    }
    transaction.commit().await?;
    Ok(())
}

fn composition_layer_model(
    composition_id: AudioCompositionId,
    layer: &CompositionLayer,
) -> Result<audio_composition_layer::ActiveModel, AudioRepositoryError> {
    let (audio_object_id, audio_list_id) = match layer.source {
        LayerSource::AudioObject(id) => (Some(id.into_uuid()), None),
        LayerSource::AudioList(id) => (None, Some(id.into_uuid())),
    };
    let (execution_mode, min_interval_us, max_interval_us) = match layer.execution {
        LayerExecution::Continuous => (
            audio_composition_layer::ExecutionMode::Continuous,
            None,
            None,
        ),
        LayerExecution::RandomInterval {
            min_interval_us,
            max_interval_us,
        } => (
            audio_composition_layer::ExecutionMode::RandomInterval,
            Some(min_interval_us),
            Some(max_interval_us),
        ),
    };
    let disable_behavior = match layer.disable_behavior {
        DisableBehavior::Stop => audio_composition_layer::StoredDisableBehavior::Stop,
        DisableBehavior::Finish => audio_composition_layer::StoredDisableBehavior::Finish,
    };
    Ok(audio_composition_layer::ActiveModel {
        id: Set(layer.id.into_uuid()),
        audio_composition_id: Set(composition_id.into_uuid()),
        name: Set(layer.name.clone()),
        position: Set(i32::try_from(layer.position)
            .map_err(|_| AudioRepositoryError::InvalidStoredData("composition position"))?),
        audio_object_id: Set(audio_object_id),
        audio_list_id: Set(audio_list_id),
        execution_mode: Set(execution_mode),
        min_interval_us: Set(min_interval_us),
        max_interval_us: Set(max_interval_us),
        disable_behavior: Set(disable_behavior),
    })
}

pub async fn delete_audio_composition(
    connection: &DatabaseConnection,
    id: AudioCompositionId,
) -> Result<(), AudioRepositoryError> {
    let result = audio_composition::Entity::delete_by_id(id.into_uuid())
        .exec(connection)
        .await
        .map_err(map_constraint("audio composition"))?;
    require_deleted(result.rows_affected, "audio composition")
}

fn require_exists<T>(value: Option<T>, entity: &'static str) -> Result<T, AudioRepositoryError> {
    value.ok_or(AudioRepositoryError::NotFound(entity))
}

fn require_deleted(rows_affected: u64, entity: &'static str) -> Result<(), AudioRepositoryError> {
    if rows_affected == 0 {
        Err(AudioRepositoryError::NotFound(entity))
    } else {
        Ok(())
    }
}

fn map_constraint(entity: &'static str) -> impl FnOnce(DbErr) -> AudioRepositoryError + use<> {
    move |error| {
        if error.to_string().contains("FOREIGN KEY constraint failed") {
            AudioRepositoryError::InUse(entity)
        } else {
            AudioRepositoryError::Database(error)
        }
    }
}

pub async fn update_settings(
    connection: &DatabaseConnection,
    settings: AudioMixerSettings,
) -> Result<(), AudioRepositoryError> {
    let mut active: audio_mixer_settings::ActiveModel = audio_mixer_settings::Entity::find_by_id(1)
        .one(connection)
        .await?
        .ok_or(AudioRepositoryError::InvalidStoredData(
            "audio mixer settings",
        ))?
        .into();
    active.master_volume_db = Set(settings.master_volume_db);
    active.update(connection).await?;
    Ok(())
}

pub async fn scene_exists(
    connection: &DatabaseConnection,
    scene_id: Uuid,
) -> Result<bool, AudioRepositoryError> {
    Ok(scene::Entity::find_by_id(scene_id)
        .one(connection)
        .await?
        .is_some())
}

pub async fn scene_level_parent(
    connection: &DatabaseConnection,
    level_id: Uuid,
) -> Result<Option<Uuid>, AudioRepositoryError> {
    Ok(scene_level::Entity::find_by_id(level_id)
        .one(connection)
        .await?
        .map(|level| level.scene_id))
}

pub async fn load_scene_configuration(
    connection: &DatabaseConnection,
    scene_id: Uuid,
) -> Result<SceneAudioConfiguration, AudioRepositoryError> {
    if !scene_exists(connection, scene_id).await? {
        return Err(AudioRepositoryError::NotFound("scene"));
    }
    let (objects, lists, compositions) = tokio::try_join!(
        scene_audio_object::Entity::find()
            .filter(scene_audio_object::Column::SceneId.eq(scene_id))
            .order_by_asc(scene_audio_object::Column::AudioObjectId)
            .all(connection),
        scene_audio_list::Entity::find()
            .filter(scene_audio_list::Column::SceneId.eq(scene_id))
            .order_by_asc(scene_audio_list::Column::AudioListId)
            .all(connection),
        scene_audio_composition::Entity::find()
            .filter(scene_audio_composition::Column::SceneId.eq(scene_id))
            .order_by_asc(scene_audio_composition::Column::AudioCompositionId)
            .all(connection),
    )?;
    Ok(SceneAudioConfiguration {
        scene_id,
        audio_object_ids: objects
            .into_iter()
            .map(|model| model.audio_object_id.into())
            .collect(),
        audio_list_ids: lists
            .into_iter()
            .map(|model| model.audio_list_id.into())
            .collect(),
        audio_composition_ids: compositions
            .into_iter()
            .map(|model| model.audio_composition_id.into())
            .collect(),
    })
}

pub async fn load_scene_level_configuration(
    connection: &DatabaseConnection,
    level_id: Uuid,
) -> Result<SceneLevelAudioConfiguration, AudioRepositoryError> {
    if scene_level_parent(connection, level_id).await?.is_none() {
        return Err(AudioRepositoryError::NotFound("scene level"));
    }
    let disabled = scene_level_audio_disabled_layer::Entity::find()
        .filter(scene_level_audio_disabled_layer::Column::SceneLevelId.eq(level_id))
        .order_by_asc(scene_level_audio_disabled_layer::Column::CompositionLayerId)
        .all(connection)
        .await?;
    Ok(SceneLevelAudioConfiguration {
        scene_level_id: level_id,
        disabled_layer_ids: disabled
            .into_iter()
            .map(|model| model.composition_layer_id.into())
            .collect(),
    })
}

pub async fn replace_scene_configuration(
    connection: &DatabaseConnection,
    config: &SceneAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    let transaction = connection.begin().await?;
    replace_scene_objects(&transaction, config).await?;
    replace_scene_lists(&transaction, config).await?;
    replace_scene_compositions(&transaction, config).await?;
    remove_unavailable_disabled_layers(&transaction, config).await?;
    transaction.commit().await?;
    Ok(())
}

async fn replace_scene_objects(
    transaction: &DatabaseTransaction,
    config: &SceneAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    scene_audio_object::Entity::delete_many()
        .filter(scene_audio_object::Column::SceneId.eq(config.scene_id))
        .exec(transaction)
        .await?;
    for id in &config.audio_object_ids {
        scene_audio_object::ActiveModel {
            scene_id: Set(config.scene_id),
            audio_object_id: Set(id.into_uuid()),
        }
        .insert(transaction)
        .await?;
    }
    Ok(())
}

async fn replace_scene_lists(
    transaction: &DatabaseTransaction,
    config: &SceneAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    scene_audio_list::Entity::delete_many()
        .filter(scene_audio_list::Column::SceneId.eq(config.scene_id))
        .exec(transaction)
        .await?;
    for id in &config.audio_list_ids {
        scene_audio_list::ActiveModel {
            scene_id: Set(config.scene_id),
            audio_list_id: Set(id.into_uuid()),
        }
        .insert(transaction)
        .await?;
    }
    Ok(())
}

async fn replace_scene_compositions(
    transaction: &DatabaseTransaction,
    config: &SceneAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    scene_audio_composition::Entity::delete_many()
        .filter(scene_audio_composition::Column::SceneId.eq(config.scene_id))
        .exec(transaction)
        .await?;
    for id in &config.audio_composition_ids {
        scene_audio_composition::ActiveModel {
            scene_id: Set(config.scene_id),
            audio_composition_id: Set(id.into_uuid()),
        }
        .insert(transaction)
        .await?;
    }
    Ok(())
}

async fn remove_unavailable_disabled_layers(
    transaction: &DatabaseTransaction,
    config: &SceneAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    let level_ids = scene_level::Entity::find()
        .filter(scene_level::Column::SceneId.eq(config.scene_id))
        .all(transaction)
        .await?
        .into_iter()
        .map(|level| level.id)
        .collect::<Vec<_>>();
    if level_ids.is_empty() {
        return Ok(());
    }

    let allowed_layer_ids = if config.audio_composition_ids.is_empty() {
        Vec::new()
    } else {
        audio_composition_layer::Entity::find()
            .filter(
                audio_composition_layer::Column::AudioCompositionId
                    .is_in(config.audio_composition_ids.iter().map(|id| id.into_uuid())),
            )
            .all(transaction)
            .await?
            .into_iter()
            .map(|layer| layer.id)
            .collect::<Vec<_>>()
    };
    let mut delete = scene_level_audio_disabled_layer::Entity::delete_many()
        .filter(scene_level_audio_disabled_layer::Column::SceneLevelId.is_in(level_ids));
    if !allowed_layer_ids.is_empty() {
        delete = delete.filter(
            scene_level_audio_disabled_layer::Column::CompositionLayerId
                .is_not_in(allowed_layer_ids),
        );
    }
    delete.exec(transaction).await?;
    Ok(())
}

pub async fn replace_scene_level_configuration(
    connection: &DatabaseConnection,
    config: &SceneLevelAudioConfiguration,
) -> Result<(), AudioRepositoryError> {
    let transaction = connection.begin().await?;
    scene_level_audio_disabled_layer::Entity::delete_many()
        .filter(scene_level_audio_disabled_layer::Column::SceneLevelId.eq(config.scene_level_id))
        .exec(&transaction)
        .await?;
    for id in &config.disabled_layer_ids {
        scene_level_audio_disabled_layer::ActiveModel {
            scene_level_id: Set(config.scene_level_id),
            composition_layer_id: Set(id.into_uuid()),
        }
        .insert(&transaction)
        .await?;
    }
    transaction.commit().await?;
    Ok(())
}

pub async fn layer_belongs_to_scene(
    connection: &DatabaseConnection,
    scene_id: Uuid,
    layer_id: CompositionLayerId,
) -> Result<bool, AudioRepositoryError> {
    let Some(layer) = audio_composition_layer::Entity::find_by_id(layer_id.into_uuid())
        .one(connection)
        .await?
    else {
        return Ok(false);
    };
    Ok(scene_audio_composition::Entity::find()
        .filter(scene_audio_composition::Column::SceneId.eq(scene_id))
        .filter(scene_audio_composition::Column::AudioCompositionId.eq(layer.audio_composition_id))
        .one(connection)
        .await?
        .is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use migration::{Migrator, MigratorTrait};
    use sea_orm::Database;

    async fn database() -> DatabaseConnection {
        let connection = Database::connect("sqlite::memory:").await.unwrap();
        Migrator::up(&connection, None).await.unwrap();
        connection
    }

    fn object() -> AudioObject {
        AudioObject::new(
            AudioObjectDefinition {
                name: "Rain loop".into(),
                asset_path: "weather/rain.wav".into(),
                volume_db: -3.0,
                start_time_us: 0,
                end_time_us: 10_000,
                loop_region: Some(LoopRegion {
                    start_time_us: 1_000,
                    end_time_us: 9_000,
                }),
                fade_in_duration_us: 500,
                fade_out_duration_us: 500,
                loop_crossfade_duration_us: Some(250),
            },
            10_000,
        )
        .unwrap()
    }

    #[tokio::test]
    async fn audio_definitions_round_trip_through_typed_persistence() {
        let connection = database().await;
        let mut object = object();
        save_audio_object(&connection, &object, true).await.unwrap();
        let list = AudioList::new(
            "Weather",
            AudioListSelectionMode::WeightedRandom,
            vec![(object.id, 3)],
        )
        .unwrap();
        save_audio_list(&connection, &list, true).await.unwrap();
        let composition = AudioComposition::new(
            "Storm",
            vec![
                CompositionLayerDefinition {
                    id: None,
                    name: "Rain layer".into(),
                    source: LayerSource::AudioList(list.id),
                    execution: LayerExecution::RandomInterval {
                        min_interval_us: 100,
                        max_interval_us: 200,
                    },
                    disable_behavior: DisableBehavior::Finish,
                },
                CompositionLayerDefinition {
                    id: None,
                    name: "Rain bed".into(),
                    source: LayerSource::AudioObject(object.id),
                    execution: LayerExecution::Continuous,
                    disable_behavior: DisableBehavior::Stop,
                },
            ],
        )
        .unwrap();
        save_audio_composition(&connection, &composition, true)
            .await
            .unwrap();

        let loaded = load_library(&connection).await.unwrap();
        assert_eq!(loaded.objects, vec![object.clone()]);
        assert_eq!(loaded.lists, vec![list.clone()]);
        assert_eq!(loaded.compositions, vec![composition.clone()]);

        object.name = "Rain ambience".into();
        save_audio_object(&connection, &object, false)
            .await
            .unwrap();
        let edited_list = AudioList::from_parts(
            list.id,
            "Storm weather",
            AudioListSelectionMode::Sequential,
            vec![(object.id, 1)],
        )
        .unwrap();
        save_audio_list(&connection, &edited_list, false)
            .await
            .unwrap();
        let edited_composition = AudioComposition::from_parts(
            composition.id,
            "Heavy storm",
            composition
                .layers
                .iter()
                .rev()
                .map(|layer| CompositionLayerDefinition {
                    id: Some(layer.id),
                    name: "Primary rain".into(),
                    source: layer.source,
                    execution: LayerExecution::Continuous,
                    disable_behavior: DisableBehavior::Stop,
                })
                .collect(),
        )
        .unwrap();
        save_audio_composition(&connection, &edited_composition, false)
            .await
            .unwrap();

        let loaded = load_library(&connection).await.unwrap();
        assert_eq!(loaded.objects, vec![object]);
        assert_eq!(loaded.lists, vec![edited_list]);
        assert_eq!(loaded.compositions, vec![edited_composition]);

        delete_audio_composition(&connection, composition.id)
            .await
            .unwrap();
        delete_audio_list(&connection, list.id).await.unwrap();
        delete_audio_object(&connection, loaded.objects[0].id)
            .await
            .unwrap();
        let loaded = load_library(&connection).await.unwrap();
        assert!(loaded.objects.is_empty());
        assert!(loaded.lists.is_empty());
        assert!(loaded.compositions.is_empty());
    }

    #[tokio::test]
    async fn constraints_and_scene_cascades_are_preserved() {
        let connection = database().await;
        let object = object();
        save_audio_object(&connection, &object, true).await.unwrap();
        let list = AudioList::new(
            "Weather",
            AudioListSelectionMode::Sequential,
            vec![(object.id, 1)],
        )
        .unwrap();
        save_audio_list(&connection, &list, true).await.unwrap();
        let composition = AudioComposition::new(
            "Storm",
            vec![CompositionLayerDefinition {
                id: None,
                name: "Rain".into(),
                source: LayerSource::AudioObject(object.id),
                execution: LayerExecution::Continuous,
                disable_behavior: DisableBehavior::Stop,
            }],
        )
        .unwrap();
        save_audio_composition(&connection, &composition, true)
            .await
            .unwrap();

        assert!(matches!(
            delete_audio_object(&connection, object.id).await,
            Err(AudioRepositoryError::InUse("audio object"))
        ));
        let scene_id = Uuid::new_v4();
        let level_id = Uuid::new_v4();
        scene::ActiveModel {
            id: Set(scene_id),
            name: Set("Forest".into()),
        }
        .insert(&connection)
        .await
        .unwrap();
        scene_level::ActiveModel {
            id: Set(level_id),
            scene_id: Set(scene_id),
            name: Set("Ground".into()),
            position: Set(0),
        }
        .insert(&connection)
        .await
        .unwrap();

        replace_scene_configuration(
            &connection,
            &SceneAudioConfiguration {
                scene_id,
                audio_object_ids: vec![object.id],
                audio_list_ids: vec![list.id],
                audio_composition_ids: vec![composition.id],
            },
        )
        .await
        .unwrap();
        replace_scene_level_configuration(
            &connection,
            &SceneLevelAudioConfiguration {
                scene_level_id: level_id,
                disabled_layer_ids: vec![composition.layers[0].id],
            },
        )
        .await
        .unwrap();
        assert_eq!(
            load_scene_level_configuration(&connection, level_id)
                .await
                .unwrap()
                .disabled_layer_ids,
            vec![composition.layers[0].id]
        );

        replace_scene_configuration(
            &connection,
            &SceneAudioConfiguration {
                scene_id,
                audio_object_ids: vec![object.id],
                audio_list_ids: vec![list.id],
                audio_composition_ids: vec![],
            },
        )
        .await
        .unwrap();
        assert!(load_scene_level_configuration(&connection, level_id)
            .await
            .unwrap()
            .disabled_layer_ids
            .is_empty());

        let failed = replace_scene_configuration(
            &connection,
            &SceneAudioConfiguration {
                scene_id,
                audio_object_ids: vec![],
                audio_list_ids: vec![AudioListId::new()],
                audio_composition_ids: vec![],
            },
        )
        .await;
        assert!(matches!(failed, Err(AudioRepositoryError::Database(_))));
        let preserved = load_scene_configuration(&connection, scene_id)
            .await
            .unwrap();
        assert_eq!(preserved.audio_object_ids, vec![object.id]);
        assert_eq!(preserved.audio_list_ids, vec![list.id]);

        scene::Entity::delete_by_id(scene_id)
            .exec(&connection)
            .await
            .unwrap();
        assert!(!scene_exists(&connection, scene_id).await.unwrap());
        assert!(scene_audio_object::Entity::find()
            .all(&connection)
            .await
            .unwrap()
            .is_empty());
    }
}
